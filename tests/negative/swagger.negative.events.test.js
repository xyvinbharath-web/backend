const { api } = require('../setup/utils');
const { loginAdmin, loginUserViaOtp, authHeader } = require('../swagger.auth.test');

describe('Swagger Negative Events API', () => {
  const expectErrorWrapper = (res) => {
    expect(res.body).toHaveProperty('success', false);
    expect(typeof res.body.message).toBe('string');
  };

  it('should reject event creation without token', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/events').send({
      title: 'No Auth Event',
      startDate: new Date().toISOString(),
      capacity: 10,
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([401, 403]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should reject event creation for normal user (wrong role)', async () => {
    const userToken = await loginUserViaOtp();
    if (!userToken) return;

    const start = Date.now();
    const res = await api()
      .post('/api/v1/events')
      .set(authHeader(userToken))
      .send({
        title: 'User Event',
        startDate: new Date().toISOString(),
        capacity: 10,
      });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([403, 401]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should reject event creation with missing title', async () => {
    const adminToken = await loginAdmin();
    if (!adminToken) return;

    const start = Date.now();
    const res = await api()
      .post('/api/v1/events')
      .set(authHeader(adminToken))
      .send({
        startDate: new Date().toISOString(),
        capacity: 10,
      });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect(res.statusCode).toBe(400);
    expectErrorWrapper(res);
  });

  it('should reject event creation with invalid capacity type', async () => {
    const adminToken = await loginAdmin();
    if (!adminToken) return;

    const start = Date.now();
    const res = await api()
      .post('/api/v1/events')
      .set(authHeader(adminToken))
      .send({
        title: 'Invalid Capacity',
        startDate: new Date().toISOString(),
        capacity: 'many',
      });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect(res.statusCode).toBe(400);
    expectErrorWrapper(res);
  });

  it('should reject get event with invalid id format', async () => {
    const start = Date.now();
    const res = await api().get('/api/v1/events/not-an-id');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 404]).toContain(res.statusCode);
    expect(typeof res.body.success).toBe('boolean');
  });

  it('should allow events list with invalid pagination params but not crash', async () => {
    const start = Date.now();
    const res = await api().get('/api/v1/events').query({ page: 'NaN', limit: -1 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([200, 400]).toContain(res.statusCode);
  });

  it('should reject event booking without token', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/events/someEventId/book');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([401, 404]).toContain(res.statusCode);
    expect(typeof res.body.success).toBe('boolean');
  });

  it('should reject event booking with invalid eventId', async () => {
    const userToken = await loginUserViaOtp();
    if (!userToken) return;

    const start = Date.now();
    const res = await api()
      .post('/api/v1/events/invalid-id/book')
      .set(authHeader(userToken));
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 404]).toContain(res.statusCode);
    expect(typeof res.body.success).toBe('boolean');
  });
});
