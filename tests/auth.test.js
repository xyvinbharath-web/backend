const request = require('supertest');
const app = require('../server');

describe('Auth endpoints', () => {
  it('POST /api/v1/auth/send-otp returns 400 for unknown phone', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+9999999999' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
  });
});
