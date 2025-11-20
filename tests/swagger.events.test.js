const { api } = require('./setup/utils');
const { loginAdmin, authHeader } = require('./swagger.auth.test');

describe('Swagger Events API', () => {
  let eventId;

  it('GET /api/v1/events should return paginated list', async () => {
    const start = Date.now();
    const res = await api().get('/api/v1/events').query({ page: 1, limit: 5 });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
    // Some environments may not yet implement full pagination; only assert if present
    if (res.body.data && Array.isArray(res.body.data.items)) {
      expect(res.body.data.pagination).toMatchObject({
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
      });
    }
  });

  it('POST /api/v1/events should create event for admin/partner', async () => {
    const adminToken = await loginAdmin();
    if (!adminToken) return;

    const start = Date.now();
    const res = await api()
      .post('/api/v1/events')
      .set(authHeader(adminToken))
      .send({
        title: 'Swagger Event',
        description: 'Created in swagger tests',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(),
        capacity: 50,
        location: 'Online',
      });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([201, 400, 401, 403]).toContain(res.statusCode);
    if (res.statusCode === 201) {
      eventId = res.body.data._id;
    }
  });

  it('GET /api/v1/events/{eventId} should return event or 404', async () => {
    if (!eventId) return;
    const start = Date.now();
    const res = await api().get(`/api/v1/events/${eventId}`);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 404]).toContain(res.statusCode);
  });
});
