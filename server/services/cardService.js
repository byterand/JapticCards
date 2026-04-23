import Card from '../models/Card.js';
import CardProgress from '../models/CardProgress.js';
import { getAccessibleDeckLean } from './accessService.js';
import { HttpError } from '../utils/HttpError.js';

export async function createCard(user, deckId, payload) {
  const access = await getAccessibleDeckLean(user, deckId);
  if (!access) {
    throw new HttpError(404, 'Deck not found');
  }
  if (access.readOnly) {
    throw new HttpError(403, 'Assigned decks are read-only for students');
  }
  const count = await Card.countDocuments({ deck: deckId });
  return Card.create({
    owner: user.userId,
    deck: deckId,
    front: payload.front,
    back: payload.back,
    frontImage: payload.frontImage || '',
    backImage: payload.backImage || '',
    order: count
  });
}

export async function updateCard(user, deckId, cardId, updates) {
  const card = await Card.findById(cardId);
  if (!card || String(card.deck) !== String(deckId)) {
    throw new HttpError(404, 'Card not found');
  }
  const access = await getAccessibleDeckLean(user, card.deck);
  if (!access) {
    throw new HttpError(404, 'Deck not found');
  }
  if (access.readOnly) {
    throw new HttpError(403, 'Assigned decks are read-only for students');
  }
  ['front', 'back', 'frontImage', 'backImage'].forEach((field) => {
    if (updates[field] !== undefined) {
      card[field] = updates[field];
    }
  });
  await card.save();
  return card;
}

export async function deleteCard(user, deckId, cardId) {
  const card = await Card.findById(cardId);
  if (!card || String(card.deck) !== String(deckId)) {
    throw new HttpError(404, 'Card not found');
  }
  const access = await getAccessibleDeckLean(user, card.deck);
  if (!access) {
    throw new HttpError(404, 'Deck not found');
  }
  if (access.readOnly) {
    throw new HttpError(403, 'Assigned decks are read-only for students');
  }
  await CardProgress.deleteMany({ card: card._id });
  await Card.deleteOne({ _id: card._id });
}