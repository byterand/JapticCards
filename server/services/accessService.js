import Deck from '../models/Deck.js';
import Assignment from '../models/Assignment.js';

// Resolves access given an already-loaded deck (hydrated doc or POJO).
async function resolveAccess(user, deck) {
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
  }).select('_id').lean();

  if (!assignment) {
    return null;
  }

  return { deck, readOnly: true, isOwner: false };
}

// Loads a live Mongoose deck doc. Use on write paths that may mutate and save the deck
export async function getAccessibleDeck(user, deckId) {
  const deck = await Deck.findById(deckId);
  return resolveAccess(user, deck);
}

// Prefer this on read-only
export async function getAccessibleDeckLean(user, deckId) {
  const deck = await Deck.findById(deckId).lean();
  return resolveAccess(user, deck);
}