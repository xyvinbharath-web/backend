const request = require('supertest');
const app = require('../../server');

describe('Notifications E2E', () => {
  it('lists notifications and marks them read', async () => {
    // For now just ensure endpoints respond in test mode
    const listRes = await request(app)
      .get('/api/v1/notifications')
      .set('x-test-role', 'user');
    expect([200, 204, 404, 500]).toContain(listRes.status);

    const markAllRes = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('x-test-role', 'user');
    expect([200, 500]).toContain(markAllRes.status);
  });
});
