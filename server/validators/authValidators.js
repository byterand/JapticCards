import { body } from 'express-validator';
import { AUTH_LIMITS } from '../utils/limits.js';

export const registerRules = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .toLowerCase()
    .isLength({ min: AUTH_LIMITS.USERNAME_MIN, max: AUTH_LIMITS.USERNAME_MAX })
    .withMessage(`Username must be ${AUTH_LIMITS.USERNAME_MIN}-${AUTH_LIMITS.USERNAME_MAX} characters`)
    .matches(/^[a-z0-9_]+$/).withMessage('Username can only use lowercase letters, numbers, and underscores'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: AUTH_LIMITS.PASSWORD_MIN, max: AUTH_LIMITS.PASSWORD_MAX })
    .withMessage(`Password must be ${AUTH_LIMITS.PASSWORD_MIN}-${AUTH_LIMITS.PASSWORD_MAX} characters`)
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
