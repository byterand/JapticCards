import { body } from 'express-validator';

export const assignmentRules = [
  body('deckId').notEmpty(),
  body('studentIds').isArray({ min: 1 })
];