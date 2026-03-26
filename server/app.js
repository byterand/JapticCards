import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import routes from './routes/index.js';

const app = express();
app.use(express.json());
routes(app);

export default app;

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  }).catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });
}
