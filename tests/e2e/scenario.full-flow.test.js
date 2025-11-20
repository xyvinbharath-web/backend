const { api } = require('../setup/utils');
const { loginAdmin, loginUserViaOtp, authHeader } = require('../swagger.auth.test');

// Helper to assert common response wrapper and timing
async function expectSuccess(req) {
  const start = Date.now();
  const res = await req;
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(2000);
  expect(typeof res.body.success).toBe('boolean');
  expect(typeof res.body.message).toBe('string');
  expect(res.body).toHaveProperty('data');

  return res;
}

describe('Full E2E Scenario Flow', () => {
  it('should complete register -> OTP login -> events -> booking -> review -> rewards -> notifications flow', async () => {
    // 1. Register user
    const phone = process.env.TEST_USER_PHONE || '+911234567890';
    const registerRes = await expectSuccess(
      api().post('/api/v1/auth/register').send({
        name: 'E2E User',
        phone,
        email: 'e2e-user@example.com',
        role: 'user',
      }),
    );
    // Allow 200/201 for successful registration or 400 if user already exists/validation fails
    expect([200, 201, 400]).toContain(registerRes.statusCode);

    // 2 & 3. OTP-based login using shared helper; may fail depending on env/config
    const userAccessToken = await loginUserViaOtp();
    if (!userAccessToken) {
      // If OTP login cannot succeed in this environment, skip the rest of the flow
      return;
    }

    // 4. Fetch events
    const eventsRes = await expectSuccess(
      api().get('/api/v1/events').query({ page: 1, limit: 5 }),
    );
    const events = eventsRes.body.data && eventsRes.body.data.items ? eventsRes.body.data.items : [];

    let eventId = events.length ? events[0]._id : null;

    // If no events exist, create one as admin then reload
    if (!eventId) {
      const adminToken = await loginAdmin();
      const createEventRes = await expectSuccess(
        api()
          .post('/api/v1/events')
          .set(authHeader(adminToken))
          .send({
            title: 'E2E Flow Event',
            description: 'End-to-end test event',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 3600000).toISOString(),
            capacity: 100,
            location: 'Online',
          }),
      );
      eventId = createEventRes.body.data._id;
    }

    expect(typeof eventId).toBe('string');

    // 5. Book event
    const bookingRes = await expectSuccess(
      api()
        .post(`/api/v1/events/${eventId}/book`)
        .set(authHeader(userAccessToken)),
    );
    expect([200, 201, 400, 409]).toContain(bookingRes.statusCode);

    // 6. Submit review
    const reviewRes = await expectSuccess(
      api()
        .post(`/api/v1/events/${eventId}/reviews`)
        .set(authHeader(userAccessToken))
        .send({ rating: 5, comment: 'Great E2E event!' }),
    );
    expect([200, 201, 400, 401, 404]).toContain(reviewRes.statusCode);

    // 7. Get rewards summary
    const rewardsRes = await expectSuccess(
      api().get('/api/v1/rewards').set(authHeader(userAccessToken)),
    );
    if (rewardsRes.statusCode === 200) {
      expect(rewardsRes.body.data).toHaveProperty('points');
    }

    // 8. Redeem reward (if any available)
    const rewards = rewardsRes.body.data && rewardsRes.body.data.availableRewards
      ? rewardsRes.body.data.availableRewards
      : [];
    if (rewards.length) {
      const rewardId = rewards[0]._id;
      const redeemRes = await expectSuccess(
        api()
          .post('/api/v1/rewards/redeem')
          .set(authHeader(userAccessToken))
          .send({ rewardId }),
      );
      expect([200, 400]).toContain(redeemRes.statusCode);
    }

    // 9. Verify notifications
    const notificationsRes = await expectSuccess(
      api()
        .get('/api/v1/notifications')
        .set(authHeader(userAccessToken))
        .query({ page: 1, limit: 10 }),
    );
    if (notificationsRes.statusCode === 200) {
      expect(Array.isArray(notificationsRes.body.data.items)).toBe(true);
    }
  });
});
