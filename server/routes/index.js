import authRoutes from './auth.js';
import apiRoutes from './api.js';

const routes = (app) => {
  app.use('/api/', apiRoutes);
  app.use('/', authRoutes);
  app.use('*unknown', (req, res) => {
    return res.status(404).json({ error: "Not found" });
  });
};

export default routes;