import { body } from 'express-validator';

export const deckRules = [
  body('title').trim().notEmpty(),
  body('description').optional().isString(),
  body('category').optional().isString(),
  body('tags').optional().isArray()
];

export const deckUpdateRules = deckRules.map((rule) => rule.optional());