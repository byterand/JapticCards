import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../middleware/auth.js';
import RevokedToken from '../models/RevokedToken.js';

const saltRounds = 10;
const router = Router();

const registerRules = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .toLowerCase()
    .isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters')
    .matches(/^[a-z0-9_]+$/).withMessage('Username can only use lowercase letters, numbers, and underscores'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 25 }).withMessage('Password must be 8-25 characters')
    .not().matches(/\s/).withMessage('Password must not contain spaces')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[^a-zA-Z0-9]/).withMessage('Password must contain at least one special character'),
  body('role')
    .optional()
    .isIn(['student', 'teacher']).withMessage('Role must be student or teacher')
];

// POST /auth/register
router.post('/auth/register', registerRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, role } = req.body;

  try {
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(409).json({message: 'Username is taken'});
    }

    const hashed = await bcrypt.hash(password, saltRounds);
    const user = await User.create({username, password: hashed, role});

    return res.status(201).json({ message: 'User registered', userId: user._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const loginRules = [
  body('username').trim().notEmpty().toLowerCase(),
  body('password').notEmpty()
];

// POST /auth/login
router.post('/auth/login', loginRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({message: 'Invalid credentials'});
    }

    const correctPassword = await bcrypt.compare(password, user.password);
    if (!correctPassword) {
      return res.status(401).json({message: 'Invalid credentials'});
    }

    const token = jwt.sign(
      {userId: user._id, role: user.role},
      process.env.JWT_SECRET,
      {expiresIn: '7d'}
    );

    return res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post('/auth/logout', verifyToken, async (req, res) => {
  try {
    const decoded = jwt.decode(req.token);
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RevokedToken.create({ token: req.token, expiresAt });
    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/auth/me', verifyToken, async (req, res) => {
  const user = await User.findById(req.user.userId).select('_id username role');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  return res.json({ user: { id: user._id, username: user.username, role: user.role } });
});

export default router;
