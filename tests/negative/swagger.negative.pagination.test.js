const { api } = require('../setup/utils');
const { loginAdmin, loginUserViaOtp, authHeader } = require('../swagger.auth.test');

describe('Swagger Negative Pagination API', () => {
  const invalidPages = [0, -1, 'NaN', null];
  const invalidLimits = [0, -5, 1000, 'NaN'];

  it('should handle invalid pagination on /events', async () => {
    for (const page of invalidPages) {
      for (const limit of invalidLimits) {
        const start = Date.now();
        const res = await api().get('/api/v1/events').query({ page, limit });
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(2000);
        expect([200, 400]).toContain(res.statusCode);
      }
    }
  });

  it('should handle invalid pagination on admin users list', async () => {
    const token = await loginAdmin();
    if (!token) return;

    const start = Date.now();
    const res = await api()
      .get('/api/v1/admin/users')
      .set(authHeader(token))
      .query({ page: 'NaN', limit: -1 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([200, 400]).toContain(res.statusCode);
  });

  it('should handle invalid pagination on notifications list', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;

    const start = Date.now();
    const res = await api()
      .get('/api/v1/notifications')
      .set(authHeader(token))
      .query({ page: 0, limit: 0 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([200, 400]).toContain(res.statusCode);
  });

  it('should handle invalid pagination on reviews list', async () => {
    const start = Date.now();
    const res = await api()
      .get('/api/v1/events/not-an-id/reviews')
      .query({ page: 'NaN', limit: -1 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 404]).toContain(res.statusCode);
  });
});
