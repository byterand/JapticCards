import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { validateConfigOrExit, config } from './config/env.js';

validateConfigOrExit();

mongoose.connect(config.mongoUri).then(() => {
  console.log('MongoDB connected');
  app.listen(config.port, () => console.log(`Server running on http://localhost:${config.port}`));
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});
