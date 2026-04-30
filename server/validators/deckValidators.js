import { body } from 'express-validator';
import { EXPORT_FORMAT_VALUES } from '../utils/constants.js';
import { DECK_LIMITS } from '../utils/limits.js';

const tagRules = [
  body('tags').optional()
    .isArray({ max: DECK_LIMITS.TAGS_MAX_COUNT }).withMessage(`At most ${DECK_LIMITS.TAGS_MAX_COUNT} tags allowed`),
  body('tags.*').optional().isString().trim()
    .notEmpty().withMessage('Each tag must be a non-empty string')
    .isLength({ max: DECK_LIMITS.TAG_MAX }).withMessage(`Each tag must be 1-${DECK_LIMITS.TAG_MAX} characters`)
];

export const deckRules = [
  body('title').trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: DECK_LIMITS.TITLE_MAX }).withMessage(`Title must be at most ${DECK_LIMITS.TITLE_MAX} characters`),
  body('description').optional().isString()
    .isLength({ max: DECK_LIMITS.DESCRIPTION_MAX }).withMessage(`Description must be at most ${DECK_LIMITS.DESCRIPTION_MAX} characters`),
  body('category').optional().isString()
    .isLength({ max: DECK_LIMITS.CATEGORY_MAX }).withMessage(`Category must be at most ${DECK_LIMITS.CATEGORY_MAX} characters`),
  ...tagRules
];

export const deckUpdateRules = [
  body('title').optional().trim().notEmpty()
    .isLength({ max: DECK_LIMITS.TITLE_MAX }).withMessage(`Title must be at most ${DECK_LIMITS.TITLE_MAX} characters`),
  body('description').optional().isString()
    .isLength({ max: DECK_LIMITS.DESCRIPTION_MAX }).withMessage(`Description must be at most ${DECK_LIMITS.DESCRIPTION_MAX} characters`),
  body('category').optional().isString()
    .isLength({ max: DECK_LIMITS.CATEGORY_MAX }).withMessage(`Category must be at most ${DECK_LIMITS.CATEGORY_MAX} characters`),
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
