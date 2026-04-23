import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { deckRules, deckUpdateRules } from '../validators/deckValidators.js';
import { cardRules } from '../validators/cardValidators.js';
import * as deckService from '../services/deckService.js';
import * as cardService from '../services/cardService.js';

const router = Router();

router.get('/', verifyToken, async (req, res) => {
  const decks = await deckService.listUserDecks(req.user.userId);
  return res.json(decks);
});

router.post('/', verifyToken, deckRules, validate, async (req, res) => {
  const deck = await deckService.createDeck(req.user.userId, req.body);
  return res.status(201).json(deck);
});

// Specific routes declared before '/:id' to avoid being shadowed.
router.post('/import', verifyToken, async (req, res) => {
  const { deckId } = await deckService.importDeck(req.user.userId, req.body);
  return res.status(201).json({ message: 'Deck imported', deckId });
});

router.get('/:id', verifyToken, async (req, res) => {
  const deck = await deckService.getDeckWithCards(req.user, req.params.id);
  return res.json(deck);
});

router.patch('/:id', verifyToken, deckUpdateRules, validate, async (req, res) => {
  const deck = await deckService.updateDeck(req.user, req.params.id, req.body);
  return res.json(deck);
});

router.delete('/:id', verifyToken, async (req, res) => {
  await deckService.deleteDeck(req.user, req.params.id);
  return res.json({ message: 'Deck deleted' });
});

router.get('/:id/export', verifyToken, async (req, res) => {
  const format = (req.query.format || 'json').toLowerCase();
  const { contentType, body } = await deckService.exportDeck(req.user, req.params.id, format);
  res.setHeader('Content-Type', contentType);
  return res.send(body);
});

// Nested: card creation lives under the owning deck.
router.post('/:id/cards', verifyToken, cardRules, validate, async (req, res) => {
  const card = await cardService.createCard(req.user, req.params.id, req.body);
  return res.status(201).json(card);
});

export default router;