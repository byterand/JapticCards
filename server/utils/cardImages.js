import fs from 'fs/promises';
import path from 'path';
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
