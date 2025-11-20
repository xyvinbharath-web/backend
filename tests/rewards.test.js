const request = require('supertest');
const app = require('../server');

describe('Rewards Leaderboard', () => {
  it('GET /api/v1/rewards/leaderboard should return 200 and an array', async () => {
    const res = await request(app).get('/api/v1/rewards/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
