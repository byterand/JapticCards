import { body } from 'express-validator';

export const cardRules = [
  body('front').trim().notEmpty().isLength({ max: 500 })
    .withMessage('Front must be 1-500 characters'),
  body('back').trim().notEmpty().isLength({ max: 2000 })
    .withMessage('Back must be 1-2000 characters'),
  body('frontImage').optional().isString().isLength({ max: 2048 }),
  body('backImage').optional().isString().isLength({ max: 2048 })
];

export const cardUpdateRules = [
  body('front').optional().trim().notEmpty().isLength({ max: 500 })
    .withMessage('Front must be 1-500 characters'),
  body('back').optional().trim().notEmpty().isLength({ max: 2000 })
    .withMessage('Back must be 1-2000 characters'),
  body('frontImage').optional().isString().isLength({ max: 2048 }),
  body('backImage').optional().isString().isLength({ max: 2048 })
];