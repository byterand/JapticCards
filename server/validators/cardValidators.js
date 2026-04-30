import { body } from 'express-validator';

const TEXT_MAX = 144;
const TEXT_MAX_WITH_IMAGE = 72;
const IMAGE_URL_MAX = 2048;

function imageConditionalLength(textField, imageField) {
  return body(textField).custom((value, { req }) => {
    if (value === undefined)
      return true;

    if (typeof value !== 'string')
      throw new Error(`${textField} must be a string`);

    const hasImage = typeof req.body[imageField] === 'string' && req.body[imageField].trim() !== '';
    const max = hasImage ? TEXT_MAX_WITH_IMAGE : TEXT_MAX;

    if (value.length > max)
      throw new Error(`${textField} must be at most ${max} characters` + (hasImage ? ' when an image is included' : ''));

    return true;
  });
}

const imageRules = [
  body('frontImage').optional().isString().isLength({ max: IMAGE_URL_MAX }),
  body('backImage').optional().isString().isLength({ max: IMAGE_URL_MAX })
];

export const cardRules = [
  body('front').trim().notEmpty().withMessage('Front text cannot be empty'),
  body('back').trim().notEmpty().withMessage('Back text cannot be empty'),
  imageConditionalLength('Front text', 'frontImage'),
  imageConditionalLength('Back text', 'backImage'),
  ...imageRules
];

export const cardUpdateRules = [
  body('front').optional().trim().notEmpty().withMessage('Front text cannot be empty'),
  body('back').optional().trim().notEmpty().withMessage('Back text cannot be empty'),
  imageConditionalLength('front', 'frontImage'),
  imageConditionalLength('back', 'backImage'),
  ...imageRules
];
