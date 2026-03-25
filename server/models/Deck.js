import mongoose from 'mongoose';

const deckSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  tags: [{ type: String }]
}, { timestamps: true });

export default mongoose.model('Deck', deckSchema);