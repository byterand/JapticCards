import jwt from 'jsonwebtoken';
import RevokedToken from '../models/RevokedToken.js';
import { config } from '../config/env.js';
import { isJtiKnownGood, markJtiGood } from '../utils/revocationCache.js';
import { jwtVerifyOptions } from '../utils/jwtOptions.js';
import { REFRESH_TOKEN_TYPE } from '../utils/constants.js';

const BEARER_PREFIX = 'Bearer ';

function extractBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith(BEARER_PREFIX)) return null;
  return authHeader.slice(BEARER_PREFIX.length);
}

function attachUser(req, decoded, token) {
  req.user = decoded;
  req.token = token;
  req.tokenJti = decoded.jti;
  req.tokenExp = decoded.exp;
}

async function isRevoked(jti) {
  if (!jti) return false;
  if (isJtiKnownGood(jti)) return false;
  const revoked = await RevokedToken.findOne({ jti });
  if (revoked) return true;
  markJtiGood(jti);
  return false;
}

// Strict: 401 if no token, invalid, or revoked.
export async function verifyToken(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret, jwtVerifyOptions());
    if (decoded.typ === REFRESH_TOKEN_TYPE) {
      return res.status(401).json({ message: 'Invalid token type' });
    }
    if (await isRevoked(decoded.jti)) {
      return res.status(401).json({ message: 'Session is no longer valid' });
    }
    attachUser(req, decoded, token);
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export async function optionalVerifyToken(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, config.jwtSecret, jwtVerifyOptions());
    if (decoded.typ !== REFRESH_TOKEN_TYPE) {
      attachUser(req, decoded, token);
    }
  } catch {
    // Invalid/expired token is acceptable here — just proceed unauthenticated.
  }
  return next();
}
