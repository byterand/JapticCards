import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Assignment from '../models/Assignment.js';
import Deck from '../models/Deck.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/teacher/students', verifyToken, requireRole('teacher'), async (req, res) => {
  const students = await User.find({ role: 'student' }).select('_id username role').lean();
  return res.json(students);
});

router.get('/teacher/assignments', verifyToken, requireRole('teacher'), async (req, res) => {
  const query = { teacher: req.user.userId };
  if (req.query.deckId) {
    query.deck = req.query.deckId;
  }
  const assignments = await Assignment.find(query)
    .populate('student', '_id username')
    .populate('deck', '_id title')
    .lean();
  return res.json(assignments);
});

router.post('/teacher/assignments', verifyToken, requireRole('teacher'), [
  body('deckId').notEmpty(),
  body('studentIds').isArray({ min: 1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const deck = await Deck.findById(req.body.deckId);
  if (!deck) {
    return res.status(404).json({ message: 'Deck not found' });
  }
  if (String(deck.owner) !== String(req.user.userId)) {
    return res.status(403).json({ message: 'You can only assign your own decks' });
  }

  const students = await User.find({ _id: { $in: req.body.studentIds }, role: 'student' }).select('_id');
  if (students.length !== req.body.studentIds.length) {
    return res.status(400).json({ message: 'One or more student ids are invalid' });
  }

  const ops = students.map((student) => ({
    updateOne: {
      filter: { teacher: req.user.userId, student: student._id, deck: deck._id },
      update: { $setOnInsert: { teacher: req.user.userId, student: student._id, deck: deck._id } },
      upsert: true
    }
  }));
  await Assignment.bulkWrite(ops);
  return res.status(201).json({ message: 'Deck assigned' });
});

router.delete('/teacher/assignments/:id', verifyToken, requireRole('teacher'), async (req, res) => {
  const assignment = await Assignment.findOne({ _id: req.params.id, teacher: req.user.userId });
  if (!assignment) {
    return res.status(404).json({ message: 'Assignment not found' });
  }
  await Assignment.deleteOne({ _id: assignment._id });
  return res.json({ message: 'Assignment revoked' });
});

export default router;
