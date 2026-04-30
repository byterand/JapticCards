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
    required: true,
    maxLength: 35
  },
  description: {
    type: String,
    default: '',
    maxLength: 100
  },
  category: {
    type: String,
    default: '',
    maxLength: 25
  },
  tags: {
    type: [{ type: String, maxLength: 15 }],
    validate: {
      validator: (v) => !Array.isArray(v) || v.length <= 4,
      message: 'At most 4 tags allowed'
    }
  },
  cardCounter: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Deck', deckSchema);
