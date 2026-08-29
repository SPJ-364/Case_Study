import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(cors({
    origin: (origin, cb) => {
      // allow same-origin / curl / server-to-server requests with no Origin header
      if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }));

  if (env.nodeEnv !== 'test') app.use(morgan('dev'));

  app.get('/', (_req, res) => res.json({
    success: true,
    data: { name: 'Inventory Management System API', version: '1.0.0', docs: '/api/health' },
  }));

  app.use('/api', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
