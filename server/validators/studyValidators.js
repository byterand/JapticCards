import { body } from 'express-validator';

export const startSessionRules = [
  body('deckId').notEmpty(),
  body('mode').optional().isIn(['multiple_choice', 'true_false', 'written_answer', 'flip']),
  body('sideFirst').optional().isIn(['front', 'back']),
  body('needsReviewOnly').optional().isBoolean()
];

export const shuffleRules = [
  body('enabled').isBoolean()
];

export const answerRules = [
  body('cardId').notEmpty(),
  body('answer').optional(),
  body('selectedOption').optional(),
  body('isTrue').optional()
];

export const cardStatusRules = [
  body('status').isIn(['known', 'still_learning', 'needs_review'])
];