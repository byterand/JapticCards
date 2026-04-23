import authRoutes from './auth.js';
import deckRoutes from './decks.js';
import cardRoutes from './cards.js';
import studyRoutes from './study.js';
import statsRoutes from './stats.js';
import teacherRoutes from './teacher.js';

const routes = (app) => {
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/auth', authRoutes);
  app.use('/decks', deckRoutes);
  app.use('/cards', cardRoutes);
  app.use('/study', studyRoutes);
  app.use('/stats', statsRoutes);
  app.use('/teacher', teacherRoutes);
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
};

export default routes;