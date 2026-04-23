import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  startSessionRules,
  shuffleRules,
  answerRules
} from '../validators/studyValidators.js';
import * as studyService from '../services/studyService.js';

const router = Router();

// Study-session-scoped endpoints only.
router.post('/sessions', verifyToken, startSessionRules, validate, async (req, res) => {
  const result = await studyService.createSession(req.user, req.body);
  return res.status(201).json(result);
});

router.patch('/sessions/:id/shuffle', verifyToken, shuffleRules, validate, async (req, res) => {
  const result = await studyService.toggleShuffle(req.user, req.params.id, req.body.enabled);
  return res.json(result);
});

router.post('/sessions/:id/answer', verifyToken, answerRules, validate, async (req, res) => {
  const result = await studyService.submitAnswer(req.user, req.params.id, req.body);
  return res.json(result);
});

export default router;