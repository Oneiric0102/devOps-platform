import { Router } from 'express';
import * as postgres from '../db/postgres';
import * as redis from '../db/redis';

const router = Router();

export const healthRouteDependencies = {
  postgres,
  redis,
};

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'backend',
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (req, res) => {
  const checks = {
    postgres: 'unknown',
    redis: 'unknown',
  };

  try {
    checks.postgres = (await healthRouteDependencies.postgres.checkPostgres())
      ? 'ok'
      : 'fail';
  } catch {
    checks.postgres = 'fail';
  }

  try {
    checks.redis = (await healthRouteDependencies.redis.checkRedis())
      ? 'ok'
      : 'fail';
  } catch {
    checks.redis = 'fail';
  }

  const isReady = checks.postgres === 'ok' && checks.redis === 'ok';

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
