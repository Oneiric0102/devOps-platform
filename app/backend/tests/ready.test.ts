import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import request from 'supertest';
import app from '../src/app';
import * as healthRoutes from '../src/routes/health.routes';

const healthRoutesModule =
  healthRoutes as typeof import('../src/routes/health.routes');
const originalDependencies = {
  ...healthRoutesModule.healthRouteDependencies,
};

function setReadinessChecks(checks: {
  postgres: () => Promise<boolean>;
  redis: () => Promise<boolean>;
}) {
  healthRoutesModule.healthRouteDependencies.postgres = {
    ...healthRoutesModule.healthRouteDependencies.postgres,
    checkPostgres: checks.postgres,
  };
  healthRoutesModule.healthRouteDependencies.redis = {
    ...healthRoutesModule.healthRouteDependencies.redis,
    checkRedis: checks.redis,
  };
}

describe('Readiness endpoint', () => {
  afterEach(() => {
    healthRoutesModule.healthRouteDependencies.postgres =
      originalDependencies.postgres;
    healthRoutesModule.healthRouteDependencies.redis = originalDependencies.redis;
  });

  test('GET /ready should return ready when dependencies are healthy', async () => {
    setReadinessChecks({
      postgres: async () => true,
      redis: async () => true,
    });

    const response = await request(app).get('/ready');

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.status, 'ready');
    assert.deepEqual(response.body.checks, {
      postgres: 'ok',
      redis: 'ok',
    });
  });

  test('GET /ready should return 503 when a dependency fails', async () => {
    setReadinessChecks({
      postgres: async () => true,
      redis: async () => false,
    });

    const response = await request(app).get('/ready');

    assert.equal(response.statusCode, 503);
    assert.equal(response.body.status, 'not_ready');
    assert.deepEqual(response.body.checks, {
      postgres: 'ok',
      redis: 'fail',
    });
  });
});
