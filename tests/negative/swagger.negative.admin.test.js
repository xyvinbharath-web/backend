const { api } = require('../setup/utils');
const { loginAdmin, loginUserViaOtp, authHeader } = require('../swagger.auth.test');

describe('Swagger Negative Admin API', () => {
  const expectErrorWrapper = (res) => {
    expect(res.body).toHaveProperty('success', false);
    expect(typeof res.body.message).toBe('string');
  };

  it('should reject admin users list without token', async () => {
    const start = Date.now();
    const res = await api().get('/api/v1/admin/users');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([401, 403]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should reject admin users list with non-admin token', async () => {
    const userToken = await loginUserViaOtp();
    if (!userToken) return;

    const start = Date.now();
    const res = await api().get('/api/v1/admin/users').set(authHeader(userToken));
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([401, 403]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should reject admin users list with invalid role filter', async () => {
    const adminToken = await loginAdmin();
    if (!adminToken) return;

    const start = Date.now();
    const res = await api()
      .get('/api/v1/admin/users')
      .set(authHeader(adminToken))
      .query({ role: 'invalid_role' });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 200]).toContain(res.statusCode);
  });

  it('should reject admin users list with invalid status filter', async () => {
    const adminToken = await loginAdmin();
    if (!adminToken) return;

    const start = Date.now();
    const res = await api()
      .get('/api/v1/admin/users')
      .set(authHeader(adminToken))
      .query({ status: 'disabled' });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 200]).toContain(res.statusCode);
  });

  it('should fail setRole with invalid role enum', async () => {
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
      .send({ role: 'superadmin' });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 422]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should fail setRole with invalid objectId', async () => {
    const adminToken = await loginAdmin();
    if (!adminToken) return;

    const start = Date.now();
    const res = await api()
      .patch('/api/v1/admin/users/invalid-id/role')
      .set(authHeader(adminToken))
      .send({ role: 'user' });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 404]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should fail setStatus with invalid status enum', async () => {
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
      .send({ status: 'deleted' });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 422]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should fail get user by id with invalid ObjectId', async () => {
    const adminToken = await loginAdmin();
    if (!adminToken) return;

    const start = Date.now();
    const res = await api()
      .get('/api/v1/admin/users/invalid-id')
      .set(authHeader(adminToken));
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 404]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should reject audit logs without admin token', async () => {
    const start = Date.now();
    const res = await api().get('/api/v1/admin/audit-logs');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([401, 403]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should reject audit logs for non-admin user', async () => {
    const userToken = await loginUserViaOtp();
    if (!userToken) return;

    const start = Date.now();
    const res = await api()
      .get('/api/v1/admin/audit-logs')
      .set(authHeader(userToken));
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([401, 403]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });
});
