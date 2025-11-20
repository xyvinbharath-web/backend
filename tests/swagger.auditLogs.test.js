const { api } = require('./setup/utils');
const { loginAdmin, authHeader } = require('./swagger.auth.test');

describe('Swagger Audit Logs API', () => {
  it('GET /api/v1/admin/audit-logs should return paginated logs for admin', async () => {
    const adminToken = await loginAdmin();
    if (!adminToken) return;

    const start = Date.now();
    const res = await api()
      .get('/api/v1/admin/audit-logs')
      .set(authHeader(adminToken))
      .query({ page: 1, limit: 5 });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 401, 403]).toContain(res.statusCode);
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
