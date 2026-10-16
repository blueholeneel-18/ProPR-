const request = require('supertest');

jest.mock('../../src/models/userModel');

const app = require('../../src/app');
const userModel = require('../../src/models/userModel');

describe('Users API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists users', async () => {
    userModel.findAll.mockResolvedValue([{ id: 1, name: 'Ada', role: 'developer' }]);

    const res = await request(app).get('/api/users');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('rejects user creation with an invalid email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Ada', email: 'invalid' });

    expect(res.status).toBe(400);
    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('requires authentication for /api/users/me', async () => {
    const res = await request(app).get('/api/users/me');

    expect(res.status).toBe(401);
  });

  it('returns the current user when authenticated', async () => {
    userModel.findById.mockResolvedValue({ id: 3, name: 'Grace', role: 'admin' });

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer 3');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 3, name: 'Grace' });
  });
});
