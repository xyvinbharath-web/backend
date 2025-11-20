const request = require('supertest');
const Otp = require('../../models/Otp');
const User = require('../../models/User');
const app = require('../../server');

const PHONE = '+1234567890';

describe('OTP E2E flow (phone-based login)', () => {
  it('send-otp success for user', async () => {
    await User.create({
      name: 'OTP User',
      phone: PHONE,
      role: 'user',
      status: 'active',
    });

    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: PHONE });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);

    const otp = await Otp.findOne({ phone: PHONE, purpose: 'login' });
    expect(otp).toBeTruthy();
  });

  it('verify-otp success returns tokens and deletes OTP', async () => {
    await User.create({
      name: 'OTP Login',
      phone: '+1234567891',
      role: 'user',
      status: 'active',
    });

    await request(app).post('/api/v1/auth/send-otp').send({ phone: '+1234567891' });
    const otp = await Otp.findOne({ phone: '+1234567891', purpose: 'login' });
    expect(otp).toBeTruthy();

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+1234567891', code: otp.code });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');

    const remaining = await Otp.find({ phone: '+1234567891', purpose: 'login' });
    expect(remaining.length).toBe(0);
  });

  it('expired OTP returns 400', async () => {
    await User.create({ name: 'Expired', phone: '+1234567892', role: 'user', status: 'active' });
    const expiresAt = new Date(Date.now() - 60 * 1000);
    await Otp.create({
      phone: '+1234567892',
      code: '111111',
      purpose: 'login',
      expiresAt,
    });

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+1234567892', code: '111111' });

    expect(res.status).toBe(400);
  });

  it('wrong code returns 400', async () => {
    await User.create({ name: 'Wrong', phone: '+1234567893', role: 'user', status: 'active' });
    await Otp.create({
      phone: '+1234567893',
      code: '222222',
      purpose: 'login',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+1234567893', code: '999999' });

    expect(res.status).toBe(400);
  });

  it('send-otp twice → only one OTP per phone+purpose', async () => {
    await User.create({ name: 'Multi', phone: '+1234567894', role: 'user', status: 'active' });

    const first = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+1234567894' });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+1234567894' });
    expect(second.status).toBe(200);

    const otps = await Otp.find({ phone: '+1234567894', purpose: 'login' });
    expect(otps.length).toBe(1);
  });
});
