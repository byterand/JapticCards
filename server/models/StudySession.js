import mongoose from 'mongoose';
import {
  STUDY_MODES,
  STUDY_MODE_VALUES,
  CARD_SIDES,
  CARD_SIDE_VALUES
} from '../utils/constants.js';

const sessionQuestionSchema = new mongoose.Schema({
  cardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card',
    required: true
  },
  options: { // multiple_choice
    type: [String],
    default: undefined
  },
  correctAnswer: {
    type: String,
    default: undefined
  },
  statement: { // true_false
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
    enum: STUDY_MODE_VALUES,
    default: STUDY_MODES.FLIP
  },
  sideFirst: {
    type: String,
    enum: CARD_SIDE_VALUES,
    default: CARD_SIDES.FRONT
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
  answeredCardIds: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
    default: []
  },
  completed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model('StudySession', studySessionSchema);
