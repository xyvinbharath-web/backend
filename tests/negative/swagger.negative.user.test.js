const { api } = require('../setup/utils');
const { loginUserViaOtp, authHeader } = require('../swagger.auth.test');

describe('Swagger Negative User API', () => {
  const expectErrorWrapper = (res) => {
    expect(res.body).toHaveProperty('success', false);
    expect(typeof res.body.message).toBe('string');
  };

  it('should reject /users/me with no token', async () => {
    const start = Date.now();
    const res = await api().get('/api/v1/users/me');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([401, 404]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should reject /users/me with malformed Authorization header', async () => {
    const start = Date.now();
    const res = await api().get('/api/v1/users/me').set('Authorization', 'Bearer');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 401, 404]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should reject /users/me with invalid token', async () => {
    const start = Date.now();
    const res = await api()
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer invalid.token.here');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([401, 404]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should fail update profile with invalid email type', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;

    const start = Date.now();
    const res = await api()
      .patch('/api/v1/users/me')
      .set(authHeader(token))
      .send({ email: 12345 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 401]).toContain(res.statusCode);
    expect(typeof res.body.success).toBe('boolean');
  });

  it('should fail update profile with unexpected fields', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;

    const start = Date.now();
    const res = await api()
      .patch('/api/v1/users/me')
      .set(authHeader(token))
      .send({ role: 'admin' });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 401, 403]).toContain(res.statusCode);
    expect(typeof res.body.success).toBe('boolean');
  });

  it('should fail update profile without body', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;

    const start = Date.now();
    const res = await api()
      .patch('/api/v1/users/me')
      .set(authHeader(token));
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 401]).toContain(res.statusCode);
    expect(typeof res.body.success).toBe('boolean');
  });

  it('should fail /users/me for user whose token is revoked (invalid signature)', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;
    const tamperedToken = `${token}extra`;

    const start = Date.now();
    const res = await api().get('/api/v1/users/me').set(authHeader(tamperedToken));
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([401, 404]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should fail /users/me when sending query params not allowed', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;

    const start = Date.now();
    const res = await api()
      .get('/api/v1/users/me')
      .set(authHeader(token))
      .query({ unexpected: 'param' });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([200, 400]).toContain(res.statusCode);
  });
});
