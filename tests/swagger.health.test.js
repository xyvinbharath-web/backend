const { api } = require('./setup/utils');

describe('Swagger Health API', () => {
  it('GET /api/v1/health should return service status wrapper quickly', async () => {
    const start = Date.now();
    const res = await api().get('/api/v1/health');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: expect.any(String),
      data: {
        status: expect.any(String),
        db: expect.any(String),
      },
    });
  });
});
