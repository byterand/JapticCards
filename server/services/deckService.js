import Deck from '../models/Deck.js';
import Card from '../models/Card.js';
import Assignment from '../models/Assignment.js';
import CardProgress from '../models/CardProgress.js';
import DeckStat from '../models/DeckStat.js';
import StudySession from '../models/StudySession.js';
import { getAccessibleDeck } from './accessService.js';
import { parseCsv } from '../utils/csv.js';
import { HttpError } from '../utils/HttpError.js';

export async function listUserDecks(userId) {
  const ownedDecks = await Deck.find({ owner: userId }).lean();
  const assignments = await Assignment.find({ student: userId }).select('deck');
  const assignedDeckIds = assignments.map((a) => a.deck);
  const assignedDecks = assignedDeckIds.length
    ? await Deck.find({ _id: { $in: assignedDeckIds } }).lean()
    : [];

  const owned = ownedDecks.map((deck) => ({ ...deck, readOnly: false, access: 'owner' }));
  const assigned = assignedDecks.map((deck) => ({ ...deck, readOnly: true, access: 'assigned' }));
  return [...owned, ...assigned];
}

export async function createDeck(userId, payload) {
  return Deck.create({
    owner: userId,
    title: payload.title,
    description: payload.description || '',
    category: payload.category || '',
    tags: payload.tags || []
  });
}

export async function getDeckWithCards(user, deckId) {
  const access = await getAccessibleDeck(user, deckId);
  if (!access) {
    throw new HttpError(404, 'Deck not found');
  }
  const cards = await Card.find({ deck: deckId }).sort({ order: 1 });
  return {
    ...access.deck.toObject(),
    cards,
    readOnly: access.readOnly,
    access: access.readOnly ? 'assigned' : 'owner'
  };
}

export async function updateDeck(user, deckId, updates) {
  const access = await getAccessibleDeck(user, deckId);
  if (!access) {
    throw new HttpError(404, 'Deck not found');
  }
  if (access.readOnly) {
    throw new HttpError(403, 'Assigned decks are read-only for students');
  }
  const fields = ['title', 'description', 'category', 'tags'];
  fields.forEach((field) => {
    if (updates[field] !== undefined) {
      access.deck[field] = updates[field];
    }
  });
  await access.deck.save();
  return access.deck;
}

export async function deleteDeck(user, deckId) {
  const access = await getAccessibleDeck(user, deckId);
  if (!access) {
    throw new HttpError(404, 'Deck not found');
  }
  if (access.readOnly) {
    throw new HttpError(403, 'Assigned decks are read-only for students');
  }
  const cards = await Card.find({ deck: access.deck._id }).select('_id');
  const cardIds = cards.map((card) => card._id);
  await Card.deleteMany({ deck: access.deck._id });
  await CardProgress.deleteMany({ card: { $in: cardIds } });
  await Assignment.deleteMany({ deck: access.deck._id });
  await DeckStat.deleteMany({ deck: access.deck._id });
  await StudySession.deleteMany({ deck: access.deck._id });
  await Deck.deleteOne({ _id: access.deck._id });
}

export async function exportDeck(user, deckId, format) {
  const access = await getAccessibleDeck(user, deckId);
  if (!access) {
    throw new HttpError(404, 'Deck not found');
  }
  const cards = await Card.find({ deck: deckId }).sort({ order: 1 }).lean();
  const payload = {
    title: access.deck.title,
    description: access.deck.description,
    category: access.deck.category,
    tags: access.deck.tags,
    cards: cards.map((card) => ({
      front: card.front,
      back: card.back,
      frontImage: card.frontImage || '',
      backImage: card.backImage || ''
    }))
  };

  if (format === 'json') {
    return { contentType: 'application/json', body: JSON.stringify(payload, null, 2) };
  }
  if (format === 'csv') {
    const header = 'deckTitle,deckDescription,deckCategory,front,back,frontImage,backImage';
    const rows = payload.cards.map((card) => [
      payload.title,
      payload.description,
      payload.category,
      card.front,
      card.back,
      card.frontImage,
      card.backImage
    ].map((value) => `"${String(value || '').replaceAll('"', '""')}"`).join(','));
    return { contentType: 'text/csv', body: [header, ...rows].join('\n') };
  }
  throw new HttpError(400, 'Unsupported export format. Use json or csv.');
}

export async function importDeck(userId, { format, content }) {
  if (!format || !content) {
    throw new HttpError(400, 'format and content are required');
  }

  let data;
  try {
    if (format === 'json') {
      data = JSON.parse(content);
    } else if (format === 'csv') {
      const rows = parseCsv(content);
      if (!rows.length) {
        throw new HttpError(400, 'CSV must include at least one card row');
      }
      data = {
        title: rows[0].deckTitle || 'Imported Deck',
        description: rows[0].deckDescription || '',
        category: rows[0].deckCategory || '',
        cards: rows.map((row) => ({
          front: row.front,
          back: row.back,
          frontImage: row.frontImage || '',
          backImage: row.backImage || ''
        }))
      };
    } else {
      throw new HttpError(400, 'Unsupported import format. Use json or csv.');
    }
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    throw new HttpError(400, 'Invalid file content. Could not parse.');
  }

  if (!data?.title || !Array.isArray(data.cards) || data.cards.length === 0) {
    throw new HttpError(400, 'Imported file must include deck title and at least one card.');
  }
  if (data.cards.some((card) => !card.front || !card.back)) {
    throw new HttpError(400, 'Each imported card must include front and back text.');
  }

  const deck = await Deck.create({
    owner: userId,
    title: data.title,
    description: data.description || '',
    category: data.category || '',
    tags: data.tags || []
  });
  const cards = data.cards.map((card, index) => ({
    owner: userId,
    deck: deck._id,
    front: card.front,
    back: card.back,
    frontImage: card.frontImage || '',
    backImage: card.backImage || '',
    order: index
  }));
  await Card.insertMany(cards);
  return { deckId: deck._id };
}