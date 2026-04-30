import Card from '../models/Card.js';
import StudySession from '../models/StudySession.js';
import CardProgress from '../models/CardProgress.js';
import { getAccessibleDeckLean } from './accessService.js';
import { shuffleArray } from '../utils/shuffle.js';
import { withTransaction } from '../utils/transaction.js';
import { HttpError } from '../utils/HttpError.js';
import { STUDY_MODES, CARD_STATUS, CARD_SIDES } from '../utils/constants.js';

const MC_MAX_DISTRACTORS = 3;

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sameId(a, b) {
  return String(a) === String(b);
}

function buildMultipleChoiceQuestion(card, cards) {
  // Exclude both this card and any card whose back matches it, otherwise
  // the prompt would have multiple visually-identical "correct" options.
  const distractors = cards
    .filter((c) => !sameId(c._id, card._id) && c.back && c.back !== card.back)
    .map((c) => c.back);
  const uniqueDistractors = shuffleArray([...new Set(distractors)]).slice(0, MC_MAX_DISTRACTORS);
  const options = shuffleArray([card.back, ...uniqueDistractors]);
  return { prompt: card.front, options, correctAnswer: card.back };
}

function buildTrueFalseQuestion(card, cards) {
  // Only pick a wrong candidate whose back differs from this card's back,
  // otherwise "false" would actually be true.
  const wrongCandidates = cards.filter((c) => !sameId(c._id, card._id) && c.back && c.back !== card.back);
  const wrongCard = wrongCandidates.length ? pickRandom(wrongCandidates) : null;
  const useCorrect = !wrongCard || Math.random() > 0.5;
  const back = useCorrect ? card.back : wrongCard.back;
  return {
    statement: `${card.front} -> ${back}`,
    statementTrue: useCorrect
  };
}

// Build the per-mode question payload (client view) and the persisted record
// (server-only state) for a single card.
function buildQuestionForMode(mode, card, distractorPool) {
  switch (mode) {
    case STUDY_MODES.MULTIPLE_CHOICE: {
      const { prompt, options, correctAnswer } = buildMultipleChoiceQuestion(card, distractorPool);
      return {
        clientView: { cardId: card._id, prompt, options },
        persisted: { cardId: card._id, options, correctAnswer }
      };
    }
    case STUDY_MODES.TRUE_FALSE: {
      const { statement, statementTrue } = buildTrueFalseQuestion(card, distractorPool);
      return {
        clientView: { cardId: card._id, statement },
        persisted: { cardId: card._id, statement, statementTrue }
      };
    }
    case STUDY_MODES.WRITTEN_ANSWER:
      return {
        clientView: { cardId: card._id, prompt: card.front },
        persisted: { cardId: card._id }
      };
    default:
      // STUDY_MODES.FLIP: client gets full card; server persists only id.
      return {
        clientView: {
          cardId: card._id,
          front: card.front,
          back: card.back,
          frontImage: card.frontImage,
          backImage: card.backImage
        },
        persisted: { cardId: card._id }
      };
  }
}

const ANSWER_GRADERS = {
  [STUDY_MODES.MULTIPLE_CHOICE]({ question, payload }) {
    if (!question || !Array.isArray(question.options) || question.options.length === 0)
      throw new HttpError(400, 'Question state missing for this card');

    const selected = String(payload.selectedOption || '');
    if (!question.options.includes(selected))
      throw new HttpError(400, 'Selected option was not offered for this question');

    return selected === String(question.correctAnswer);
  },
  [STUDY_MODES.TRUE_FALSE]({ question, payload }) {
    if (!question || typeof question.statementTrue !== 'boolean')
      throw new HttpError(400, 'Question state missing for this card');

    if (typeof payload.isTrue !== 'boolean')
      throw new HttpError(400, 'isTrue must be a boolean for true_false mode');

    return payload.isTrue === question.statementTrue;
  },
  [STUDY_MODES.WRITTEN_ANSWER]({ payload, card }) {
    const normalize = (v) => String(v || '').trim().toLowerCase();
    return normalize(payload.answer) === normalize(card.back);
  }
};

export async function createSession(user, { deckId, mode, sideFirst, needsReviewOnly }) {
  const access = await getAccessibleDeckLean(user, deckId);
  if (!access)
    throw new HttpError(404, 'Deck not found');

  const cardFilter = { deck: deckId };
  if (needsReviewOnly) {
    const progress = await CardProgress.find({
      user: user.userId,
      status: CARD_STATUS.NEEDS_REVIEW
    }).select('card').lean();
    cardFilter._id = { $in: progress.map((p) => p.card) };
  }

  const cards = await Card.find(cardFilter).sort({ order: 1 }).lean();
  if (!cards.length)
    throw new HttpError(400, needsReviewOnly ? 'No cards marked as Needs Review' : 'Deck has no cards');

  const distractorPool = needsReviewOnly ? await Card.find({ deck: deckId }).select('_id back').lean() : cards;

  const originalCardOrder = cards.map((card) => card._id);
  const resolvedMode = mode || STUDY_MODES.FLIP;
  const resolvedSideFirst = sideFirst || CARD_SIDES.FRONT;

  const persistedQuestions = [];
  const questions = cards.map((card) => {
    const { clientView, persisted } = buildQuestionForMode(resolvedMode, card, distractorPool);
    persistedQuestions.push(persisted);
    return clientView;
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
  if (!session)
    throw new HttpError(404, 'Session not found');

  session.shuffleEnabled = enabled;
  session.currentCardOrder = enabled ? shuffleArray(session.originalCardOrder) : [...session.originalCardOrder];
  await session.save();

  return { shuffleEnabled: session.shuffleEnabled, cardOrder: session.currentCardOrder };
}

export async function submitAnswer(user, sessionId, payload) {
  const session = await StudySession.findOne({ _id: sessionId, user: user.userId });
  if (!session)
    throw new HttpError(404, 'Session not found');

  if (session.mode === STUDY_MODES.FLIP)
    throw new HttpError(400, 'Flip mode does not accept submitted answers');

  const inSession = session.originalCardOrder.some((id) => sameId(id, payload.cardId));
  if (!inSession)
    throw new HttpError(400, 'Card is not part of this session');

  const card = await Card.findById(payload.cardId);
  if (!card || !sameId(card.deck, session.deck))
    throw new HttpError(404, 'Card not found in this session');

  const grader = ANSWER_GRADERS[session.mode];
  if (!grader)
    throw new HttpError(400, 'Unsupported study mode');

  const question = session.questions?.find((q) => sameId(q.cardId, payload.cardId));
  const isCorrect = grader({ question, payload, card });

  const total = session.originalCardOrder.length;
  let progress;
  let completed = false;
  await withTransaction(async (txnSession) => {
    const claimed = await StudySession.findOneAndUpdate(
      { _id: sessionId, user: user.userId, answeredCardIds: { $ne: card._id } },
      { $addToSet: { answeredCardIds: card._id } },
      { returnDocument: 'after', projection: { answeredCardIds: 1, completed: 1 }, session: txnSession }
    );

    if (!claimed)
      throw new HttpError(409, 'Card already answered in this session');

    progress = await CardProgress.findOneAndUpdate(
      { user: user.userId, card: card._id },
      {
        $setOnInsert: { status: CARD_STATUS.STILL_LEARNING },
        $inc: {
          correctCount: isCorrect ? 1 : 0,
          incorrectCount: isCorrect ? 0 : 1
        }
      },
      { upsert: true, returnDocument: 'after', session: txnSession }
    );

    completed = Boolean(claimed.completed);
    if (!completed && total > 0 && (claimed.answeredCardIds?.length || 0) >= total) {
      await StudySession.updateOne(
        { _id: sessionId, completed: false },
        { $set: { completed: true } },
        { session: txnSession }
      );
      completed = true;
    }
  });

  return {
    isCorrect,
    expected: card.back,
    cardProgress: progress,
    completed
  };
}

export async function setCardStatus(user, deckId, cardId, status) {
  const access = await getAccessibleDeckLean(user, deckId);
  if (!access)
    throw new HttpError(404, 'Deck not found');

  const card = await Card.findById(cardId).select('_id deck');
  if (!card || !sameId(card.deck, deckId))
    throw new HttpError(404, 'Card not found');

  return CardProgress.findOneAndUpdate(
    { user: user.userId, card: card._id },
    { $set: { status } },
    { upsert: true, returnDocument: 'after' },
  );
}
