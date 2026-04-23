import Card from '../models/Card.js';
import CardProgress from '../models/CardProgress.js';
import { getAccessibleDeckLean } from './accessService.js';
import { HttpError } from '../utils/HttpError.js';

export async function getDeckStats(user, deckId) {
  const access = await getAccessibleDeckLean(user, deckId);
  if (!access) {
    throw new HttpError(404, 'Deck not found');
  }

  const cards = await Card.find({ deck: deckId }).select('_id front back').lean();
  const progress = await CardProgress.find({
    user: user.userId,
    card: { $in: cards.map((c) => c._id) }
  }).lean();
  const progressMap = new Map(progress.map((item) => [String(item.card), item]));

  let correctCount = 0;
  let incorrectCount = 0;
  const cardStats = cards.map((card) => {
    const p = progressMap.get(String(card._id));
    const cardCorrect = p?.correctCount || 0;
    const cardIncorrect = p?.incorrectCount || 0;
    correctCount += cardCorrect;
    incorrectCount += cardIncorrect;
    return {
      cardId: card._id,
      front: card.front,
      correctCount: cardCorrect,
      incorrectCount: cardIncorrect,
      status: p?.status || 'still_learning'
    };
  });

  const cardsStudied = correctCount + incorrectCount;
  return {
    cardsStudied,
    correctCount,
    incorrectCount,
    accuracyRate: cardsStudied ? Number((correctCount / cardsStudied).toFixed(2)) : 0,
    cardStats
  };
}
