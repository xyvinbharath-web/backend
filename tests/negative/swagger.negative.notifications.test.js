const { api } = require('../setup/utils');
const { loginUserViaOtp, authHeader } = require('../swagger.auth.test');

describe('Swagger Negative Notifications API', () => {
  const expectErrorWrapper = (res) => {
    expect(res.body).toHaveProperty('success', false);
    expect(typeof res.body.message).toBe('string');
  };

  it('should reject notifications list without token', async () => {
    const start = Date.now();
    const res = await api().get('/api/v1/notifications');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect(res.statusCode).toBe(401);
    expectErrorWrapper(res);
  });

  it('should reject mark read without token', async () => {
    const start = Date.now();
    const res = await api().patch('/api/v1/notifications/123/read');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([401, 404]).toContain(res.statusCode);
    expect(typeof res.body.success).toBe('boolean');
  });

  it('should reject mark read-all without token', async () => {
    const start = Date.now();
    const res = await api().patch('/api/v1/notifications/read-all');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect(res.statusCode).toBe(401);
    expectErrorWrapper(res);
  });

  it('should reject mark read with invalid id format', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;

    const start = Date.now();
    const res = await api()
      .patch('/api/v1/notifications/not-an-id/read')
      .set(authHeader(token));
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 404]).toContain(res.statusCode);
    expect(typeof res.body.success).toBe('boolean');
  });

  it('notifications list should handle invalid pagination params', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;

    const start = Date.now();
    const res = await api()
      .get('/api/v1/notifications')
      .set(authHeader(token))
      .query({ page: 'NaN', limit: -10 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([200, 400]).toContain(res.statusCode);
  });
});
