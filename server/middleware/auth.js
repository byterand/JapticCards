import jwt from 'jsonwebtoken';
import RevokedToken from '../models/RevokedToken.js';
import { config } from '../config/env.js';
import { isJtiKnownGood, markJtiGood } from '../utils/revocationCache.js';

const verifyOptions = () => ({
  algorithms: [config.jwt.algorithm],
  issuer: config.jwt.issuer,
  audience: config.jwt.audience,
  clockTolerance: config.jwt.clockToleranceSeconds
});

// Strict: 401 if no token, invalid, or revoked.
export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret, verifyOptions());
    if (decoded.typ === 'refresh') {
      return res.status(401).json({ message: 'Invalid token type' });
    }
    if (decoded.jti) {
      if (!isJtiKnownGood(decoded.jti)) {
        const revoked = await RevokedToken.findOne({ jti: decoded.jti });
        if (revoked) {
          return res.status(401).json({ message: 'Session is no longer valid' });
        }
        markJtiGood(decoded.jti);
      }
    }
    req.user = decoded;
    req.token = token;
    req.tokenJti = decoded.jti;
    req.tokenExp = decoded.exp;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export async function optionalVerifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret, verifyOptions());
    if (decoded.typ !== 'refresh') {
      req.user = decoded;
      req.token = token;
      req.tokenJti = decoded.jti;
      req.tokenExp = decoded.exp;
    }
  } catch {
    // Invalid/expired token is acceptable here — just proceed unauthenticated.
  }
  return next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  };
}
