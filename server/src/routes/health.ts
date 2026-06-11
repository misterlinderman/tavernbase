import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

// GET /api/health - Basic health check
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// GET /api/health/detailed - Detailed health check
router.get('/detailed', async (_req: Request, res: Response) => {
  const mongoState = mongoose.connection.readyState;
  const mongoStates: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: {
        status: mongoState === 1 ? 'healthy' : 'unhealthy',
        state: mongoStates[mongoState] || 'unknown',
      },
    },
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
    },
  });
});

export default router;
