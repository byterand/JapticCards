export const STUDY_MODES = {
  FLIP: 'flip',
  MULTIPLE_CHOICE: 'multiple_choice',
  TRUE_FALSE: 'true_false',
  WRITTEN_ANSWER: 'written_answer'
};

export const STUDY_MODE_VALUES = Object.values(STUDY_MODES);

export const CARD_SIDES = {
  FRONT: 'front',
  BACK: 'back'
};

export const CARD_SIDE_VALUES = Object.values(CARD_SIDES);

export const CARD_STATUS = {
  KNOWN: 'known',
  STILL_LEARNING: 'still_learning',
  NEEDS_REVIEW: 'needs_review'
};

export const CARD_STATUS_VALUES = Object.values(CARD_STATUS);

export const EXPORT_FORMATS = {
  JSON: 'json',
  CSV: 'csv'
};

export const EXPORT_FORMAT_VALUES = Object.values(EXPORT_FORMATS);

export const CONTENT_TYPES = {
  JSON: 'application/json',
  CSV: 'text/csv'
};

// Image-related constants shared between upload route and image utils.
export const IMAGE_EXT_BY_MIME = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

export const IMAGE_MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};

export const ALLOWED_IMAGE_MIMES = new Set(Object.keys(IMAGE_EXT_BY_MIME));

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// URL prefixes for managed card images (served from server/uploads).
export const UPLOADS_URL_PREFIX = '/uploads/';
export const CARD_UPLOADS_URL_PREFIX = '/uploads/cards/';

// JWT-related constants.
export const REFRESH_TOKEN_TYPE = 'refresh';
export const REFRESH_COOKIE_NAME = 'jc_refresh';
