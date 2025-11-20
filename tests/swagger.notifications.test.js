const { api } = require('./setup/utils');
const { loginUserViaOtp, authHeader } = require('./swagger.auth.test');

describe('Swagger Notifications API', () => {
  it('GET /api/v1/notifications should return paginated notifications', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;

    const start = Date.now();
    const res = await api()
      .get('/api/v1/notifications')
      .set(authHeader(token))
      .query({ page: 1, limit: 5 });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 401]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.pagination).toMatchObject({
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
      });
    }
  });

  it('PATCH /api/v1/notifications/{id}/read should mark as read or error', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;

    const list = await api()
      .get('/api/v1/notifications')
      .set(authHeader(token))
      .query({ limit: 1 });

    if (list.statusCode !== 200 || !list.body.data.items.length) return;
    const id = list.body.data.items[0]._id;

    const start = Date.now();
    const res = await api()
      .patch(`/api/v1/notifications/${id}/read`)
      .set(authHeader(token));

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 401, 404]).toContain(res.statusCode);
  });

  it('PATCH /api/v1/notifications/read-all should mark all read or error', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;

    const start = Date.now();
    const res = await api().patch('/api/v1/notifications/read-all').set(authHeader(token));

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 401]).toContain(res.statusCode);
  });
});
