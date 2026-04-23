import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import * as statsService from '../services/statsService.js';

const router = Router();

router.get('/decks/:deckId', verifyToken, async (req, res) => {
  const stats = await statsService.getDeckStats(req.user, req.params.deckId);
  return res.json(stats);
});

export default router;