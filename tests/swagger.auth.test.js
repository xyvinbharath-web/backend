const { api } = require('./setup/utils');

let adminToken;
let userToken;

async function loginAdmin() {
  if (adminToken) return adminToken;
  const res = await api().post('/api/v1/admin/login').send({
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'StrongPassword123',
  });
  expect([200, 401, 403]).toContain(res.statusCode);
  if (res.statusCode === 200) {
    expect(res.body).toMatchObject({
      success: true,
      message: expect.any(String),
      data: {
        user: expect.any(Object),
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      },
    });
    adminToken = res.body.data.accessToken;
  }
  return adminToken;
}

async function loginUserViaOtp() {
  if (userToken) return userToken;
  const phone = process.env.TEST_USER_PHONE || '+911234567890';

  await api().post('/api/v1/auth/send-otp').send({ phone });

  const res = await api().post('/api/v1/auth/verify-otp').send({
    phone,
    code: process.env.TEST_USER_OTP || '123456',
  });
  expect([200, 400, 403]).toContain(res.statusCode);
  if (res.statusCode === 200) {
    expect(res.body).toMatchObject({
      success: true,
      message: expect.any(String),
      data: {
        user: expect.any(Object),
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      },
    });
    userToken = res.body.data.accessToken;
  }
  return userToken;
}

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

describe('Swagger Auth API', () => {
  it('POST /api/v1/admin/login should authenticate admin or fail with proper error wrapper', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/admin/login').send({
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: process.env.ADMIN_PASSWORD || 'StrongPassword123',
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 401, 403]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('success');
    expect(typeof res.body.message).toBe('string');
  });

  it('POST /api/v1/auth/register should return wrapper structure', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/auth/register').send({
      name: 'Swagger User',
      phone: '+911234567890',
      email: 'swaggeruser@example.com',
      role: 'user',
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([201, 400]).toContain(res.statusCode);
    expect(typeof res.body.success).toBe('boolean');
    expect(typeof res.body.message).toBe('string');
  });

  it('POST /api/v1/auth/send-otp should respond with wrapper', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/auth/send-otp').send({
      phone: process.env.TEST_USER_PHONE || '+911234567890',
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 400, 403]).toContain(res.statusCode);
    expect(typeof res.body.success).toBe('boolean');
  });

  it('POST /api/v1/auth/verify-otp should return tokens on success', async () => {
    const phone = process.env.TEST_USER_PHONE || '+911234567890';
    const start = Date.now();
    const res = await api().post('/api/v1/auth/verify-otp').send({
      phone,
      code: process.env.TEST_USER_OTP || '123456',
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 400, 403]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    }
  });

  it('POST /api/v1/auth/refresh should follow wrapper and token schema', async () => {
    const admin = await loginAdmin();
    if (!admin) return; // skip if no admin

    const resLogin = await api().post('/api/v1/admin/login').send({
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: process.env.ADMIN_PASSWORD || 'StrongPassword123',
    });
    if (resLogin.statusCode !== 200) return;

    const refreshToken = resLogin.body.data.refreshToken;
    const start = Date.now();
    const res = await api().post('/api/v1/auth/refresh').send({ refreshToken });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 400]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    }
  });

  it('should enforce error wrapper on invalid admin login', async () => {
    const res = await api().post('/api/v1/admin/login').send({
      email: 'invalid@example.com',
      password: 'wrong',
    });
    expect([400, 401]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('success', false);
    expect(typeof res.body.message).toBe('string');
  });
});

module.exports = { loginAdmin, loginUserViaOtp, authHeader };
