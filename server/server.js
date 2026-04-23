import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { validateConfigOrExit, config } from './config/env.js';

validateConfigOrExit();

const PORT = process.env.PORT || 5000;

mongoose.connect(config.mongoUri).then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});
