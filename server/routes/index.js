import authRoutes from './auth.js';
import deckRoutes from './decks.js';
import cardRoutes from './cards.js';
import studyRoutes from './study.js';
import teacherRoutes from './teacher.js';

const routes = (app) => {
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/', authRoutes);
  app.use('/', deckRoutes);
  app.use('/', cardRoutes);
  app.use('/', studyRoutes);
  app.use('/', teacherRoutes);
  app.use('*unknown', (req, res) => {
    return res.status(404).json({ error: "Not found" });
  });
};

export default routes;
