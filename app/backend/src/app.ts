import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';

import env from './config/env';
import todosRoutes from './routes/todos.routes';
import healthRoutes from './routes/health.routes';
import metricsRoutes from './routes/metrics.routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { metricsMiddleware } from './middlewares/metrics.middleware';

const app = express();

app.use(
  cors({
    origin: env.corsOrigin,
  })
);

app.use(express.json());

app.use(
  pinoHttp({
    level: env.logLevel,
  })
);

app.use(metricsMiddleware);

app.use(healthRoutes);
app.use(metricsRoutes);

app.use('/api/todos', todosRoutes);

app.get('/api/error', (req, res) => {
  res.status(500).json({
    message: 'Intentional error for incident testing',
  });
});

app.get('/api/slow', async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 3000));

  res.json({
    message: 'Slow response completed',
  });
});

app.use(errorMiddleware);

export default app;
