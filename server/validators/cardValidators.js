import { body } from 'express-validator';

export const cardRules = [
  body('front').trim().notEmpty(),
  body('back').trim().notEmpty(),
  body('frontImage').optional().isString(),
  body('backImage').optional().isString()
];

export const cardUpdateRules = cardRules.map((rule) => rule.optional());