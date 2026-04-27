import { body } from 'express-validator';

const FRONT_MAX = 500;
const BACK_MAX = 2000;
const IMAGE_URL_MAX = 2048;

const imageRules = [
  body('frontImage').optional().isString().isLength({ max: IMAGE_URL_MAX }),
  body('backImage').optional().isString().isLength({ max: IMAGE_URL_MAX })
];

export const cardRules = [
  body('front').trim().notEmpty().isLength({ max: FRONT_MAX })
    .withMessage(`Front must be 1-${FRONT_MAX} characters`),
  body('back').trim().notEmpty().isLength({ max: BACK_MAX })
    .withMessage(`Back must be 1-${BACK_MAX} characters`),
  ...imageRules
];

export const cardUpdateRules = [
  body('front').optional().trim().notEmpty().isLength({ max: FRONT_MAX })
    .withMessage(`Front must be 1-${FRONT_MAX} characters`),
  body('back').optional().trim().notEmpty().isLength({ max: BACK_MAX })
    .withMessage(`Back must be 1-${BACK_MAX} characters`),
  ...imageRules
];
