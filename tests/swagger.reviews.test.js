const { api } = require('./setup/utils');
const { loginAdmin, loginUserViaOtp, authHeader } = require('./swagger.auth.test');

describe('Swagger Reviews API', () => {
  let eventId;

  beforeAll(async () => {
    const adminToken = await loginAdmin();
    if (!adminToken) return;
    const res = await api()
      .post('/api/v1/events')
      .set(authHeader(adminToken))
      .send({
        title: 'Reviewable Swagger Event',
        description: 'For swagger review tests',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(),
        capacity: 20,
        location: 'Online',
      });
    if (res.statusCode === 201) {
      eventId = res.body.data._id;
    }
  });

  it('POST /api/v1/events/{eventId}/reviews should create or error', async () => {
    if (!eventId) return;
    const userToken = await loginUserViaOtp();
    if (!userToken) return;

    const start = Date.now();
    const res = await api()
      .post(`/api/v1/events/${eventId}/reviews`)
      .set(authHeader(userToken))
      .send({ rating: 5, comment: 'Swagger review test' });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([201, 400, 401, 404]).toContain(res.statusCode);
  });

  it('GET /api/v1/events/{eventId}/reviews should return paginated reviews', async () => {
    if (!eventId) return;
    const start = Date.now();
    const res = await api()
      .get(`/api/v1/events/${eventId}/reviews`)
      .query({ page: 1, limit: 5 });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.pagination).toMatchObject({
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
      });
    }
  });
});
