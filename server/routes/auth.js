import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerRules, loginRules } from '../validators/authValidators.js';
import * as authService from '../services/authService.js';

const router = Router();

router.post('/register', registerRules, validate, async (req, res) => {
  const { username, password, role } = req.body;
  const { userId } = await authService.registerUser({ username, password, role });
  return res.status(201).json({ message: 'User registered', userId });
});

router.post('/login', loginRules, validate, async (req, res) => {
  const result = await authService.loginUser({
    username: req.body.username,
    password: req.body.password
  });
  return res.json(result);
});

router.post('/logout', verifyToken, async (req, res) => {
  await authService.revokeToken(req.token);
  return res.json({ message: 'Logged out' });
});

router.get('/me', verifyToken, async (req, res) => {
  const user = await authService.getCurrentUser(req.user.userId);
  return res.json({ user });
});

export default router;