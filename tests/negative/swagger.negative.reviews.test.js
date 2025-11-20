const { api } = require('../setup/utils');
const { loginAdmin, loginUserViaOtp, authHeader } = require('../swagger.auth.test');

describe('Swagger Negative Reviews API', () => {
  const expectErrorWrapper = (res) => {
    expect(res.body).toHaveProperty('success', false);
    expect(typeof res.body.message).toBe('string');
  };

  let eventId;

  beforeAll(async () => {
    const adminToken = await loginAdmin();
    if (!adminToken) return;

    const res = await api()
      .post('/api/v1/events')
      .set(authHeader(adminToken))
      .send({
        title: 'Review Negative Event',
        description: 'For negative review tests',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(),
        capacity: 10,
        location: 'Online',
      });

    if (res.statusCode === 201) {
      eventId = res.body.data._id;
    }
  });

  it('should reject review creation without token', async () => {
    if (!eventId) return;

    const start = Date.now();
    const res = await api()
      .post(`/api/v1/events/${eventId}/reviews`)
      .send({ rating: 5, comment: 'No auth' });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([401, 404]).toContain(res.statusCode);
    expect(typeof res.body.success).toBe('boolean');
  });

  it('should reject review creation with missing rating', async () => {
    if (!eventId) return;
    const token = await loginUserViaOtp();
    if (!token) return;

    const start = Date.now();
    const res = await api()
      .post(`/api/v1/events/${eventId}/reviews`)
      .set(authHeader(token))
      .send({ comment: 'Missing rating' });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect(res.statusCode).toBe(400);
    expectErrorWrapper(res);
  });

  it('should reject review creation with invalid rating type', async () => {
    if (!eventId) return;
    const token = await loginUserViaOtp();
    if (!token) return;

    const start = Date.now();
    const res = await api()
      .post(`/api/v1/events/${eventId}/reviews`)
      .set(authHeader(token))
      .send({ rating: 'five' });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect(res.statusCode).toBe(400);
    expectErrorWrapper(res);
  });

  it('should reject review creation for invalid eventId', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;

    const start = Date.now();
    const res = await api()
      .post('/api/v1/events/not-an-id/reviews')
      .set(authHeader(token))
      .send({ rating: 5 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 404]).toContain(res.statusCode);
    expect(typeof res.body.success).toBe('boolean');
  });

  it('should list reviews with invalid pagination parameters but not crash', async () => {
    if (!eventId) return;

    const start = Date.now();
    const res = await api()
      .get(`/api/v1/events/${eventId}/reviews`)
      .query({ page: 'NaN', limit: -10 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([200, 400]).toContain(res.statusCode);
  });
});
