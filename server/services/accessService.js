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

// Loads a live Mongoose deck doc. Use on write paths that may mutate and save
// the deck (e.g., updateDeck).
// Returns { deck, readOnly, isOwner } on success,
// or null if neither owner nor assigned student.
export async function getAccessibleDeck(user, deckId) {
  const deck = await Deck.findById(deckId);
  return resolveAccess(user, deck);
}

// Lean variant: loads a plain POJO deck via .lean(). Prefer this on read-only
// paths (export, study session creation, stats, access checks) where the deck
// is never mutated — skips Mongoose hydration for lower overhead.
// Same return shape as getAccessibleDeck, except `deck` is a POJO.
export async function getAccessibleDeckLean(user, deckId) {
  const deck = await Deck.findById(deckId).lean();
  return resolveAccess(user, deck);
}