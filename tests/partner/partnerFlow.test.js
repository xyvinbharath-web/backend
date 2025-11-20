const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const Otp = require('../../models/Otp');

describe('Partner approval and OTP login flow', () => {
  it('registers partner_request, blocks OTP until approval, then allows OTP login', async () => {
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Partner', phone: '+3000000000', role: 'partner' });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.data.user.role).toBe('partner_request');
    expect(registerRes.body.data.user.status).toBe('pending');

    // send-otp blocked for partner_request
    const blocked = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+3000000000' });
    expect(blocked.status).toBe(403);

    const userId = registerRes.body.data.user._id;

    // Admin approves partner
    const approveRes = await request(app)
      .patch(`/api/v1/admin/users/${userId}/role`)
      .set('x-test-role', 'admin')
      .send({ role: 'partner' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.role).toBe('partner');
    expect(approveRes.body.data.status).toBe('active');

    // OTP login works after approval
    const sendRes = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+3000000000' });
    expect(sendRes.status).toBe(200);

    const otp = await Otp.findOne({ phone: '+3000000000', purpose: 'login' });
    expect(otp).toBeTruthy();

    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+3000000000', code: otp.code });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data).toHaveProperty('accessToken');
    expect(verifyRes.body.data).toHaveProperty('refreshToken');
  });
});
