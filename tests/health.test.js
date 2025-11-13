const request = require('supertest');
const app = require('../server');

describe('Health endpoints', () => {
  it('GET /api/v1/health should return ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
  });
});
