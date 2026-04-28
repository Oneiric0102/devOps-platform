import type { NextFunction, Request, Response } from 'express';
import client from 'prom-client';

client.collectDefaultMetrics();

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5],
});

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const end = httpRequestDurationSeconds.startTimer();

  res.on('finish', () => {
    end({
      method: req.method,
      route: req.route?.path ?? req.path,
      status_code: res.statusCode,
    });
  });

  next();
}

export { client };
