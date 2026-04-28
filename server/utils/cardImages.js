import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  IMAGE_MIME_BY_EXT,
  IMAGE_EXT_BY_MIME,
  MAX_IMAGE_BYTES,
  CARD_UPLOADS_URL_PREFIX,
  UPLOADS_URL_PREFIX
} from './constants.js';

// Anchor to the server/ directory (this file lives in server/utils/), so
// paths resolve the same no matter what cwd the process was started from.
const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPLOADS_ROOT = path.join(SERVER_ROOT, 'uploads');
const CARDS_DIR = path.join(UPLOADS_ROOT, 'cards');

const DATA_URL_RE = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,(.*)$/s;

// Only touch server-hosted uploads
function isManagedUploadPath(value) {
  return typeof value === 'string' && value.startsWith(CARD_UPLOADS_URL_PREFIX) && !value.includes('..');
}

// Resolves a managed-upload URL to its absolute filesystem path, returning
// null if the value isn't managed or the resolved path escapes UPLOADS_ROOT.
function resolveManagedAbsPath(value) {
  if (!isManagedUploadPath(value))
    return null;

  const rel = value.slice(UPLOADS_URL_PREFIX.length); // "cards/<hash>.ext"
  const abs = path.join(UPLOADS_ROOT, rel);
  if (abs !== UPLOADS_ROOT && !abs.startsWith(UPLOADS_ROOT + path.sep))
    return null;

  return abs;
}

export function uploadsRoot() {
  return UPLOADS_ROOT;
}

// Best-effort delete
export async function deleteManagedImage(value) {
  const abs = resolveManagedAbsPath(value);
  if (!abs)
    return;

  try {
    await fs.unlink(abs);
  } catch {
    // ignore
  }
}

export async function deleteManagedImagesForCard(card) {
  if (!card)
    return;

  await Promise.all([
    deleteManagedImage(card.frontImage),
    deleteManagedImage(card.backImage)
  ]);
}

export async function inlineManagedImage(value) {
  if (!isManagedUploadPath(value))
    return value || '';

  const abs = resolveManagedAbsPath(value);
  if (!abs)
    return '';

  const ext = path.extname(abs).toLowerCase();
  const mime = IMAGE_MIME_BY_EXT[ext];
  if (!mime)
    return '';

  try {
    const bytes = await fs.readFile(abs);
    return `data:${mime};base64,${bytes.toString('base64')}`;
  } catch {
    return '';
  }
}

export async function persistInlineImage(value) {
  if (typeof value !== 'string' || !value)
    return '';
  if (value.startsWith('http://') || value.startsWith('https://'))
    return value;
  if (isManagedUploadPath(value))
    return '';

  const match = DATA_URL_RE.exec(value);
  if (!match)
    return '';

  const mime = match[1].toLowerCase();
  const ext = IMAGE_EXT_BY_MIME[mime];
  if (!ext)
    return '';

  let bytes;
  try {
    bytes = Buffer.from(match[2], 'base64');
  } catch {
    return '';
  }

  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES)
    return '';

  await fs.mkdir(CARDS_DIR, { recursive: true });
  const name = crypto.randomBytes(16).toString('hex') + ext;
  await fs.writeFile(path.join(CARDS_DIR, name), bytes);
  return `${CARD_UPLOADS_URL_PREFIX}${name}`;
}