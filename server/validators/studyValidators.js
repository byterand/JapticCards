import { body, param } from 'express-validator';
import {
  STUDY_MODE_VALUES,
  CARD_SIDE_VALUES,
  CARD_STATUS_VALUES
} from '../utils/constants.js';
import { STUDY_LIMITS } from '../utils/limits.js';

export const startSessionRules = [
  body('deckId').notEmpty().isMongoId().withMessage('Deck ID must be a valid ID'),
  body('mode').optional().isIn(STUDY_MODE_VALUES),
  body('sideFirst').optional().isIn(CARD_SIDE_VALUES),
  body('needsReviewOnly').optional()
    .isBoolean().withMessage('needsReviewOnly must be a boolean').toBoolean()
];

export const shuffleRules = [
  body('enabled').isBoolean().withMessage('enabled must be a boolean').toBoolean()
];

export const answerRules = [
  body('cardId').notEmpty().isMongoId().withMessage('Card ID must be a valid ID'),
  body('answer').optional().isString().trim()
    .isLength({ max: STUDY_LIMITS.ANSWER_MAX }).withMessage(`Answer must be at most ${STUDY_LIMITS.ANSWER_MAX} characters`),
  body('selectedOption').optional().isString().trim()
    .isLength({ max: STUDY_LIMITS.ANSWER_MAX }).withMessage(`Selected option must be at most ${STUDY_LIMITS.ANSWER_MAX} characters`),
  body('isTrue').optional().isBoolean().withMessage('isTrue must be a boolean').toBoolean()
];

export const cardStatusRules = [
  param('cardId').isMongoId().withMessage('Card ID must be a valid ID'),
  body('status').isIn(CARD_STATUS_VALUES)
];
