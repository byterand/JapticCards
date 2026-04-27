import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { uploadsRoot } from './utils/cardImages.js';
import { config } from './config/env.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.clientOrigin,
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/uploads', express.static(uploadsRoot(), {
  maxAge: '1d',
  setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
}));

routes(app);

// Must be mounted after routes
app.use(errorHandler);

export default app;
