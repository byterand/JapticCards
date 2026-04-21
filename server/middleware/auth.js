import jwt from 'jsonwebtoken';
import RevokedToken from '../models/RevokedToken.js';

// Use as middleware to enforce authentication via req.user
export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const revoked = await RevokedToken.findOne({ token });
    if (revoked) {
      return res.status(401).json({ message: 'Session is no longer valid' });
    }
    req.user = decoded;
    req.token = token;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  };
}
