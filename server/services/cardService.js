import Card from '../models/Card.js';
import Deck from '../models/Deck.js';
import CardProgress from '../models/CardProgress.js';
import { getAccessibleDeckLean } from './accessService.js';
import { HttpError } from '../utils/HttpError.js';
import { deleteManagedImage, deleteManagedImagesForCard } from '../utils/cardImages.js';
import { runInTransaction } from '../utils/transaction.js';

async function getDeck(user, deckId) {
  const accDeckLean = await getAccessibleDeckLean(user, deckId);

  if (!accDeckLean)
    throw new HttpError(404, 'Deck not found');
  if (accDeckLean.readOnly)
    throw new HttpError(403, 'Assigned decks are read-only for students');

  return accDeckLean;
}

async function getCard(cardId, deckId) {
  const card = await Card.findById(cardId);
  if (!card || String(card.deck) !== String(deckId)) {
    throw new HttpError(404, 'Card not found');
  }

  return card;
}

async function reserveNextOrder(deckId) {
  const existing = await Deck.findOne({ _id: deckId }).select('cardCounter').lean();
  if (typeof existing?.cardCounter !== 'number') {
    const initialCount = await Card.countDocuments({ deck: deckId });
    await Deck.updateOne(
      { _id: deckId, cardCounter: { $exists: false } },
      { $set: { cardCounter: initialCount } }
    );
  }
  const reserved = await Deck.findOneAndUpdate(
    { _id: deckId },
    { $inc: { cardCounter: 1 } },
    { new: true, projection: { cardCounter: 1 } }
  );
  if (!reserved) throw new HttpError(404, 'Deck not found');
  return reserved.cardCounter - 1;
}

export async function createCard(user, deckId, payload) {
  await getDeck(user, deckId);

  const order = await reserveNextOrder(deckId);
  return Card.create({
    owner: user.userId,
    deck: deckId,
    order,
    front: payload.front,
    back: payload.back,
    frontImage: payload.frontImage,
    backImage: payload.backImage
  });
}

export async function updateCard(user, deckId, cardId, updates) {
  // Authorize first
  await getDeck(user, deckId);
  const card = await getCard(cardId, deckId);

  // Track images that will be orphaned by this update
  const orphanedImages = [];
  ['front', 'back', 'frontImage', 'backImage'].forEach((field) => {
    if (updates[field] === undefined) return;
    if ((field === 'frontImage' || field === 'backImage') && card[field] && card[field] !== updates[field]) {
      orphanedImages.push(card[field]);
    }
    card[field] = updates[field];
  });
  await card.save();
  await Promise.allSettled(orphanedImages.map(deleteManagedImage));
  return card;
}

export async function deleteCard(user, deckId, cardId) {
  // Authorize first
  await getDeck(user, deckId);
  const card = await getCard(cardId, deckId);
  await runInTransaction(async (session) => {
    const opts = session ? { session } : {};
    await CardProgress.deleteMany({ card: card._id }, opts);
    await Card.deleteOne({ _id: card._id }, opts);
  });
  await Promise.allSettled([deleteManagedImagesForCard(card)]);
}
