const request = require('supertest');
const app = require('../server');

describe('Users endpoints', () => {
  it('GET /api/v1/users/profile should 401 without token', async () => {
    const res = await request(app).get('/api/v1/users/profile');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('success', false);
  });
});
