import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import RevokedToken from '../models/RevokedToken.js';
import RefreshToken from '../models/RefreshToken.js';
import { HttpError } from '../utils/HttpError.js';
import { config } from '../config/env.js';
import { invalidateJti } from '../utils/revocationCache.js';
import { jwtVerifyOptions, jwtSignOptions } from '../utils/jwtOptions.js';
import { REFRESH_TOKEN_TYPE } from '../utils/constants.js';

const SALT_ROUNDS = 10;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function publicUser(user) {
  return { id: user._id, username: user.username };
}

function signAccessToken(user) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { userId: user._id },
    config.jwtSecret,
    jwtSignOptions({ expiresIn: config.jwt.accessTtlSeconds, jwtid: jti })
  );
  return { token, jti };
}

async function issueRefreshToken(user, family) {
  const jti = crypto.randomUUID();
  const fam = family || crypto.randomUUID();
  const token = jwt.sign(
    { userId: user._id, family: fam, typ: REFRESH_TOKEN_TYPE },
    config.jwtSecret,
    jwtSignOptions({ expiresIn: config.jwt.refreshTtlSeconds, jwtid: jti })
  );

  const expiresAt = new Date(Date.now() + config.jwt.refreshTtlSeconds * 1000);
  await RefreshToken.create({
    jti,
    tokenHash: hashToken(token),
    userId: user._id,
    family: fam,
    expiresAt
  });

  return { token, jti, family: fam };
}

function verifyRefreshToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, jwtVerifyOptions());
  } catch {
    throw new HttpError(401, 'Invalid refresh token');
  }

  if (payload.typ !== REFRESH_TOKEN_TYPE)
    throw new HttpError(401, 'Wrong token type');

  return payload;
}

async function revokeFamily(family) {
  await RefreshToken.updateMany(
    { family, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

export async function registerUser({ username, password }) {
  const existing = await User.findOne({ username });
  if (existing)
    throw new HttpError(409, 'Username is taken');

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ username, password: hashed });
  return { userId: user._id };
}

export async function loginUser({ username, password }) {
  const user = await User.findOne({ username });
  if (!user)
    throw new HttpError(401, 'Invalid credentials');

  const correctPassword = await bcrypt.compare(password, user.password);
  if (!correctPassword)
    throw new HttpError(401, 'Invalid credentials');

  const { token: accessToken } = signAccessToken(user);
  const { token: refreshToken } = await issueRefreshToken(user);

  return { token: accessToken, refreshToken, user: publicUser(user) };
}

export async function rotateRefreshToken(oldRefreshToken) {
  if (!oldRefreshToken)
    throw new HttpError(401, 'No refresh token');

  const payload = verifyRefreshToken(oldRefreshToken);
  const stored = await RefreshToken.findOne({ jti: payload.jti });
  if (!stored || stored.tokenHash !== hashToken(oldRefreshToken))
    throw new HttpError(401, 'Invalid refresh token');

  if (stored.revokedAt) {
    await revokeFamily(stored.family);
    throw new HttpError(401, 'Refresh token reuse detected');
  }

  const claimed = await RefreshToken.findOneAndUpdate(
    { _id: stored._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
    { returnDocument: 'after' }
  );

  if (!claimed)
    throw new HttpError(401, 'Refresh token already rotated');

  const user = await User.findById(claimed.userId);
  if (!user)
    throw new HttpError(401, 'User no longer exists');

  const { token: newRefresh, jti: newJti } = await issueRefreshToken(user, stored.family);
  claimed.replacedByJti = newJti;
  await claimed.save();

  const { token: newAccess } = signAccessToken(user);
  return { token: newAccess, refreshToken: newRefresh, user: publicUser(user) };
}

export async function revokeSession({ accessJti, accessExp, refreshToken }) {
  if (accessJti && accessExp) {
    const expiresAt = new Date(accessExp * 1000);
    await RevokedToken.updateOne(
      { jti: accessJti },
      { $setOnInsert: { jti: accessJti, expiresAt } },
      { upsert: true }
    );
    invalidateJti(accessJti);
  }

  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, config.jwtSecret, jwtVerifyOptions());
      if (payload.family) {
        await revokeFamily(payload.family);
      }
    } catch {
      // Invalid refresh token on logout is a no-op.
    }
  }
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId).select('_id username');
  if (!user) throw new HttpError(404, 'User not found');
  return publicUser(user);
}
