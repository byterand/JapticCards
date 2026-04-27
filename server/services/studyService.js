import Card from '../models/Card.js';
import StudySession from '../models/StudySession.js';
import CardProgress from '../models/CardProgress.js';
import { getAccessibleDeckLean } from './accessService.js';
import { shuffleArray } from '../utils/shuffle.js';
import { HttpError } from '../utils/HttpError.js';

// Returns the prompt + options the client sees AND the correctAnswer that
// stays server-side (persisted on the session, never returned to the client).
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
  return { prompt: card.front, options, correctAnswer: card.back };
}

// Returns { statement, statementTrue } for INTERNAL use only.
// statementTrue is stripped before leaving this module.
function buildTrueFalseQuestion(card, cards) {
  // Only pick a wrong candidate whose back differs from this card's back,
  // otherwise "false" would actually be true.
  const wrongCandidates = cards.filter((c) =>
    String(c._id) !== String(card._id) && c.back && c.back !== card.back);
  const wrongCard = wrongCandidates.length
    ? wrongCandidates[Math.floor(Math.random() * wrongCandidates.length)]
    : null;
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

  const cardFilter = { deck: deckId };
  if (needsReviewOnly) {
    const progress = await CardProgress.find({
      user: user.userId,
      status: 'needs_review'
    }).select('card').lean();
    cardFilter._id = { $in: progress.map((p) => p.card) };
  }

  const cards = await Card.find(cardFilter).sort({ order: 1 }).lean();
  if (!cards.length) {
    throw new HttpError(400, needsReviewOnly
      ? 'No cards marked as Needs Review'
      : 'Deck has no cards');
  }

  const distractorPool = needsReviewOnly
    ? await Card.find({ deck: deckId }).select('_id back').lean()
    : cards;

  const originalCardOrder = cards.map((card) => card._id);
  const resolvedMode = mode || 'flip';
  const resolvedSideFirst = sideFirst || 'front';

  const persistedQuestions = [];
  const questions = cards.map((card) => {
    switch (resolvedMode) {
      case 'multiple_choice':
        const { prompt, options, correctAnswer } = buildMultipleChoiceQuestion(card, distractorPool);
        persistedQuestions.push({ cardId: card._id, options, correctAnswer });
        return { cardId: card._id, prompt, options };
      case 'true_false':
        const { statement, statementTrue } = buildTrueFalseQuestion(card, distractorPool);
        persistedQuestions.push({ cardId: card._id, statement, statementTrue });
        return { cardId: card._id, statement };
      case 'written_answer':
        persistedQuestions.push({ cardId: card._id });
        return { cardId: card._id, prompt: card.front };
      default:
        persistedQuestions.push({ cardId: card._id });
        return {
          cardId: card._id,
          front: card.front,
          back: card.back,
          frontImage: card.frontImage,
          backImage: card.backImage
        };
    }
  });

  const session = await StudySession.create({
    user: user.userId,
    deck: deckId,
    mode: resolvedMode,
    sideFirst: resolvedSideFirst,
    originalCardOrder,
    currentCardOrder: originalCardOrder,
    questions: persistedQuestions,
    shuffleEnabled: false
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

  if (session.mode === 'flip') {
    throw new HttpError(400, 'Flip mode does not accept submitted answers');
  }

  const inSession = session.originalCardOrder.some((id) => String(id) === String(payload.cardId));

  if (!inSession) {
    throw new HttpError(400, 'Card is not part of this session');
  }

  const card = await Card.findById(payload.cardId);
  if (!card || String(card.deck) !== String(session.deck)) {
    throw new HttpError(404, 'Card not found in this session');
  }

  const question = session.questions?.find((q) => String(q.cardId) === String(payload.cardId));

  let isCorrect;
  switch (session.mode) {
    case 'multiple_choice':
      if (!question || !Array.isArray(question.options) || question.options.length === 0) {
        throw new HttpError(400, 'Question state missing for this card');
      }

      const selected = String(payload.selectedOption || '');
      if (!question.options.includes(selected)) {
        throw new HttpError(400, 'Selected option was not offered for this question');
      }

      isCorrect = selected === String(question.correctAnswer);
      break;
    case 'true_false':
      if (!question || typeof question.statementTrue !== 'boolean') {
        throw new HttpError(400, 'Question state missing for this card');
      }

      if (typeof payload.isTrue !== 'boolean') {
        throw new HttpError(400, 'isTrue must be a boolean for true_false mode');
      }

      isCorrect = payload.isTrue === question.statementTrue;
      break;
    case 'written_answer':
      isCorrect = String(payload.answer || '').trim().toLowerCase() === String(card.back).trim().toLowerCase();
      break;
    default:
      throw new HttpError(400, 'Unsupported study mode');
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

  // Track answered cards via $addToSet so duplicate submissions don't grow
  // the set, and flip completed when every card has been answered at least
  // once. Two-step (read-then-set) is fine here: completed is monotonic.
  const tracked = await StudySession.findOneAndUpdate(
    { _id: sessionId, user: user.userId },
    { $addToSet: { answeredCardIds: card._id } },
    { new: true, projection: { answeredCardIds: 1, originalCardOrder: 1, completed: 1 } }
  );
  let completed = Boolean(tracked?.completed);
  if (!completed && tracked) {
    const total = tracked.originalCardOrder?.length || 0;
    const answered = tracked.answeredCardIds?.length || 0;
    if (total > 0 && answered >= total) {
      await StudySession.updateOne(
        { _id: sessionId, user: user.userId, completed: false },
        { $set: { completed: true } }
      );
      completed = true;
    }
  }

  return {
    isCorrect,
    expected: card.back,
    cardProgress: progress,
    completed
  };
}

export async function setCardStatus(user, deckId, cardId, status) {
  const card = await Card.findById(cardId);
  if (!card || String(card.deck) !== String(deckId)) {
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
