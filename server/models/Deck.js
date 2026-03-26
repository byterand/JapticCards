import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema({
  front: {
    type: String,
    required: true
  },
  back: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['known', 'learning', 'unlearned'],
    default: 'unlearned'
  },
  stats: {
    timesStudied: {
      type: Number,
      default: 0
    },
    correct: {
      type: Number,
      default: 0
    },
  },
}, { timestamps: true });

const deckSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  tags: [{ type: String }],
  cards: [cardSchema]
}, { timestamps: true });

export default mongoose.model('Deck', deckSchema);