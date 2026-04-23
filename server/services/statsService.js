import Card from '../models/Card.js';
import CardProgress from '../models/CardProgress.js';
import DeckStat from '../models/DeckStat.js';
import { getAccessibleDeckLean } from './accessService.js';
import { HttpError } from '../utils/HttpError.js';

export async function getDeckStats(user, deckId) {
  const access = await getAccessibleDeckLean(user, deckId);
  if (!access) {
    throw new HttpError(404, 'Deck not found');
  }
  const stats = await DeckStat.findOne({ user: user.userId, deck: deckId }).lean();
  const cards = await Card.find({ deck: deckId }).select('_id front back').lean();
  const progress = await CardProgress.find({
    user: user.userId,
    card: { $in: cards.map((c) => c._id) }
  }).lean();
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
  return {
    cardsStudied,
    correctCount,
    incorrectCount: stats?.incorrectCount || 0,
    accuracyRate: cardsStudied ? Number((correctCount / cardsStudied).toFixed(2)) : 0,
    cardStats
  };
}
