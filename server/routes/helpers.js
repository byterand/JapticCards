import Deck from '../models/Deck.js';
import Assignment from '../models/Assignment.js';

export async function getAccessibleDeck(user, deckId) {
  const deck = await Deck.findById(deckId);
  if (!deck) {
    return null;
  }

  const isOwner = String(deck.owner) === String(user.userId);
  if (isOwner) {
    return { deck, readOnly: false, isOwner: true };
  }

  const assignment = await Assignment.findOne({
    deck: deck._id,
    student: user.userId
  });

  if (!assignment) {
    return null;
  }

  return { deck, readOnly: true, isOwner: false };
}

export function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
