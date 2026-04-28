import { Router } from 'express';
import { checkPostgres } from '../db/postgres';
import { checkRedis } from '../db/redis';

const router = Router();

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
    checks.postgres = (await checkPostgres()) ? 'ok' : 'fail';
  } catch {
    checks.postgres = 'fail';
  }

  try {
    checks.redis = (await checkRedis()) ? 'ok' : 'fail';
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
