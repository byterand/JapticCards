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
    required: true,
    maxLength: 500
  },
  back: {
    type: String,
    required: true,
    maxLength: 2000
  },
  frontImage: {
    type: String,
    default: '',
    maxLength: 2048
  },
  backImage: {
    type: String,
    default: '',
    maxLength: 2048
  },
  order: {
    type: Number,
    default: 0
  },
}, { timestamps: true });

cardSchema.index({ deck: 1, order: 1 });

export default mongoose.model('Card', cardSchema);