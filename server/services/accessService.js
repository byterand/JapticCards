import Deck from '../models/Deck.js';

// Owner-only access: returns the deck if the user owns it, null otherwise.
function resolveAccess(user, deck) {
  if (!deck)
    return null;

  if (String(deck.owner) !== String(user.userId))
    return null;

  return { deck };
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