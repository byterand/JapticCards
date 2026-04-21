import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  student: {
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
  }
}, { timestamps: true });

assignmentSchema.index({ teacher: 1, student: 1, deck: 1 }, { unique: true });

export default mongoose.model('Assignment', assignmentSchema);
