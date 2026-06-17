import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import request from 'supertest';
import app from '../src/app';

describe('Health endpoints', () => {
  test('GET /health should return ok', async () => {
    const response = await request(app).get('/health');

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.status, 'ok');
    assert.equal(response.body.service, 'backend');
  });
});
