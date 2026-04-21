import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import Card from '../models/Card.js';
import { verifyToken } from '../middleware/auth.js';
import { getAccessibleDeck } from './helpers.js';

const router = Router();

const cardRules = [
  body('front').trim().notEmpty(),
  body('back').trim().notEmpty(),
  body('frontImage').optional().isString(),
  body('backImage').optional().isString()
];

router.post('/decks/:id/cards', verifyToken, cardRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const access = await getAccessibleDeck(req.user, req.params.id);
  if (!access) {
    return res.status(404).json({ message: 'Deck not found' });
  }
  if (access.readOnly) {
    return res.status(403).json({ message: 'Assigned decks are read-only for students' });
  }

  const count = await Card.countDocuments({ deck: req.params.id });
  const card = await Card.create({
    owner: req.user.userId,
    deck: req.params.id,
    front: req.body.front,
    back: req.body.back,
    frontImage: req.body.frontImage || '',
    backImage: req.body.backImage || '',
    order: count
  });
  return res.status(201).json(card);
});

router.patch('/cards/:cardId', verifyToken, cardRules.map((rule) => rule.optional()), async (req, res) => {
  const card = await Card.findById(req.params.cardId);
  if (!card) {
    return res.status(404).json({ message: 'Card not found' });
  }

  const access = await getAccessibleDeck(req.user, card.deck);
  if (!access) {
    return res.status(404).json({ message: 'Deck not found' });
  }
  if (access.readOnly) {
    return res.status(403).json({ message: 'Assigned decks are read-only for students' });
  }

  ['front', 'back', 'frontImage', 'backImage'].forEach((field) => {
    if (req.body[field] !== undefined) {
      card[field] = req.body[field];
    }
  });
  await card.save();
  return res.json(card);
});

router.delete('/cards/:cardId', verifyToken, async (req, res) => {
  const card = await Card.findById(req.params.cardId);
  if (!card) {
    return res.status(404).json({ message: 'Card not found' });
  }

  const access = await getAccessibleDeck(req.user, card.deck);
  if (!access) {
    return res.status(404).json({ message: 'Deck not found' });
  }
  if (access.readOnly) {
    return res.status(403).json({ message: 'Assigned decks are read-only for students' });
  }

  await Card.deleteOne({ _id: card._id });
  return res.json({ message: 'Card deleted' });
});

export default router;
