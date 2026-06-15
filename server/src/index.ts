import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

import { loadEstablishmentConfig } from './config/establishment';
import { connectDatabase } from './config/db';
import { ensureSettings } from './services/settings';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import healthRoutes from './routes/health';
import publicRouter from './routes/public';
import adminRouter from './routes/admin';
import contactRouter from './routes/contact';
import submissionsRouter from './routes/submissions';
import captainRouter from './routes/leagues/captain';
import playerRouter from './routes/leagues/player';
import leaguesPublicRouter from './routes/leagues/public';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'https://barryostavern.com',
  'https://www.barryostavern.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

if (process.env.CLIENT_URL) {
  const clientOrigin = normalizeOrigin(process.env.CLIENT_URL);
  if (!allowedOrigins.includes(clientOrigin)) {
    allowedOrigins.push(clientOrigin);
  }
}

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/health', healthRoutes);
app.use('/api', publicRouter);
app.use('/api/contact', contactRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/captain', captainRouter);
app.use('/api/player', playerRouter);
app.use('/api/leagues', leaguesPublicRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async (): Promise<void> => {
  const establishment = loadEstablishmentConfig();
  const licensed = establishment.modules?.leagues;

  if (licensed) {
    console.log(
      `[establishment] League modules: pool=${Boolean(licensed.pool)}, darts=${Boolean(licensed.darts)}, volleyball=${Boolean(licensed.volleyball)}`
    );
  } else {
    console.log('[establishment] No modules.leagues in config — all sports licensed (compat mode)');
  }

  await connectDatabase();
  await ensureSettings();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
