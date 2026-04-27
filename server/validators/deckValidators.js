import { body } from 'express-validator';

export const deckRules = [
  body('title').trim().notEmpty(),
  body('description').optional().isString(),
  body('category').optional().isString(),
  body('tags').optional().isArray(),
  body('tags.*').optional().isString().trim().notEmpty()
    .withMessage('Each tag must be a non-empty string')
];

export const deckUpdateRules = [
  body('title').optional().trim().notEmpty(),
  body('description').optional().isString(),
  body('category').optional().isString(),
  body('tags').optional().isArray(),
  body('tags.*').optional().isString().trim().notEmpty()
    .withMessage('Each tag must be a non-empty string')
];

export const importRules = [
  body('format')
    .trim()
    .notEmpty()
    .isIn(['json', 'csv'])
    .withMessage('format must be json or csv'),
  body('content')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('content must be a non-empty string')
];