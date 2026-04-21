import mongoose from 'mongoose';

const deckStatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deck: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deck',
    required: true,
    index: true
  },
  cardsStudied: {
    type: Number,
    default: 0
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

deckStatSchema.index({ user: 1, deck: 1 }, { unique: true });

export default mongoose.model('DeckStat', deckStatSchema);
