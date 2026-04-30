import mongoose from 'mongoose';
import { DECK_LIMITS } from '../utils/limits.js';

const deckSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxLength: DECK_LIMITS.TITLE_MAX
  },
  description: {
    type: String,
    default: '',
    maxLength: DECK_LIMITS.DESCRIPTION_MAX
  },
  category: {
    type: String,
    default: '',
    maxLength: DECK_LIMITS.CATEGORY_MAX
  },
  tags: {
    type: [{ type: String, maxLength: DECK_LIMITS.TAG_MAX }],
    validate: {
      validator: (v) => !Array.isArray(v) || v.length <= DECK_LIMITS.TAGS_MAX_COUNT,
      message: `At most ${DECK_LIMITS.TAGS_MAX_COUNT} tags allowed`
    }
  },
  cardCounter: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Deck', deckSchema);
