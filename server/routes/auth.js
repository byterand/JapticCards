import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const saltRounds = 10;
const router = Router();

const registerRules = [
  body('username').trim().notEmpty().toLowerCase().isLength({ min: 3, max: 20 }).matches(/^[a-z0-9_]+$/),
  body('password').isLength({ min: 8, max: 25 })
    .not().matches(/\s/).withMessage('Password must not contain spaces')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[^a-zA-Z0-9]/).withMessage('Password must contain at least one special character'),
  body('role').optional().isIn(['student', 'teacher'])
];

// POST /register
router.post('/register', registerRules, async (req, res) => {
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

// POST /login
router.post('/login', loginRules, async (req, res) => {
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

    return res.json({token});
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;