import { body } from 'express-validator';

export const registerRules = [
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
    .matches(/[^a-zA-Z0-9]/).withMessage('Password must contain at least one special character')
];

export const loginRules = [
  body('username').trim().notEmpty().toLowerCase(),
  body('password').notEmpty()
];