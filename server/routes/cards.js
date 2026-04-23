import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { cardUpdateRules } from '../validators/cardValidators.js';
import * as cardService from '../services/cardService.js';

const router = Router();

router.patch('/:cardId', verifyToken, cardUpdateRules, validate, async (req, res) => {
  const card = await cardService.updateCard(req.user, req.params.cardId, req.body);
  return res.json(card);
});

router.delete('/:cardId', verifyToken, async (req, res) => {
  await cardService.deleteCard(req.user, req.params.cardId);
  return res.json({ message: 'Card deleted' });
});

export default router;