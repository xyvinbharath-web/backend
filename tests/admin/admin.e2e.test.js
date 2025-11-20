const request = require('supertest');
const app = require('../../server');

describe('Admin E2E', () => {
  it('updates user role and status and retrieves audit logs', async () => {
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Partner Pending', phone: '+5000000000', role: 'partner' });

    expect(registerRes.status).toBe(201);
    const userId = registerRes.body.data.user._id;

    const roleRes = await request(app)
      .patch(`/api/v1/admin/users/${userId}/role`)
      .set('x-test-role', 'admin')
      .send({ role: 'partner' });
    expect(roleRes.status).toBe(200);
    expect(roleRes.body.data.role).toBe('partner');

    const statusRes = await request(app)
      .patch(`/api/v1/admin/users/${userId}/status`)
      .set('x-test-role', 'admin')
      .send({ status: 'suspended' });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe('suspended');

    const auditRes = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('x-test-role', 'admin');
    expect(auditRes.status).toBe(200);
    expect(auditRes.body).toHaveProperty('data');
    expect(Array.isArray(auditRes.body.data.records)).toBe(true);
  });
});
