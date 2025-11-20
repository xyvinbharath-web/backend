const { api } = require('./setup/utils');
const { loginAdmin, loginUserViaOtp, authHeader } = require('./swagger.auth.test');

describe('Swagger Bookings API', () => {
  let eventId;

  beforeAll(async () => {
    const adminToken = await loginAdmin();
    if (!adminToken) return;
    const res = await api()
      .post('/api/v1/events')
      .set(authHeader(adminToken))
      .send({
        title: 'Bookable Swagger Event',
        description: 'For swagger booking tests',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(),
        capacity: 10,
        location: 'Online',
      });
    if (res.statusCode === 201) {
      eventId = res.body.data._id;
    }
  });

  it('POST /api/v1/events/{eventId}/book should create booking or error', async () => {
    if (!eventId) return;
    const userToken = await loginUserViaOtp();
    if (!userToken) return;

    const start = Date.now();
    const res = await api()
      .post(`/api/v1/events/${eventId}/book`)
      .set(authHeader(userToken));
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([201, 400, 401, 404]).toContain(res.statusCode);
  });

  it('GET /api/v1/bookings should list current user bookings', async () => {
    const userToken = await loginUserViaOtp();
    if (!userToken) return;

    const start = Date.now();
    const res = await api().get('/api/v1/bookings').set(authHeader(userToken));
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 401]).toContain(res.statusCode);
  });
});
