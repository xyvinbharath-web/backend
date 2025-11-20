const { api } = require('./setup/utils');
const { loginUserViaOtp, authHeader } = require('./swagger.auth.test');

describe('Swagger Rewards API', () => {
  it('GET /api/v1/rewards should return rewards summary for user', async () => {
    const userToken = await loginUserViaOtp();
    if (!userToken) return;

    const start = Date.now();
    const res = await api().get('/api/v1/rewards').set(authHeader(userToken));
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 401]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.data).toHaveProperty('points');
      expect(Array.isArray(res.body.data.availableRewards)).toBe(true);
    }
  });

  it('POST /api/v1/rewards/redeem should redeem or error', async () => {
    const userToken = await loginUserViaOtp();
    if (!userToken) return;

    const rewardsRes = await api().get('/api/v1/rewards').set(authHeader(userToken));
    if (rewardsRes.statusCode !== 200 || !rewardsRes.body.data.availableRewards.length) return;

    const rewardId = rewardsRes.body.data.availableRewards[0]._id;
    const start = Date.now();
    const res = await api()
      .post('/api/v1/rewards/redeem')
      .set(authHeader(userToken))
      .send({ rewardId });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect([200, 400, 401]).toContain(res.statusCode);
  });
});
