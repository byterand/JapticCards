import Deck from '../models/Deck.js';
import Card from '../models/Card.js';
import CardProgress from '../models/CardProgress.js';
import StudySession from '../models/StudySession.js';
import { getAccessibleDeck, getAccessibleDeckLean } from './accessService.js';
import { parseCsv, serializeCsv } from '../utils/csv.js';
import { HttpError } from '../utils/HttpError.js';
import { withTransaction } from '../utils/transaction.js';
import { deleteManagedImagesForCard, inlineManagedImage, persistInlineImage } from '../utils/cardImages.js';
import {
  CONTENT_TYPES,
  EXPORT_FORMATS,
  EXPORT_FORMAT_VALUES
} from '../utils/constants.js';

const CSV_COLUMNS = [
  'deckTitle',
  'deckDescription',
  'deckCategory',
  'deckTags',
  'front',
  'back',
  'frontImage',
  'backImage'
];

const DECK_UPDATABLE_FIELDS = ['title', 'description', 'category', 'tags'];

function parseDeckTagsCell(cell) {
  const raw = (cell || '').trim();
  if (!raw)
    return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed))
      return parsed.filter((t) => typeof t === 'string');
  } catch {
    // fall through
  }

  return [raw];
}

function normalizeTags(tags) {
  if (!Array.isArray(tags))
    return [];

  const seen = new Set();
  const out = [];
  for (const raw of tags) {
    if (typeof raw !== 'string')
      continue;

    const lowered = raw.trim().toLowerCase();
    if (!lowered || seen.has(lowered))
      continue;

    seen.add(lowered);
    out.push(lowered);
  }

  return out;
}

export async function listUserDecks(userId) {
  return Deck.find({ owner: userId }).lean();
}

export async function createDeck(userId, payload) {
  return Deck.create({
    owner: userId,
    title: payload.title,
    description: payload.description || '',
    category: payload.category || '',
    tags: normalizeTags(payload.tags)
  });
}

export async function getDeckWithCards(user, deckId) {
  const access = await getAccessibleDeckLean(user, deckId);
  if (!access)
    throw new HttpError(404, 'Deck not found');

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
    cards
  };
}

export async function updateDeck(user, deckId, updates) {
  const access = await getAccessibleDeck(user, deckId);
  if (!access)
    throw new HttpError(404, 'Deck not found');

  if (updates.tags !== undefined)
    updates = { ...updates, tags: normalizeTags(updates.tags) };

  DECK_UPDATABLE_FIELDS.forEach((field) => {
    if (updates[field] !== undefined)
      access.deck[field] = updates[field];
  });

  await access.deck.save();
  return access.deck;
}

export async function deleteDeck(user, deckId) {
  const access = await getAccessibleDeckLean(user, deckId);
  if (!access)
    throw new HttpError(404, 'Deck not found');

  // Fetch the image paths before deleting so we can sweep the files afterward.
  const cards = await Card.find({ deck: access.deck._id }).select('_id frontImage backImage');
  const cardIds = cards.map((card) => card._id);

  await withTransaction(async (session) => {
    await Card.deleteMany({ deck: access.deck._id }, { session });
    await CardProgress.deleteMany({ card: { $in: cardIds } }, { session });
    await StudySession.deleteMany({ deck: access.deck._id }, { session });
    await Deck.deleteOne({ _id: access.deck._id }, { session });
  });

  await Promise.allSettled(cards.map(deleteManagedImagesForCard));
}

const EXPORT_SERIALIZERS = {
  [EXPORT_FORMATS.JSON](payload) {
    return {
      contentType: CONTENT_TYPES.JSON,
      body: JSON.stringify(payload, null, 2)
    };
  },
  [EXPORT_FORMATS.CSV](payload) {
    const rows = payload.cards.map((card) => ({
      deckTitle: payload.title,
      deckDescription: payload.description,
      deckCategory: payload.category,
      deckTags: Array.isArray(payload.tags) && payload.tags.length ? JSON.stringify(payload.tags) : '',
      front: card.front,
      back: card.back,
      frontImage: card.frontImage,
      backImage: card.backImage
    }));
    return {
      contentType: CONTENT_TYPES.CSV,
      body: serializeCsv(CSV_COLUMNS, rows)
    };
  }
};

export async function exportDeck(user, deckId, format) {
  const serialize = EXPORT_SERIALIZERS[format];
  if (!serialize)
    throw new HttpError(400, 'Unsupported export format. Use json or csv.');

  const access = await getAccessibleDeckLean(user, deckId);
  if (!access)
    throw new HttpError(404, 'Deck not found');

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

  return serialize(payload);
}

// Per-format parsers for import. Each takes the raw content string and returns
// the normalized deck-shaped object { title, description, category, tags, cards[] }.
const IMPORT_PARSERS = {
  [EXPORT_FORMATS.JSON](content) {
    return JSON.parse(content);
  },
  [EXPORT_FORMATS.CSV](content) {
    const rows = parseCsv(content);
    if (!rows.length)
      throw new HttpError(400, 'CSV must include at least one card row');

    const tags = parseDeckTagsCell(rows[0].deckTags);
    return {
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
  }
};

export async function importDeck(userId, { format, content }) {
  if (!format || !content)
    throw new HttpError(400, 'format and content are required');

  if (!EXPORT_FORMAT_VALUES.includes(format))
    throw new HttpError(400, 'Unsupported import format. Use json or csv.');

  let data;
  try {
    data = IMPORT_PARSERS[format](content);
  } catch (err) {
    if (err instanceof HttpError)
      throw err;
    throw new HttpError(400, 'Invalid file content. Could not parse.');
  }

  if (!data?.title?.trim() || !Array.isArray(data.cards) || data.cards.length === 0)
    throw new HttpError(400, 'Imported file must include deck title and at least one card.');

  const trimmedCards = data.cards.map((card) => ({
    ...card,
    front: typeof card.front === 'string' ? card.front.trim() : '',
    back: typeof card.back === 'string' ? card.back.trim() : ''
  }));

  if (trimmedCards.some((card) => !card.front || !card.back))
    throw new HttpError(400, 'Each imported card must include front and back text.');

  const cardDocs = await Promise.all(trimmedCards.map(async (card, index) => ({
    owner: userId,
    front: card.front,
    back: card.back,
    frontImage: await persistInlineImage(card.frontImage || ''),
    backImage: await persistInlineImage(card.backImage || ''),
    order: index
  })));

  const deckId = await withTransaction(async (session) => {
    const [deck] = await Deck.create([{
      owner: userId,
      title: data.title.trim(),
      description: data.description || '',
      category: data.category || '',
      tags: normalizeTags(data.tags),
      cardCounter: cardDocs.length
    }], { session });

    await Card.insertMany(cardDocs.map((c) => ({ ...c, deck: deck._id })), { session });
    return deck._id;
  });

  return { deckId };
}
