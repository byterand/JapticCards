import mongoose from 'mongoose';
import { CARD_STATUS, CARD_STATUS_VALUES } from '../utils/constants.js';

const cardProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: CARD_STATUS_VALUES,
    default: CARD_STATUS.STILL_LEARNING
  },
  correctCount: {
    type: Number,
    default: 0
  },
  incorrectCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

cardProgressSchema.index({ user: 1, card: 1 }, { unique: true });

export default mongoose.model('CardProgress', cardProgressSchema);
