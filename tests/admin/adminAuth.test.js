const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');

describe('Admin auth', () => {
  it('admin successful login returns tokens', async () => {
    await User.create({
      name: 'Admin',
      email: 'admin@test.com',
      phone: '+1000000000',
      password: 'Passw0rd!',
      role: 'admin',
      status: 'active',
    });

    const res = await request(app)
      .post('/api/v1/admin/login')
      .send({ email: 'admin@test.com', password: 'Passw0rd!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  it('wrong password returns 401', async () => {
    await User.create({
      name: 'Admin2',
      email: 'admin2@test.com',
      phone: '+1000000001',
      password: 'Passw0rd!',
      role: 'admin',
      status: 'active',
    });

    const res = await request(app)
      .post('/api/v1/admin/login')
      .send({ email: 'admin2@test.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('non-admin with valid creds returns 403', async () => {
    await User.create({
      name: 'User',
      email: 'user@test.com',
      phone: '+1000000002',
      password: 'Passw0rd!',
      role: 'user',
      status: 'active',
    });

    const res = await request(app)
      .post('/api/v1/admin/login')
      .send({ email: 'user@test.com', password: 'Passw0rd!' });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.message).toBe('Forbidden');
  });
});
