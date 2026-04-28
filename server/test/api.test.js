import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import supertest from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let mongod;
let app;
let request;

async function registerAndLogin(username, password) {
  await request.post('/auth/register').send({ username, password });
  const loginRes = await request.post('/auth/login').send({ username, password });
  return loginRes.body.token;
}

test.before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGO_URI = mongod.getUri();
  ({ default: app } = await import('../app.js'));
  await mongoose.connect(process.env.MONGO_URI);
  request = supertest(app);
});

test.after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

test('auth register/login/me/logout invalidation flow', async () => {
  const username = 'student_one';
  const password = 'Password1!';

  const reg = await request.post('/auth/register').send({ username, password });
  assert.equal(reg.status, 201);

  const dup = await request.post('/auth/register').send({ username, password });
  assert.equal(dup.status, 409);

  const login = await request.post('/auth/login').send({ username, password });
  assert.equal(login.status, 200);
  const token = login.body.token;
  assert.ok(token);

  const me = await request.get('/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.username, username);

  const logout = await request.post('/auth/logout').set('Authorization', `Bearer ${token}`);
  assert.equal(logout.status, 200);

  const rejected = await request.get('/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(rejected.status, 401);
});

test('deck/card CRUD and study basics', async () => {
  const token = await registerAndLogin('owner_one', 'Password1!');
  const auth = { Authorization: `Bearer ${token}` };

  const createdDeck = await request.post('/decks').set(auth).send({
    title: 'Biology',
    description: 'Cells',
    category: 'Science',
    tags: ['bio']
  });
  assert.equal(createdDeck.status, 201);
  const deckId = createdDeck.body._id;

  const createdCard = await request.post(`/decks/${deckId}/cards`).set(auth).send({
    front: 'Mitochondria',
    back: 'Powerhouse'
  });
  assert.equal(createdCard.status, 201);
  const cardId = createdCard.body._id;

  const editedCard = await request.patch(`/decks/${deckId}/cards/${cardId}`).set(auth).send({ back: 'Powerhouse of the cell' });
  assert.equal(editedCard.status, 200);

  const session = await request.post('/study/sessions').set(auth).send({
    deckId,
    mode: 'written_answer',
    sideFirst: 'front'
  });
  assert.equal(session.status, 201);

  const answer = await request.post(`/study/sessions/${session.body.sessionId}/answer`).set(auth).send({
    cardId,
    answer: 'powerhouse of the cell'
  });
  assert.equal(answer.status, 200);
  assert.equal(answer.body.isCorrect, true);

  const markStatus = await request.patch(`/decks/${deckId}/cards/${cardId}/status`).set(auth).send({ status: 'needs_review' });
  assert.equal(markStatus.status, 200);

  const stats = await request.get(`/decks/${deckId}/stats`).set(auth);
  assert.equal(stats.status, 200);
  assert.ok(Array.isArray(stats.body.cardStats));

  const deletedCard = await request.delete(`/decks/${deckId}/cards/${cardId}`).set(auth);
  assert.equal(deletedCard.status, 200);

  const deletedDeck = await request.delete(`/decks/${deckId}`).set(auth);
  assert.equal(deletedDeck.status, 200);
});

test('non-owner cannot read or modify another user\'s deck', async () => {
  const ownerToken = await registerAndLogin('owner_two', 'Password1!');
  const otherToken = await registerAndLogin('other_two', 'Password1!');
  const ownerAuth = { Authorization: `Bearer ${ownerToken}` };
  const otherAuth = { Authorization: `Bearer ${otherToken}` };

  const deck = await request.post('/decks').set(ownerAuth).send({ title: 'Math' });
  const deckId = deck.body._id;

  const fetched = await request.get(`/decks/${deckId}`).set(otherAuth);
  assert.equal(fetched.status, 404);

  const deniedEdit = await request.patch(`/decks/${deckId}`).set(otherAuth).send({ title: 'Try Edit' });
  assert.equal(deniedEdit.status, 404);
});

test('deck import and export support json and csv', async () => {
  const token = await registerAndLogin('import_user', 'Password1!');
  const auth = { Authorization: `Bearer ${token}` };

  const importPayload = {
    title: 'Imported Biology',
    description: 'Imported deck',
    category: 'Science',
    cards: [
      { front: 'Cell', back: 'Basic unit' },
      { front: 'DNA', back: 'Genetic material' }
    ]
  };

  const imported = await request.post('/decks/import').set(auth).send({
    format: 'json',
    content: JSON.stringify(importPayload)
  });
  assert.equal(imported.status, 201);
  const deckId = imported.body.deckId;

  const exportedJson = await request.get(`/decks/${deckId}/export?format=json`).set(auth);
  assert.equal(exportedJson.status, 200);
  assert.ok(exportedJson.text.includes('Imported Biology'));

  const exportedCsv = await request.get(`/decks/${deckId}/export?format=csv`).set(auth);
  assert.equal(exportedCsv.status, 200);
  assert.ok(exportedCsv.text.includes('deckTitle'));
})