import request from 'supertest';
import app from '../src/app';

describe('Health endpoints', () => {
  test('GET /health should return ok', async () => {
    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('backend');
  });
});
