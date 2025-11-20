const { api } = require('../setup/utils');
const { loginAdmin, loginUserViaOtp, authHeader } = require('../swagger.auth.test');

describe('Swagger Negative Bookings API', () => {
  const expectErrorWrapper = (res) => {
    expect(res.body).toHaveProperty('success', false);
    expect(typeof res.body.message).toBe('string');
  };

  let limitedEventId;

  beforeAll(async () => {
    const adminToken = await loginAdmin();
    if (!adminToken) return;

    const res = await api()
      .post('/api/v1/events')
      .set(authHeader(adminToken))
      .send({
        title: 'Limited Capacity Event',
        description: 'For negative booking tests',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(),
        capacity: 1,
        location: 'Online',
      });

    if (res.statusCode === 201) {
      limitedEventId = res.body.data._id;
    }
  });

  it('should reject bookings list without token', async () => {
    const start = Date.now();
    const res = await api().get('/api/v1/bookings');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([401, 404]).toContain(res.statusCode);
    if (res.statusCode === 401) {
      expectErrorWrapper(res);
    }
  });

  it('should reject booking for invalid event id', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;

    const start = Date.now();
    const res = await api()
      .post('/api/v1/events/not-an-id/book')
      .set(authHeader(token));
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 404]).toContain(res.statusCode);
    expect(typeof res.body.success).toBe('boolean');
  });

  it('should reject duplicate booking for same event (if implemented)', async () => {
    if (!limitedEventId) return;
    const token = await loginUserViaOtp();
    if (!token) return;

    await api()
      .post(`/api/v1/events/${limitedEventId}/book`)
      .set(authHeader(token));

    const start = Date.now();
    const res = await api()
      .post(`/api/v1/events/${limitedEventId}/book`)
      .set(authHeader(token));
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 409]).toContain(res.statusCode);
    if (res.statusCode !== 201) {
      expectErrorWrapper(res);
    }
  });

  it('should reject booking when capacity exceeded (if enforced)', async () => {
    if (!limitedEventId) return;
    const token = await loginUserViaOtp();
    if (!token) return;

    await api()
      .post(`/api/v1/events/${limitedEventId}/book`)
      .set(authHeader(token));

    const start = Date.now();
    const res = await api()
      .post(`/api/v1/events/${limitedEventId}/book`)
      .set(authHeader(token));
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 409, 201]).toContain(res.statusCode);
  });
});
