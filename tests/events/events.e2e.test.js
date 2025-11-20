const request = require('supertest');
const app = require('../../server');

describe('Events E2E', () => {
  it('creates and lists events', async () => {
    const createRes = await request(app)
      .post('/api/v1/events')
      .set('x-test-role', 'admin')
      .send({ title: 'Test Event', description: 'E2E', date: new Date().toISOString(), capacity: 10 });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toHaveProperty('success', true);
    const eventId = createRes.body.data._id;

    const listRes = await request(app).get('/api/v1/events');
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.find((e) => e._id === eventId)).toBeDefined();
  });
});
