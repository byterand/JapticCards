import { config } from '../config/env.js';

const MAX_ENTRIES = 10_000;
const cache = new Map(); // jti -> insertedAt epoch ms

export function isJtiKnownGood(jti) {
  if (!jti)
    return false;

  const ts = cache.get(jti);
  if (ts === undefined)
    return false;

  const ttlMs = config.jwt.revocationCacheSeconds * 1000;
  if (Date.now() - ts > ttlMs) {
    cache.delete(jti);
    return false;
  }

  return true;
}

export function markJtiGood(jti) {
  if (!jti)
    return;

  if (cache.size >= MAX_ENTRIES) {
    // FIFO: drop the oldest insertion. Map iterates in insertion order.
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined)
      cache.delete(firstKey);
  }

  cache.set(jti, Date.now());
}

export function invalidateJti(jti) {
  if (!jti)
    return;
  cache.delete(jti);
}
