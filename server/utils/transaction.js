import mongoose from 'mongoose';

let supportsTransactions = null;

async function probeSupport() {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {});
    return true;
  } catch (err) {
    const msg = err?.message || '';
    if (
      err?.codeName === 'IllegalOperation' ||
      err?.code === 20 ||
      /replica set/i.test(msg) ||
      /Transaction numbers/i.test(msg)
    ) {
      return false;
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

export async function runInTransaction(fn) {
  if (supportsTransactions === null) {
    try {
      supportsTransactions = await probeSupport();
    } catch {
      supportsTransactions = false;
    }
  }

  if (!supportsTransactions) {
    return fn(null);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
