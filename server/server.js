import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { validateConfigOrExit, config } from './config/env.js';

validateConfigOrExit();

mongoose.connect(config.mongoUri).then(async () => {
  console.log('MongoDB connected');
  const info = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!info.setName && info.msg !== 'isdbgrid') {
    console.error('MongoDB transactions are required. Run mongod as a replica set; see README.');
    process.exit(1);
  }
  app.listen(config.port, () => console.log(`Server running on http://localhost:${config.port}`));
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});
