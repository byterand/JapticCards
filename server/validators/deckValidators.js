import { body } from 'express-validator';
import { EXPORT_FORMAT_VALUES } from '../utils/constants.js';

const tagRules = [
  body('tags').optional().isArray(),
  body('tags.*').optional().isString().trim().notEmpty()
    .withMessage('Each tag must be a non-empty string')
];

export const deckRules = [
  body('title').trim().notEmpty(),
  body('description').optional().isString(),
  body('category').optional().isString(),
  ...tagRules
];

export const deckUpdateRules = [
  body('title').optional().trim().notEmpty(),
  body('description').optional().isString(),
  body('category').optional().isString(),
  ...tagRules
];

export const importRules = [
  body('format')
    .trim()
    .notEmpty()
    .isIn(EXPORT_FORMAT_VALUES)
    .withMessage('format must be json or csv'),
  body('content')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('content must be a non-empty string')
];