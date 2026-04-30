import { body } from 'express-validator';
import {
  STUDY_MODE_VALUES,
  CARD_SIDE_VALUES,
  CARD_STATUS_VALUES
} from '../utils/constants.js';

const ANSWER_MAX = 144;

export const startSessionRules = [
  body('deckId').notEmpty(),
  body('mode').optional().isIn(STUDY_MODE_VALUES),
  body('sideFirst').optional().isIn(CARD_SIDE_VALUES),
  body('needsReviewOnly').optional().isBoolean()
];

export const shuffleRules = [
  body('enabled').isBoolean()
];

export const answerRules = [
  body('cardId').notEmpty(),
  body('answer').optional().isString().trim()
    .isLength({ max: ANSWER_MAX }).withMessage(`answer must be at most ${ANSWER_MAX} characters`),
  body('selectedOption').optional().isString().trim()
    .isLength({ max: ANSWER_MAX }).withMessage(`selectedOption must be at most ${ANSWER_MAX} characters`),
  body('isTrue').optional().isBoolean().withMessage('isTrue must be a boolean').toBoolean()
];

export const cardStatusRules = [
  body('status').isIn(CARD_STATUS_VALUES)
];
