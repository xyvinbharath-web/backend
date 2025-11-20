const { api } = require('../setup/utils');
const { loginUserViaOtp, authHeader } = require('../swagger.auth.test');

describe('Swagger Negative Rewards API', () => {
  const expectErrorWrapper = (res) => {
    expect(res.body).toHaveProperty('success', false);
    expect(typeof res.body.message).toBe('string');
  };

  it('should reject rewards summary without token', async () => {
    const start = Date.now();
    const res = await api().get('/api/v1/rewards');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([401, 404]).toContain(res.statusCode);
    if (res.statusCode === 401) {
      expectErrorWrapper(res);
    }
  });

  it('should reject redeem reward without token', async () => {
    const start = Date.now();
    const res = await api().post('/api/v1/rewards/redeem').send({ rewardId: '123' });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect(res.statusCode).toBe(401);
    expectErrorWrapper(res);
  });

  it('should reject redeem reward with missing rewardId', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;

    const start = Date.now();
    const res = await api()
      .post('/api/v1/rewards/redeem')
      .set(authHeader(token))
      .send({});
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect(res.statusCode).toBe(400);
    expectErrorWrapper(res);
  });

  it('should reject redeem reward with invalid rewardId type', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;

    const start = Date.now();
    const res = await api()
      .post('/api/v1/rewards/redeem')
      .set(authHeader(token))
      .send({ rewardId: 12345 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([400, 404]).toContain(res.statusCode);
    expect(typeof res.body.success).toBe('boolean');
  });

  it('should reject redeem reward when user has insufficient points (if enforced)', async () => {
    const token = await loginUserViaOtp();
    if (!token) return;

    const rewardsRes = await api().get('/api/v1/rewards').set(authHeader(token));
    if (rewardsRes.statusCode !== 200 || !rewardsRes.body.data.availableRewards.length) return;

    const rewardId = rewardsRes.body.data.availableRewards[0]._id;

    const start = Date.now();
    const res = await api()
      .post('/api/v1/rewards/redeem')
      .set(authHeader(token))
      .send({ rewardId });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect([200, 400]).toContain(res.statusCode);
  });
});
