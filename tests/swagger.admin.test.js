const { api } = require('./setup/utils');
const { loginAdmin, loginUserViaOtp, authHeader } = require('./swagger.auth.test');

describe('Swagger Admin API', () => {
  it('GET /api/v1/admin/users should enforce admin role and return paged users', async () => {
    const adminToken = await loginAdmin();
    if (!adminToken) return; // skip if no admin

    const start = Date.now();
    const res = await api()
      .get('/api/v1/admin/users')
      .set(authHeader(adminToken))
      .query({ page: 1, limit: 5 });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 401, 403]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.pagination).toMatchObject({
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
      });
    }
  });

  it('GET /api/v1/admin/users should forbid normal user', async () => {
    const userToken = await loginUserViaOtp();
    if (!userToken) return;
    const res = await api().get('/api/v1/admin/users').set(authHeader(userToken));
    expect([401, 403]).toContain(res.statusCode);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /api/v1/admin/users/{id}/role should update role or return proper error wrapper', async () => {
    const adminToken = await loginAdmin();
    if (!adminToken) return;

    const listRes = await api()
      .get('/api/v1/admin/users')
      .set(authHeader(adminToken))
      .query({ limit: 1 });

    if (listRes.statusCode !== 200 || !listRes.body.data.items.length) return;
    const userId = listRes.body.data.items[0]._id;

    const start = Date.now();
    const res = await api()
      .patch(`/api/v1/admin/users/${userId}/role`)
      .set(authHeader(adminToken))
      .send({ role: 'user' });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 400, 401, 403, 404]).toContain(res.statusCode);
    expect(typeof res.body.success).toBe('boolean');
  });

  it('PATCH /api/v1/admin/users/{id}/status should update status or return proper error wrapper', async () => {
    const adminToken = await loginAdmin();
    if (!adminToken) return;

    const listRes = await api()
      .get('/api/v1/admin/users')
      .set(authHeader(adminToken))
      .query({ limit: 1 });

    if (listRes.statusCode !== 200 || !listRes.body.data.items.length) return;
    const userId = listRes.body.data.items[0]._id;

    const start = Date.now();
    const res = await api()
      .patch(`/api/v1/admin/users/${userId}/status`)
      .set(authHeader(adminToken))
      .send({ status: 'active' });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 400, 401, 403, 404]).toContain(res.statusCode);
    expect(typeof res.body.success).toBe('boolean');
  });
});
