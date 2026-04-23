import mongoose from 'mongoose';

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
    required: true
  },
  back: {
    type: String,
    required: true
  },
  frontImage: {
    type: String,
    default: ''
  },
  backImage: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  },
}, { timestamps: true });

cardSchema.index({ deck: 1, order: 1 });

export default mongoose.model('Card', cardSchema);