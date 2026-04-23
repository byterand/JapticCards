import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { assignmentRules } from '../validators/teacherValidators.js';
import * as teacherService from '../services/teacherService.js';

const router = Router();

router.get('/students', verifyToken, requireRole('teacher'), async (req, res) => {
  const students = await teacherService.listStudents();
  return res.json(students);
});

router.get('/assignments', verifyToken, requireRole('teacher'), async (req, res) => {
  const assignments = await teacherService.listAssignments(req.user.userId, req.query.deckId);
  return res.json(assignments);
});

router.post('/assignments', verifyToken, requireRole('teacher'), assignmentRules, validate, async (req, res) => {
  await teacherService.assignDeck(req.user.userId, req.body);
  return res.status(201).json({ message: 'Deck assigned' });
});

router.delete('/assignments/:id', verifyToken, requireRole('teacher'), async (req, res) => {
  await teacherService.revokeAssignment(req.user.userId, req.params.id);
  return res.json({ message: 'Assignment revoked' });
});

export default router;