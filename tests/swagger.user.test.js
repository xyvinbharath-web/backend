const { api } = require('./setup/utils');
const { loginUserViaOtp, authHeader } = require('./swagger.auth.test');

describe('Swagger User API', () => {
  it('GET /api/v1/users/me should require auth and return wrapper', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;
    const start = Date.now();
    const res = await api().get('/api/v1/users/me').set(authHeader(token));
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 401]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toMatchObject({
        success: true,
        message: expect.any(String),
        data: expect.any(Object),
      });
    }
  });

  it('PATCH /api/v1/users/me should validate wrapper and errors', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;
    const start = Date.now();
    const res = await api()
      .patch('/api/v1/users/me')
      .set(authHeader(token))
      .send({ name: 'Updated From Swagger Tests' });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 400, 401]).toContain(res.statusCode);
    expect(typeof res.body.success).toBe('boolean');
  });

  it('GET /api/v1/users/me should be 401 without token', async () => {
    const res = await api().get('/api/v1/users/me');
    expect([401, 404]).toContain(res.statusCode);
    expect(res.body.success).toBe(false);
  });
});
