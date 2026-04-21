import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import Deck from '../models/Deck.js';
import Card from '../models/Card.js';
import Assignment from '../models/Assignment.js';
import CardProgress from '../models/CardProgress.js';
import { verifyToken } from '../middleware/auth.js';
import { getAccessibleDeck } from './helpers.js';

const router = Router();

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] || '').trim();
    });
    return row;
  });
}

const deckRules = [
  body('title').trim().notEmpty(),
  body('description').optional().isString(),
  body('category').optional().isString(),
  body('tags').optional().isArray()
];

router.get('/decks', verifyToken, async (req, res) => {
  const ownedDecks = await Deck.find({ owner: req.user.userId }).lean();
  const assignments = await Assignment.find({ student: req.user.userId }).select('deck');
  const assignedDeckIds = assignments.map((a) => a.deck);
  const assignedDecks = assignedDeckIds.length ? await Deck.find({ _id: { $in: assignedDeckIds } }).lean() : [];

  const owned = ownedDecks.map((deck) => ({ ...deck, readOnly: false, access: 'owner' }));
  const assigned = assignedDecks.map((deck) => ({ ...deck, readOnly: true, access: 'assigned' }));
  return res.json([...owned, ...assigned]);
});

router.post('/decks', verifyToken, deckRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const deck = await Deck.create({
    owner: req.user.userId,
    title: req.body.title,
    description: req.body.description || '',
    category: req.body.category || '',
    tags: req.body.tags || []
  });

  return res.status(201).json(deck);
});

router.get('/decks/:id', verifyToken, async (req, res) => {
  const access = await getAccessibleDeck(req.user, req.params.id);
  if (!access) {
    return res.status(404).json({ message: 'Deck not found' });
  }
  const cards = await Card.find({ deck: req.params.id }).sort({ order: 1 });
  return res.json({ ...access.deck.toObject(), cards, readOnly: access.readOnly, access: access.readOnly ? 'assigned' : 'owner' });
});

router.patch('/decks/:id', verifyToken, deckRules.map((rule) => rule.optional()), async (req, res) => {
  const access = await getAccessibleDeck(req.user, req.params.id);
  if (!access) {
    return res.status(404).json({ message: 'Deck not found' });
  }
  if (access.readOnly) {
    return res.status(403).json({ message: 'Assigned decks are read-only for students' });
  }

  const fields = ['title', 'description', 'category', 'tags'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      access.deck[field] = req.body[field];
    }
  });
  await access.deck.save();
  return res.json(access.deck);
});

router.delete('/decks/:id', verifyToken, async (req, res) => {
  const access = await getAccessibleDeck(req.user, req.params.id);
  if (!access) {
    return res.status(404).json({ message: 'Deck not found' });
  }
  if (access.readOnly) {
    return res.status(403).json({ message: 'Assigned decks are read-only for students' });
  }

  const cards = await Card.find({ deck: access.deck._id }).select('_id');
  const cardIds = cards.map((card) => card._id);
  await Card.deleteMany({ deck: access.deck._id });
  await CardProgress.deleteMany({ card: { $in: cardIds } });
  await Assignment.deleteMany({ deck: access.deck._id });
  await Deck.deleteOne({ _id: access.deck._id });
  return res.json({ message: 'Deck deleted' });
});

router.get('/decks/:id/export', verifyToken, async (req, res) => {
  const format = (req.query.format || 'json').toLowerCase();
  const access = await getAccessibleDeck(req.user, req.params.id);
  if (!access) {
    return res.status(404).json({ message: 'Deck not found' });
  }

  const cards = await Card.find({ deck: req.params.id }).sort({ order: 1 }).lean();
  const payload = {
    title: access.deck.title,
    description: access.deck.description,
    category: access.deck.category,
    tags: access.deck.tags,
    cards: cards.map((card) => ({
      front: card.front,
      back: card.back,
      frontImage: card.frontImage || '',
      backImage: card.backImage || ''
    }))
  };

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify(payload, null, 2));
  }

  if (format === 'csv') {
    const header = 'deckTitle,deckDescription,deckCategory,front,back,frontImage,backImage';
    const rows = payload.cards.map((card) => [
      payload.title,
      payload.description,
      payload.category,
      card.front,
      card.back,
      card.frontImage,
      card.backImage
    ].map((value) => `"${String(value || '').replaceAll('"', '""')}"`).join(','));
    res.setHeader('Content-Type', 'text/csv');
    return res.send([header, ...rows].join('\n'));
  }

  return res.status(400).json({ message: 'Unsupported export format. Use json or csv.' });
});

router.post('/decks/import', verifyToken, async (req, res) => {
  const { format, content } = req.body;
  if (!format || !content) {
    return res.status(400).json({ message: 'format and content are required' });
  }

  let data;
  try {
    if (format === 'json') {
      data = JSON.parse(content);
    } else if (format === 'csv') {
      const rows = parseCsv(content);
      if (!rows.length) {
        return res.status(400).json({ message: 'CSV must include at least one card row' });
      }
      data = {
        title: rows[0].deckTitle || 'Imported Deck',
        description: rows[0].deckDescription || '',
        category: rows[0].deckCategory || '',
        cards: rows.map((row) => ({
          front: row.front,
          back: row.back,
          frontImage: row.frontImage || '',
          backImage: row.backImage || ''
        }))
      };
    } else {
      return res.status(400).json({ message: 'Unsupported import format. Use json or csv.' });
    }
  } catch {
    return res.status(400).json({ message: 'Invalid file content. Could not parse.' });
  }

  if (!data?.title || !Array.isArray(data.cards) || data.cards.length === 0) {
    return res.status(400).json({ message: 'Imported file must include deck title and at least one card.' });
  }

  if (data.cards.some((card) => !card.front || !card.back)) {
    return res.status(400).json({ message: 'Each imported card must include front and back text.' });
  }

  const deck = await Deck.create({
    owner: req.user.userId,
    title: data.title,
    description: data.description || '',
    category: data.category || '',
    tags: data.tags || []
  });

  const cards = data.cards.map((card, index) => ({
    owner: req.user.userId,
    deck: deck._id,
    front: card.front,
    back: card.back,
    frontImage: card.frontImage || '',
    backImage: card.backImage || '',
    order: index
  }));
  await Card.insertMany(cards);
  return res.status(201).json({ message: 'Deck imported', deckId: deck._id });
});

export default router;
