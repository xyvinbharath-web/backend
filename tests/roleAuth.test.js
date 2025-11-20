const request = require('supertest');
const app = require('../server');

describe('Role-based onboarding', () => {
  it('register with role=partner creates partner_request with pendingApproval', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Partner Pending', phone: '+6000000000', role: 'partner' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('pendingApproval', true);
    expect(res.body.data.user).toHaveProperty('role', 'partner_request');
  });

  it('send-otp blocks partner_request with 403', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Partner Pending2', phone: '+6000000001', role: 'partner' });

    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+6000000001' });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message', 'Partner account awaiting admin approval');
  });

  it('admin approves partner_request via role update', async () => {
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Partner To Approve', phone: '+6000000002', role: 'partner' });

    const userId = registerRes.body.data.user._id;

    const res = await request(app)
      .patch(`/api/v1/admin/users/${userId}/role`)
      .set('x-test-role', 'admin')
      .send({ role: 'partner' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('role', 'partner');
    expect(res.body.data).toHaveProperty('status', 'active');
  });

  it('admin sets user status to suspended', async () => {
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'User To Suspend', phone: '+6000000003', role: 'user' });

    const userId = registerRes.body.data.user._id;

    const res = await request(app)
      .patch(`/api/v1/admin/users/${userId}/status`)
      .set('x-test-role', 'admin')
      .send({ status: 'suspended' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('status', 'suspended');
  });
});
