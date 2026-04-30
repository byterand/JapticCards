import { body } from 'express-validator';
import { EXPORT_FORMAT_VALUES } from '../utils/constants.js';

const TITLE_MAX = 35;
const DESCRIPTION_MAX = 100;
const CATEGORY_MAX = 25;
const TAG_MAX = 15;
const TAGS_MAX_COUNT = 4;

const tagRules = [
  body('tags').optional()
    .isArray({ max: TAGS_MAX_COUNT }).withMessage(`At most ${TAGS_MAX_COUNT} tags allowed`),
  body('tags.*').optional().isString().trim()
    .notEmpty().withMessage('Each tag must be a non-empty string')
    .isLength({ max: TAG_MAX }).withMessage(`Each tag must be 1-${TAG_MAX} characters`)
];

export const deckRules = [
  body('title').trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: TITLE_MAX }).withMessage(`Title must be at most ${TITLE_MAX} characters`),
  body('description').optional().isString()
    .isLength({ max: DESCRIPTION_MAX }).withMessage(`Description must be at most ${DESCRIPTION_MAX} characters`),
  body('category').optional().isString()
    .isLength({ max: CATEGORY_MAX }).withMessage(`Category must be at most ${CATEGORY_MAX} characters`),
  ...tagRules
];

export const deckUpdateRules = [
  body('title').optional().trim().notEmpty()
    .isLength({ max: TITLE_MAX }).withMessage(`Title must be at most ${TITLE_MAX} characters`),
  body('description').optional().isString()
    .isLength({ max: DESCRIPTION_MAX }).withMessage(`Description must be at most ${DESCRIPTION_MAX} characters`),
  body('category').optional().isString()
    .isLength({ max: CATEGORY_MAX }).withMessage(`Category must be at most ${CATEGORY_MAX} characters`),
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
