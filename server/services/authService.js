import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import RevokedToken from '../models/RevokedToken.js';
import { HttpError } from '../utils/HttpError.js';

const SALT_ROUNDS = 10;
const TOKEN_TTL = '7d';
const FALLBACK_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export async function registerUser({ username, password, role }) {
  const existing = await User.findOne({ username });
  if (existing) {
    throw new HttpError(409, 'Username is taken');
  }
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ username, password: hashed, role });
  return { userId: user._id };
}

export async function loginUser({ username, password }) {
  const user = await User.findOne({ username });
  if (!user) {
    throw new HttpError(401, 'Invalid credentials');
  }
  const correctPassword = await bcrypt.compare(password, user.password);
  if (!correctPassword) {
    throw new HttpError(401, 'Invalid credentials');
  }
  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
  return {
    token,
    user: {
      id: user._id,
      username: user.username,
      role: user.role
    }
  };
}

export async function revokeToken(token) {
  const decoded = jwt.decode(token);
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + FALLBACK_EXPIRY_MS);
  await RevokedToken.create({ token, expiresAt });
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId).select('_id username role');
  if (!user) {
    throw new HttpError(404, 'User not found');
  }
  return { id: user._id, username: user.username, role: user.role };
}
