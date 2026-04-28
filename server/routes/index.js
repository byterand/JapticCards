import authRoutes from './auth.js';
import deckRoutes from './decks.js';
import studyRoutes from './study.js';
import uploadRoutes from './uploads.js';

const routes = (app) => {
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/auth', authRoutes);
  // All deck-owned resources (cards, card status, stats) are nested under /decks.
  // /study is reserved for session-scoped endpoints (create, shuffle, answer).
  app.use('/decks', deckRoutes);
  app.use('/study', studyRoutes);
  app.use('/cards', uploadRoutes);
  app.use((req, res) => res.status(404).json({ message: 'Not found' }));
};

export default routes;
