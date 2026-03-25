import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema({
  deck: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck', required: true },
  front: { type: String, required: true },
  back: { type: String, required: true },
  image: { type: String, default: '' },
  status: { type: String, enum: ['known', 'learning', 'unlearned'], default: 'unlearned' },
  stats: {
    timesStudied: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
  },
}, { timestamps: true });

export default mongoose.model('Card', cardSchema);