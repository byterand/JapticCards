import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { deckRules, deckUpdateRules, importRules } from '../validators/deckValidators.js';
import { cardRules, cardUpdateRules } from '../validators/cardValidators.js';
import { cardStatusRules } from '../validators/studyValidators.js';
import * as deckService from '../services/deckService.js';
import * as cardService from '../services/cardService.js';
import * as studyService from '../services/studyService.js';
import * as statsService from '../services/statsService.js';
import { EXPORT_FORMATS } from '../utils/constants.js';

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
router.post('/import', verifyToken, importRules, validate, async (req, res) => {
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
  const format = (req.query.format || EXPORT_FORMATS.JSON).toLowerCase();
  const { contentType, body } = await deckService.exportDeck(req.user, req.params.id, format);
  res.setHeader('Content-Type', contentType);
  return res.send(body);
});

router.get('/:id/stats', verifyToken, async (req, res) => {
  const stats = await statsService.getDeckStats(req.user, req.params.id);
  return res.json(stats);
});

// All deck-owned card operations live under /decks/:id/cards[/:cardId].
router.post('/:id/cards', verifyToken, cardRules, validate, async (req, res) => {
  const card = await cardService.createCard(req.user, req.params.id, req.body);
  return res.status(201).json(card);
});

router.patch('/:id/cards/:cardId', verifyToken, cardUpdateRules, validate, async (req, res) => {
  const card = await cardService.updateCard(req.user, req.params.id, req.params.cardId, req.body);
  return res.json(card);
});

router.delete('/:id/cards/:cardId', verifyToken, async (req, res) => {
  await cardService.deleteCard(req.user, req.params.id, req.params.cardId);
  return res.json({ message: 'Card deleted' });
});

router.patch('/:id/cards/:cardId/status', verifyToken, cardStatusRules, validate, async (req, res) => {
  const result = await studyService.setCardStatus(
    req.user,
    req.params.id,
    req.params.cardId,
    req.body.status
  );
  return res.json(result);
});

export default router;