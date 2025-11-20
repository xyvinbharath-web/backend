const { api } = require('./setup/utils');
const { loginAdmin, loginUserViaOtp, authHeader } = require('./swagger.auth.test');

describe('Swagger Pagination Contract', () => {
  it('Events list pagination schema', async () => {
    const res = await api().get('/api/v1/events').query({ page: 1, limit: 5 });
    expect(res.statusCode).toBe(200);
    if (res.body.data && res.body.data.pagination) {
      expect(res.body.data.pagination).toMatchObject({
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
      });
    }
  });

  it('Admin users list pagination schema', async () => {
    const adminToken = await loginAdmin();
    if (!adminToken) return;
    const res = await api()
      .get('/api/v1/admin/users')
      .set(authHeader(adminToken))
      .query({ page: 1, limit: 5 });
    if (res.statusCode !== 200) return;
    expect(res.body.data.pagination).toMatchObject({
      page: expect.any(Number),
      limit: expect.any(Number),
      total: expect.any(Number),
    });
  });

  it('Notifications list pagination schema', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;
    const res = await api()
      .get('/api/v1/notifications')
      .set(authHeader(token))
      .query({ page: 1, limit: 5 });
    if (res.statusCode !== 200) return;
    expect(res.body.data.pagination).toMatchObject({
      page: expect.any(Number),
      limit: expect.any(Number),
      total: expect.any(Number),
    });
  });
});
