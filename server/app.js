import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index.js';

const app = express();

// Security-related response headers. Defaults are a sensible baseline for a
// JSON API; tighten CSP/etc. here if the server ever serves HTML directly.
app.use(helmet());

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());
routes(app);

export default app;

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  }).catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });
}
