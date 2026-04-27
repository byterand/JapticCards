import mongoose from 'mongoose';

const sessionQuestionSchema = new mongoose.Schema({
  cardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card',
    required: true
  },
  // multiple_choice
  options: {
    type: [String],
    default: undefined
  },
  correctAnswer: {
    type: String,
    default: undefined
  },
  // true_false
  statement: {
    type: String,
    default: undefined
  },
  statementTrue: {
    type: Boolean,
    default: undefined
  }
}, { _id: false });

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
  questions: {
    type: [sessionQuestionSchema],
    default: []
  },
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
