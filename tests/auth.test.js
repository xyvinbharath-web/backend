const request = require('supertest');
const app = require('../server');

describe('Auth endpoints', () => {
  it('POST /api/v1/auth/login should 401 for invalid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nouser@example.com', password: 'wrong' });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('success', false);
  });
});
