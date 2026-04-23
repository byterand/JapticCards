import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import RevokedToken from '../models/RevokedToken.js';
import RefreshToken from '../models/RefreshToken.js';
import { HttpError } from '../utils/HttpError.js';
import { config } from '../config/env.js';
import { invalidateJti } from '../utils/revocationCache.js';

const SALT_ROUNDS = 10;

const verifyOptions = () => ({
  algorithms: [config.jwt.algorithm],
  issuer: config.jwt.issuer,
  audience: config.jwt.audience,
  clockTolerance: config.jwt.clockToleranceSeconds
});

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { userId: user._id, role: user.role },
    config.jwtSecret,
    {
      algorithm: config.jwt.algorithm,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      expiresIn: config.jwt.accessTtlSeconds,
      jwtid: jti
    }
  );
  return { token, jti };
}

async function issueRefreshToken(user, family) {
  const jti = crypto.randomUUID();
  const fam = family || crypto.randomUUID();
  const token = jwt.sign(
    { userId: user._id, family: fam, typ: 'refresh' },
    config.jwtSecret,
    {
      algorithm: config.jwt.algorithm,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      expiresIn: config.jwt.refreshTtlSeconds,
      jwtid: jti
    }
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

export async function registerUser({ username, password, role }) {
  const existing = await User.findOne({ username });
  if (existing) throw new HttpError(409, 'Username is taken');
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ username, password: hashed, role });
  return { userId: user._id };
}

export async function loginUser({ username, password }) {
  const user = await User.findOne({ username });
  if (!user) throw new HttpError(401, 'Invalid credentials');
  const correctPassword = await bcrypt.compare(password, user.password);
  if (!correctPassword) throw new HttpError(401, 'Invalid credentials');

  const { token: accessToken } = signAccessToken(user);
  const { token: refreshToken } = await issueRefreshToken(user);

  return {
    token: accessToken,
    refreshToken,
    user: { id: user._id, username: user.username, role: user.role }
  };
}

export async function rotateRefreshToken(oldRefreshToken) {
  if (!oldRefreshToken) throw new HttpError(401, 'No refresh token');

  let payload;
  try {
    payload = jwt.verify(oldRefreshToken, config.jwtSecret, verifyOptions());
  } catch {
    throw new HttpError(401, 'Invalid refresh token');
  }
  if (payload.typ !== 'refresh') throw new HttpError(401, 'Wrong token type');

  let stored = await RefreshToken.findOne({ jti: payload.jti });
  if (!stored || stored.tokenHash !== hashToken(oldRefreshToken)) {
    // Unknown jti OR hash mismatch
    throw new HttpError(401, 'Invalid refresh token');
  }

  if (stored.revokedAt) {
    const graceMs = config.jwt.refreshGraceSeconds * 1000;
    const withinGrace = Date.now() - stored.revokedAt.getTime() <= graceMs;
    if (!withinGrace) {
      await RefreshToken.updateMany(
        { family: stored.family, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
      throw new HttpError(401, 'Refresh token reuse detected');
    }
    const active = await RefreshToken.findOne({ family: stored.family, revokedAt: null });
    if (!active) throw new HttpError(401, 'Session closed');
    stored = active;
  }

  const user = await User.findById(stored.userId);
  if (!user) throw new HttpError(401, 'User no longer exists');

  const { token: newRefresh, jti: newJti } = await issueRefreshToken(user, stored.family);
  stored.revokedAt = new Date();
  stored.replacedByJti = newJti;
  await stored.save();

  const { token: newAccess } = signAccessToken(user);
  return {
    token: newAccess,
    refreshToken: newRefresh,
    user: { id: user._id, username: user.username, role: user.role }
  };
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
      const payload = jwt.verify(refreshToken, config.jwtSecret, verifyOptions());
      if (payload.family) {
        await RefreshToken.updateMany(
          { family: payload.family, revokedAt: null },
          { $set: { revokedAt: new Date() } }
        );
      }
    } catch {
      // Invalid refresh token on logout is a no-op.
    }
  }
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId).select('_id username role');
  if (!user) throw new HttpError(404, 'User not found');
  return { id: user._id, username: user.username, role: user.role };
}
