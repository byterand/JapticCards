import Card from '../models/Card.js';
import StudySession from '../models/StudySession.js';
import CardProgress from '../models/CardProgress.js';
import DeckStat from '../models/DeckStat.js';
import { getAccessibleDeckLean } from './accessService.js';
import { shuffleArray } from '../utils/shuffle.js';
import { HttpError } from '../utils/HttpError.js';

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
  const wrongCard = cards.find((c) => String(c._id) !== String(card._id));
  const useCorrect = Math.random() > 0.5 || !wrongCard;
  if (useCorrect) {
    return {
      statement: `${card.front} -> ${card.back}`,
      statementTrue: true
    };
  }
  return {
    statement: `${card.front} -> ${wrongCard.back}`,
    statementTrue: false
  };
}

export async function createSession(user, { deckId, mode, sideFirst, needsReviewOnly }) {
  const access = await getAccessibleDeckLean(user, deckId);
  if (!access) {
    throw new HttpError(404, 'Deck not found');
  }

  let cards = await Card.find({ deck: deckId }).sort({ order: 1 }).lean();
  if (!cards.length) {
    throw new HttpError(400, 'Deck has no cards');
  }

  if (needsReviewOnly) {
    const cardIds = cards.map((card) => card._id);
    const progress = await CardProgress.find({
      user: user.userId,
      card: { $in: cardIds },
      status: 'needs_review'
    }).select('card');
    const reviewSet = new Set(progress.map((p) => String(p.card)));
    cards = cards.filter((card) => reviewSet.has(String(card._id)));
    if (!cards.length) {
      throw new HttpError(400, 'No cards marked as Needs Review');
    }
  }

  const originalCardOrder = cards.map((card) => card._id);
  const resolvedMode = mode || 'flip';
  const resolvedSideFirst = sideFirst || 'front';

  const session = await StudySession.create({
    user: user.userId,
    deck: deckId,
    mode: resolvedMode,
    sideFirst: resolvedSideFirst,
    originalCardOrder,
    currentCardOrder: originalCardOrder,
    shuffleEnabled: false
  });

  const questions = cards.map((card) => {
    if (resolvedMode === 'multiple_choice') {
      return { cardId: card._id, ...buildMultipleChoiceQuestion(card, cards) };
    }
    if (resolvedMode === 'true_false') {
      return { cardId: card._id, ...buildTrueFalseQuestion(card, cards) };
    }
    if (resolvedMode === 'written_answer') {
      return { cardId: card._id, prompt: card.front };
    }
    return {
      cardId: card._id,
      front: card.front,
      back: card.back,
      frontImage: card.frontImage,
      backImage: card.backImage
    };
  });

  return {
    sessionId: session._id,
    deckId,
    mode: resolvedMode,
    sideFirst: resolvedSideFirst,
    shuffleEnabled: false,
    cardOrder: session.currentCardOrder,
    questions
  };
}

export async function toggleShuffle(user, sessionId, enabled) {
  const session = await StudySession.findOne({ _id: sessionId, user: user.userId });
  if (!session) {
    throw new HttpError(404, 'Session not found');
  }
  session.shuffleEnabled = enabled;
  session.currentCardOrder = enabled
    ? shuffleArray(session.originalCardOrder)
    : [...session.originalCardOrder];
  await session.save();
  return { shuffleEnabled: session.shuffleEnabled, cardOrder: session.currentCardOrder };
}

export async function submitAnswer(user, sessionId, payload) {
  const session = await StudySession.findOne({ _id: sessionId, user: user.userId });
  if (!session) {
    throw new HttpError(404, 'Session not found');
  }

  const card = await Card.findById(payload.cardId);
  if (!card || String(card.deck) !== String(session.deck)) {
    throw new HttpError(404, 'Card not found in this session');
  }

  let isCorrect;
  if (session.mode === 'multiple_choice') {
    isCorrect = String(payload.selectedOption || '') === String(card.back);
  } else if (session.mode === 'true_false') {
    const presentedStatement = String(payload.answer || '');
    const trueStatement = `${card.front} -> ${card.back}`;
    const statementMatchesTrue = presentedStatement === trueStatement;
    isCorrect = Boolean(payload.isTrue) === statementMatchesTrue;
  } else if (session.mode === 'written_answer') {
    isCorrect = String(payload.answer || '').trim().toLowerCase()
      === String(card.back).trim().toLowerCase();
  } else {
    isCorrect = true;
  }

  const progress = await CardProgress.findOneAndUpdate(
    { user: user.userId, card: card._id },
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
    { user: user.userId, deck: session.deck },
    {
      $inc: {
        cardsStudied: 1,
        correctCount: isCorrect ? 1 : 0,
        incorrectCount: isCorrect ? 0 : 1
      }
    },
    { upsert: true, returnDocument: 'after' }
  );

  return {
    isCorrect,
    expected: card.back,
    cardProgress: progress
  };
}

export async function setCardStatus(user, cardId, status) {
  const card = await Card.findById(cardId);
  if (!card) {
    throw new HttpError(404, 'Card not found');
  }
  const access = await getAccessibleDeckLean(user, card.deck);
  if (!access) {
    throw new HttpError(404, 'Deck not found');
  }
  return CardProgress.findOneAndUpdate(
    { user: user.userId, card: card._id },
    { $set: { status } },
    { upsert: true, returnDocument: 'after' },
  );
}