import Deck from '../models/Deck.js';
import Card from '../models/Card.js';
import Assignment from '../models/Assignment.js';
import CardProgress from '../models/CardProgress.js';
import StudySession from '../models/StudySession.js';
import { getAccessibleDeck, getAccessibleDeckLean } from './accessService.js';
import { parseCsv, serializeCsv } from '../utils/csv.js';
import { HttpError } from '../utils/HttpError.js';
import { runInTransaction } from '../utils/transaction.js';
import { deleteManagedImagesForCard, inlineManagedImage, persistInlineImage } from '../utils/cardImages.js';

export async function listUserDecks(userId) {
  const assignments = await Assignment.find({ student: userId }).select('deck');
  const assignedDeckIds = assignments.map((a) => a.deck);

  const decks = await Deck.find({
    $or: [{ owner: userId }, { _id: { $in: assignedDeckIds } }]
  }).lean();

  return decks.map((deck) => {
    const isOwner = String(deck.owner) === String(userId);
    return { ...deck, readOnly: !isOwner, access: isOwner ? 'owner' : 'assigned' };
  });
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
  const access = await getAccessibleDeckLean(user, deckId);
  if (!access) {
    throw new HttpError(404, 'Deck not found');
  }
  const cards = await Card.find({ deck: deckId }).sort({ order: 1 });
  const { _id, title, description, category, tags, createdAt, updatedAt } = access.deck;
  return {
    _id,
    title,
    description,
    category,
    tags,
    createdAt,
    updatedAt,
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
  const access = await getAccessibleDeckLean(user, deckId);
  if (!access) {
    throw new HttpError(404, 'Deck not found');
  }
  if (access.readOnly) {
    throw new HttpError(403, 'Assigned decks are read-only for students');
  }
  // Fetch the image paths before deleting so we can sweep the files afterward.
  const cards = await Card.find({ deck: access.deck._id }).select('_id frontImage backImage');
  const cardIds = cards.map((card) => card._id);
  await runInTransaction(async (session) => {
    const opts = session ? { session } : {};
    await Card.deleteMany({ deck: access.deck._id }, opts);
    await CardProgress.deleteMany({ card: { $in: cardIds } }, opts);
    await Assignment.deleteMany({ deck: access.deck._id }, opts);
    await StudySession.deleteMany({ deck: access.deck._id }, opts);
    await Deck.deleteOne({ _id: access.deck._id }, opts);
  });
  await Promise.allSettled(cards.map(deleteManagedImagesForCard));
}

export async function exportDeck(user, deckId, format) {
  const access = await getAccessibleDeckLean(user, deckId);
  if (!access) {
    throw new HttpError(404, 'Deck not found');
  }
  const cards = await Card.find({ deck: deckId }).sort({ order: 1 }).lean();
  const exportedCards = await Promise.all(cards.map(async (card) => ({
    front: card.front,
    back: card.back,
    frontImage: await inlineManagedImage(card.frontImage || ''),
    backImage: await inlineManagedImage(card.backImage || '')
  })));
  const payload = {
    title: access.deck.title,
    description: access.deck.description,
    category: access.deck.category,
    tags: access.deck.tags,
    cards: exportedCards
  };

  if (format === 'json') {
    return { contentType: 'application/json', body: JSON.stringify(payload, null, 2) };
  }
  if (format === 'csv') {
    const columns = ['deckTitle', 'deckDescription', 'deckCategory', 'deckTags', 'front', 'back', 'frontImage', 'backImage'];
    const rows = payload.cards.map((card) => ({
      deckTitle: payload.title,
      deckDescription: payload.description,
      deckCategory: payload.category,
      deckTags: Array.isArray(payload.tags) ? payload.tags.join('|') : '',
      front: card.front,
      back: card.back,
      frontImage: card.frontImage,
      backImage: card.backImage,
    }));
    return { contentType: 'text/csv', body: serializeCsv(columns, rows) };
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
      const rawTags = rows[0].deckTags || '';
      const tags = rawTags
        .split('|')
        .map((tag) => tag.trim())
        .filter(Boolean);
      data = {
        title: rows[0].deckTitle || 'Imported Deck',
        description: rows[0].deckDescription || '',
        category: rows[0].deckCategory || '',
        tags,
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
  const cards = await Promise.all(data.cards.map(async (card, index) => ({
    owner: userId,
    deck: deck._id,
    front: card.front,
    back: card.back,
    frontImage: await persistInlineImage(card.frontImage || ''),
    backImage: await persistInlineImage(card.backImage || ''),
    order: index
  })));
  await Card.insertMany(cards);
  // Align cardCounter so subsequent createCard reservations don't collide
  // with the order values we just assigned (0..N-1).
  await Deck.updateOne(
    { _id: deck._id },
    { $set: { cardCounter: cards.length } }
  );
  return { deckId: deck._id };
}
