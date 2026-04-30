import { body } from 'express-validator';
import { CARD_LIMITS } from '../utils/limits.js';

function imageConditionalLength(textField, imageField, label) {
  return body(textField).custom((value, { req }) => {
    if (value === undefined)
      return true;

    if (typeof value !== 'string')
      throw new Error(`${label} must be a string`);

    const hasImage = typeof req.body[imageField] === 'string' && req.body[imageField].trim() !== '';
    const max = hasImage ? CARD_LIMITS.TEXT_MAX_WITH_IMAGE : CARD_LIMITS.TEXT_MAX;

    if (value.length > max)
      throw new Error(`${label} must be at most ${max} characters` + (hasImage ? ' when an image is included' : ''));

    return true;
  });
}

const imageRules = [
  body('frontImage').optional().isString().isLength({ max: CARD_LIMITS.IMAGE_URL_MAX }),
  body('backImage').optional().isString().isLength({ max: CARD_LIMITS.IMAGE_URL_MAX })
];

export const cardRules = [
  body('front').trim().notEmpty().withMessage('Front text cannot be empty'),
  body('back').trim().notEmpty().withMessage('Back text cannot be empty'),
  imageConditionalLength('front', 'frontImage', 'Front text'),
  imageConditionalLength('back', 'backImage', 'Back text'),
  ...imageRules
];

export const cardUpdateRules = [
  body('front').optional().trim().notEmpty().withMessage('Front text cannot be empty'),
  body('back').optional().trim().notEmpty().withMessage('Back text cannot be empty'),
  imageConditionalLength('front', 'frontImage', 'Front text'),
  imageConditionalLength('back', 'backImage', 'Back text'),
  ...imageRules
];
