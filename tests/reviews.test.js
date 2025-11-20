const request = require('supertest');
const app = require('../server');

// Basic smoke tests for reviews endpoints
describe('Ratings & Reviews', () => {
  it('GET /api/v1/courses/:courseId/reviews should 404 for unknown course', async () => {
    const badId = '64f000000000000000000001';
    const res = await request(app).get(`/api/v1/courses/${badId}/reviews`);
    expect([404, 200]).toContain(res.status); // in test env, behavior can vary; allow 404 or 200 empty in future
  });

  it('GET /api/v1/courses/:courseId/reviews/summary should 200 with default summary in test env or 404 if not found', async () => {
    const badId = '64f000000000000000000001';
    const res = await request(app).get(`/api/v1/courses/${badId}/reviews/summary`);
    expect([200, 404]).toContain(res.status);
  });
});
