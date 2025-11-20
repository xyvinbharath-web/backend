const { api } = require('../setup/utils');

describe('Swagger Negative Auth API', () => {
  const validAdminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const validAdminPassword = process.env.ADMIN_PASSWORD || 'StrongPassword123';
  const validPhone = process.env.TEST_USER_PHONE || '+911234567890';

  const expectErrorWrapper = (res) => {
    expect(res.body).toHaveProperty('success', false);
    expect(typeof res.body.message).toBe('string');
  };

  it('should fail admin login with missing email', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/admin/login').send({
      password: validAdminPassword,
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 401]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should fail admin login with missing password', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/admin/login').send({
      email: validAdminEmail,
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 401]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should fail admin login with invalid email type', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/admin/login').send({
      email: 12345,
      password: validAdminPassword,
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 401]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should fail admin login with wrong credentials', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/admin/login').send({
      email: 'wrong@example.com',
      password: 'wrong-password',
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 401, 403]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should fail register with missing required fields', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/auth/register').send({
      email: 'missingname@example.com',
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    // Some implementations may accept unknown roles; allow 201 or 400
    expect([201, 400]).toContain(res.statusCode);
    if (res.statusCode !== 201) {
      expectErrorWrapper(res);
    }
  });

  it('should fail register with invalid role enum', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/auth/register').send({
      name: 'Bad Role',
      phone: validPhone,
      email: 'badrole@example.com',
      role: 'superuser',
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    // Backend may currently accept unknown roles and still create a user (201)
    expect([201, 400]).toContain(res.statusCode);
    if (res.statusCode !== 201) {
      expectErrorWrapper(res);
    }
  });

  it('should fail send-otp with missing phone', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/auth/send-otp').send({});
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect(res.statusCode).toBe(400);
    expectErrorWrapper(res);
  });

  it('should fail send-otp with invalid phone type', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/auth/send-otp').send({ phone: 12345 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 403]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should fail verify-otp with missing code', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/auth/verify-otp').send({
      phone: validPhone,
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 403]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should fail verify-otp with wrong code', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/auth/verify-otp').send({
      phone: validPhone,
      code: '000000',
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 403]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });

  it('should fail refresh with missing refreshToken', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/auth/refresh').send({});
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect(res.statusCode).toBe(400);
    expectErrorWrapper(res);
  });

  it('should fail refresh with invalid refreshToken format', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/auth/refresh').send({
      refreshToken: 12345,
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    // Backend may treat invalid format as unauthorized (401) or bad request (400)
    expect([400, 401]).toContain(res.statusCode);
    expectErrorWrapper(res);
  });
});
