import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import Card from '../models/Card.js';
import StudySession from '../models/StudySession.js';
import CardProgress from '../models/CardProgress.js';
import DeckStat from '../models/DeckStat.js';
import { verifyToken } from '../middleware/auth.js';
import { getAccessibleDeck, shuffleArray } from './helpers.js';

const router = Router();

function buildMultipleChoiceQuestion(card, cards) {
  const distractors = cards
    .filter((c) => String(c._id) !== String(card._id))
    .map((c) => c.back)
    .filter(Boolean);
  const uniqueDistractors = [...new Set(distractors)].slice(0, 3);
  while (uniqueDistractors.length < 3) {
    uniqueDistractors.push(`${card.back} (alt ${uniqueDistractors.length + 1})`);
  }
  const options = shuffleArray([card.back, ...uniqueDistractors]).slice(0, 4);
  return { prompt: card.front, options };
}

function buildTrueFalseQuestion(card, cards) {
  const useCorrect = Math.random() > 0.5 || cards.length < 2;
  if (useCorrect) {
    return {
      statement: `${card.front} -> ${card.back}`,
      statementTrue: true
    };
  }
  const wrongCard = cards.find((c) => String(c._id) !== String(card._id));
  return {
    statement: `${card.front} -> ${wrongCard?.back || card.back}`,
    statementTrue: false
  };
}

router.post('/study/sessions', verifyToken, [
  body('deckId').notEmpty(),
  body('mode').optional().isIn(['multiple_choice', 'true_false', 'written_answer', 'flip']),
  body('sideFirst').optional().isIn(['front', 'back']),
  body('needsReviewOnly').optional().isBoolean()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const access = await getAccessibleDeck(req.user, req.body.deckId);
  if (!access) {
    return res.status(404).json({ message: 'Deck not found' });
  }

  let cards = await Card.find({ deck: req.body.deckId }).sort({ order: 1 }).lean();
  if (!cards.length) {
    return res.status(400).json({ message: 'Deck has no cards' });
  }

  const needsReviewOnly = Boolean(req.body.needsReviewOnly);
  if (needsReviewOnly) {
    const cardIds = cards.map((card) => card._id);
    const progress = await CardProgress.find({
      user: req.user.userId,
      card: { $in: cardIds },
      status: 'needs_review'
    }).select('card');
    const reviewSet = new Set(progress.map((p) => String(p.card)));
    cards = cards.filter((card) => reviewSet.has(String(card._id)));
    if (!cards.length) {
      return res.status(400).json({ message: 'No cards marked as Needs Review' });
    }
  }

  const originalCardOrder = cards.map((card) => card._id);
  const mode = req.body.mode || 'flip';
  const sideFirst = req.body.sideFirst || 'front';
  const session = await StudySession.create({
    user: req.user.userId,
    deck: req.body.deckId,
    mode,
    sideFirst,
    originalCardOrder,
    currentCardOrder: originalCardOrder,
    shuffleEnabled: false
  });

  const questions = cards.map((card) => {
    if (mode === 'multiple_choice') {
      return { cardId: card._id, ...buildMultipleChoiceQuestion(card, cards) };
    }
    if (mode === 'true_false') {
      return { cardId: card._id, ...buildTrueFalseQuestion(card, cards) };
    }
    if (mode === 'written_answer') {
      return { cardId: card._id, prompt: card.front };
    }
    return { cardId: card._id, front: card.front, back: card.back, frontImage: card.frontImage, backImage: card.backImage };
  });

  return res.status(201).json({
    sessionId: session._id,
    deckId: req.body.deckId,
    mode,
    sideFirst,
    shuffleEnabled: false,
    cardOrder: session.currentCardOrder,
    questions
  });
});

router.patch('/study/sessions/:id/shuffle', verifyToken, [body('enabled').isBoolean()], async (req, res) => {
  const session = await StudySession.findOne({ _id: req.params.id, user: req.user.userId });
  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }
  const enabled = req.body.enabled;
  session.shuffleEnabled = enabled;
  session.currentCardOrder = enabled ? shuffleArray(session.originalCardOrder) : session.originalCardOrder;
  await session.save();
  return res.json({ shuffleEnabled: session.shuffleEnabled, cardOrder: session.currentCardOrder });
});

router.post('/study/sessions/:id/answer', verifyToken, [
  body('cardId').notEmpty(),
  body('answer').optional(),
  body('selectedOption').optional(),
  body('isTrue').optional()
], async (req, res) => {
  const session = await StudySession.findOne({ _id: req.params.id, user: req.user.userId });
  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }

  const card = await Card.findById(req.body.cardId);
  if (!card || String(card.deck) !== String(session.deck)) {
    return res.status(404).json({ message: 'Card not found in this session' });
  }

  let isCorrect = false;
  if (session.mode === 'multiple_choice') {
    isCorrect = String(req.body.selectedOption || '') === String(card.back);
  } else if (session.mode === 'true_false') {
    const presentedStatement = String(req.body.answer || '');
    const trueStatement = `${card.front} -> ${card.back}`;
    const statementMatchesTrue = presentedStatement === trueStatement;
    isCorrect = Boolean(req.body.isTrue) === statementMatchesTrue;
  } else if (session.mode === 'written_answer') {
    isCorrect = String(req.body.answer || '').trim().toLowerCase() === String(card.back).trim().toLowerCase();
  } else {
    isCorrect = true;
  }

  const progress = await CardProgress.findOneAndUpdate(
    { user: req.user.userId, card: card._id },
    {
      $setOnInsert: { status: 'still_learning' },
      $inc: {
        correctCount: isCorrect ? 1 : 0,
        incorrectCount: isCorrect ? 0 : 1
      }
    },
    { upsert: true, returnDocument: 'after' }
  );

  await DeckStat.findOneAndUpdate(
    { user: req.user.userId, deck: session.deck },
    {
      $inc: {
        cardsStudied: 1,
        correctCount: isCorrect ? 1 : 0,
        incorrectCount: isCorrect ? 0 : 1
      }
    },
    { upsert: true, returnDocument: 'after' }
  );

  return res.json({
    isCorrect,
    expected: card.back,
    cardProgress: progress
  });
});

router.patch('/study/cards/:cardId/status', verifyToken, [body('status').isIn(['known', 'still_learning', 'needs_review'])], async (req, res) => {
  const card = await Card.findById(req.params.cardId);
  if (!card) {
    return res.status(404).json({ message: 'Card not found' });
  }
  const access = await getAccessibleDeck(req.user, card.deck);
  if (!access) {
    return res.status(404).json({ message: 'Deck not found' });
  }

  const progress = await CardProgress.findOneAndUpdate(
    { user: req.user.userId, card: card._id },
    { $set: { status: req.body.status } },
    { upsert: true, returnDocument: 'after' }
  );
  return res.json(progress);
});

router.get('/stats/decks/:deckId', verifyToken, async (req, res) => {
  const access = await getAccessibleDeck(req.user, req.params.deckId);
  if (!access) {
    return res.status(404).json({ message: 'Deck not found' });
  }
  const stats = await DeckStat.findOne({ user: req.user.userId, deck: req.params.deckId }).lean();
  const cards = await Card.find({ deck: req.params.deckId }).select('_id front back').lean();
  const progress = await CardProgress.find({ user: req.user.userId, card: { $in: cards.map((c) => c._id) } }).lean();
  const progressMap = new Map(progress.map((item) => [String(item.card), item]));

  const cardStats = cards.map((card) => {
    const p = progressMap.get(String(card._id));
    return {
      cardId: card._id,
      front: card.front,
      correctCount: p?.correctCount || 0,
      incorrectCount: p?.incorrectCount || 0,
      status: p?.status || 'still_learning'
    };
  });

  const cardsStudied = stats?.cardsStudied || 0;
  const correctCount = stats?.correctCount || 0;
  return res.json({
    cardsStudied,
    correctCount,
    incorrectCount: stats?.incorrectCount || 0,
    accuracyRate: cardsStudied ? Number((correctCount / cardsStudied).toFixed(2)) : 0,
    cardStats
  });
});

export default router;
