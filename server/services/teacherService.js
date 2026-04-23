import User from '../models/User.js';
import Deck from '../models/Deck.js';
import Assignment from '../models/Assignment.js';
import { HttpError } from '../utils/HttpError.js';

export async function listStudents() {
  return User.find({ role: 'student' }).select('_id username role').lean();
}

export async function listAssignments(teacherId, deckId) {
  const query = { teacher: teacherId };
  if (deckId) {
    query.deck = deckId;
  }
  return Assignment.find(query)
    .populate('student', '_id username')
    .populate('deck', '_id title')
    .lean();
}

export async function assignDeck(teacherId, { deckId, studentIds }) {
  const deck = await Deck.findById(deckId);
  if (!deck) {
    throw new HttpError(404, 'Deck not found');
  }
  if (String(deck.owner) !== String(teacherId)) {
    throw new HttpError(403, 'You can only assign your own decks');
  }
  const students = await User.find({
    _id: { $in: studentIds },
    role: 'student'
  }).select('_id');
  if (students.length !== studentIds.length) {
    throw new HttpError(400, 'One or more student ids are invalid');
  }
  const ops = students.map((student) => ({
    updateOne: {
      filter: { teacher: teacherId, student: student._id, deck: deck._id },
      update: { $setOnInsert: { teacher: teacherId, student: student._id, deck: deck._id } },
      upsert: true
    }
  }));
  await Assignment.bulkWrite(ops);
}

export async function revokeAssignment(teacherId, assignmentId) {
  const assignment = await Assignment.findOne({ _id: assignmentId, teacher: teacherId });
  if (!assignment) {
    throw new HttpError(404, 'Assignment not found');
  }
  await Assignment.deleteOne({ _id: assignment._id });
}
