import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Anchor to the server/ directory (this file lives in server/utils/), so
// paths resolve the same no matter what cwd the process was started from.
const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPLOADS_ROOT = path.join(SERVER_ROOT, 'uploads');

// Only touch server-hosted uploads
function isManagedUploadPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/uploads/cards/')) return false;
  return !value.includes('..');
}

export function serverRoot() {
  return SERVER_ROOT;
}

export function uploadsRoot() {
  return UPLOADS_ROOT;
}

// Best-effort delete
export async function deleteManagedImage(value) {
  if (!isManagedUploadPath(value)) return;
  const rel = value.replace(/^\/uploads\//, ''); // "cards/<hash>.ext"
  const abs = path.join(UPLOADS_ROOT, rel);
  // confirm the resolved path is still inside UPLOADS_ROOT.
  if (!abs.startsWith(UPLOADS_ROOT + path.sep) && abs !== UPLOADS_ROOT) return;
  try {
    await fs.unlink(abs);
  } catch {
    // ignore
  }
}

export async function deleteManagedImagesForCard(card) {
  if (!card) return;
  await Promise.all([
    deleteManagedImage(card.frontImage),
    deleteManagedImage(card.backImage)
  ]);
}

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};
const EXT_BY_MIME = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif'
};
const MAX_INLINE_BYTES = 5 * 1024 * 1024;

export async function inlineManagedImage(value) {
  if (!isManagedUploadPath(value))
    return value || '';

  const rel = value.replace(/^\/uploads\//, '');
  const abs = path.join(UPLOADS_ROOT, rel);
  if (!abs.startsWith(UPLOADS_ROOT + path.sep) && abs !== UPLOADS_ROOT)
    return '';

  const ext = path.extname(abs).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) return '';
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

  const match = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,(.*)$/s.exec(value);
  if (!match)
    return '';

  const mime = match[1].toLowerCase();
  const ext = EXT_BY_MIME[mime];
  if (!ext)
    return '';

  let bytes;
  try {
    bytes = Buffer.from(match[2], 'base64');
  } catch {
    return '';
  }

  if (!bytes.length || bytes.length > MAX_INLINE_BYTES)
    return '';

  const cardsDir = path.join(UPLOADS_ROOT, 'cards');
  await fs.mkdir(cardsDir, { recursive: true });
  const name = crypto.randomBytes(16).toString('hex') + ext;
  await fs.writeFile(path.join(cardsDir, name), bytes);
  return `/uploads/cards/${name}`;
}