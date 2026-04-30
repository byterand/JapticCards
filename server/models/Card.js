import mongoose from 'mongoose';
import { CARD_LIMITS } from '../utils/limits.js';

function lengthForSide(imageField) {
  return function (value) {
    if (typeof value !== 'string')
      return false;

    const max = this[imageField] ? CARD_LIMITS.TEXT_MAX_WITH_IMAGE : CARD_LIMITS.TEXT_MAX;
    return value.length <= max;
  };
}

const cardSchema = new mongoose.Schema({
  deck: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deck',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  front: {
    type: String,
    required: true,
    maxLength: CARD_LIMITS.TEXT_MAX,
    validate: {
      validator: lengthForSide('frontImage'),
      message: `Front must be at most ${CARD_LIMITS.TEXT_MAX} characters (${CARD_LIMITS.TEXT_MAX_WITH_IMAGE} when an image is included)`
    }
  },
  back: {
    type: String,
    required: true,
    maxLength: CARD_LIMITS.TEXT_MAX,
    validate: {
      validator: lengthForSide('backImage'),
      message: `Back must be at most ${CARD_LIMITS.TEXT_MAX} characters (${CARD_LIMITS.TEXT_MAX_WITH_IMAGE} when an image is included)`
    }
  },
  frontImage: {
    type: String,
    default: '',
    maxLength: CARD_LIMITS.IMAGE_URL_MAX
  },
  backImage: {
    type: String,
    default: '',
    maxLength: CARD_LIMITS.IMAGE_URL_MAX
  },
  order: {
    type: Number,
    default: 0
  },
}, { timestamps: true });

cardSchema.index({ deck: 1, order: 1 });

export default mongoose.model('Card', cardSchema);
