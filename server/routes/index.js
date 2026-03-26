import authRoutes from './auth.js';

const routes = (app) => {
  app.use('/', authRoutes);
  app.use('*unknown', (req, res) => {
    return res.status(404).json({ error: "Not found" });
  });
};

export default routes;