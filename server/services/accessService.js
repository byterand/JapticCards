import Deck from '../models/Deck.js';
import Assignment from '../models/Assignment.js';

// Resolves whether the user can see/modify a given deck.
// Returns { deck, readOnly, isOwner } on success,
// or null if neither owner nor assigned student.
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