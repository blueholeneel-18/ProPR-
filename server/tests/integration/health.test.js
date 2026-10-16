const request = require('supertest');
const app = require('../../src/app');

describe('GET /api/health', () => {
  it('returns a healthy status payload', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'propr-api' });
    expect(typeof res.body.timestamp).toBe('string');
  });
});

describe('unknown routes', () => {
  it('returns 404 with an error message', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Route not found/);
  });
});
