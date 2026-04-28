import { Router } from 'express';
import { verifyToken, optionalVerifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerRules, loginRules } from '../validators/authValidators.js';
import * as authService from '../services/authService.js';
import { config } from '../config/env.js';
import { REFRESH_COOKIE_NAME } from '../utils/constants.js';

const router = Router();

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/auth',
    maxAge: config.jwt.refreshTtlSeconds * 1000
  };
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { ...refreshCookieOptions(), maxAge: 0 });
}

function readRefreshToken(req) {
  return req.cookies?.[REFRESH_COOKIE_NAME];
}

router.post('/register', registerRules, validate, async (req, res) => {
  const { username, password, role } = req.body;
  const { userId } = await authService.registerUser({ username, password, role });
  return res.status(201).json({ message: 'User registered', userId });
});

router.post('/login', loginRules, validate, async (req, res) => {
  const { token, refreshToken, user } = await authService.loginUser({
    username: req.body.username,
    password: req.body.password
  });
  setRefreshCookie(res, refreshToken);
  return res.json({ token, user });
});

router.post('/refresh', async (req, res) => {
  const { token, refreshToken, user } = await authService.rotateRefreshToken(readRefreshToken(req));
  setRefreshCookie(res, refreshToken);
  return res.json({ token, user });
});

// Logout is auth-optional
router.post('/logout', optionalVerifyToken, async (req, res) => {
  await authService.revokeSession({
    accessJti: req.tokenJti,
    accessExp: req.tokenExp,
    refreshToken: readRefreshToken(req)
  });
  clearRefreshCookie(res);
  return res.json({ message: 'Logged out' });
});

router.get('/me', verifyToken, async (req, res) => {
  const user = await authService.getCurrentUser(req.user.userId);
  return res.json({ user });
});

export default router;
