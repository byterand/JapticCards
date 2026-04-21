import mongoose from 'mongoose';

const studySessionSchema = new mongoose.Schema({
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
  mode: {
    type: String,
    enum: ['multiple_choice', 'true_false', 'written_answer', 'flip'],
    default: 'flip'
  },
  sideFirst: {
    type: String,
    enum: ['front', 'back'],
    default: 'front'
  },
  originalCardOrder: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card'
  }],
  currentCardOrder: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card'
  }],
  shuffleEnabled: {
    type: Boolean,
    default: false
  },
  completed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model('StudySession', studySessionSchema);
