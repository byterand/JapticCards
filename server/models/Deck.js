import mongoose from 'mongoose';

const deckSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: ''
  },
  tags: [{ type: String }],
  cardCounter: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Deck', deckSchema);
