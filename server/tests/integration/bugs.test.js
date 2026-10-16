const request = require('supertest');

jest.mock('../../src/models/bugModel');

const app = require('../../src/app');
const bugModel = require('../../src/models/bugModel');

describe('Bugs API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/bugs', () => {
    it('returns a list of bugs', async () => {
      const bugs = [
        { id: 1, title: 'Login fails', status: 'open', priority: 'high' },
        { id: 2, title: 'Typo on dashboard', status: 'assigned', priority: 'low' },
      ];
      bugModel.findAll.mockResolvedValue(bugs);

      const res = await request(app).get('/api/bugs');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(bugModel.findAll).toHaveBeenCalledWith({
        status: undefined,
        priority: undefined,
        severity: undefined,
        assigned_to: undefined,
        search: undefined,
      });
    });
  });

  describe('POST /api/bugs', () => {
    it('creates a bug and returns 201', async () => {
      const created = { id: 5, title: 'New crash', status: 'open' };
      bugModel.create.mockResolvedValue(created);

      const res = await request(app)
        .post('/api/bugs')
        .send({ title: 'New crash', priority: 'high' });

      expect(res.status).toBe(201);
      expect(res.body.data).toEqual(created);
    });

    it('rejects an invalid payload with 400', async () => {
      const res = await request(app).post('/api/bugs').send({ priority: 'high' });

      expect(res.status).toBe(400);
      expect(bugModel.create).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/bugs/:id/assign', () => {
    it('assigns a bug to a user', async () => {
      const assigned = { id: 1, title: 'Login fails', assigned_to: 7, status: 'assigned' };
      bugModel.assign.mockResolvedValue(assigned);

      const res = await request(app).patch('/api/bugs/1/assign').send({ assigned_to: 7 });

      expect(res.status).toBe(200);
      expect(res.body.data.assigned_to).toBe(7);
      expect(bugModel.assign).toHaveBeenCalledWith('1', 7);
    });

    it('returns 400 when assigned_to is missing', async () => {
      const res = await request(app).patch('/api/bugs/1/assign').send({});

      expect(res.status).toBe(400);
      expect(bugModel.assign).not.toHaveBeenCalled();
    });

    it('returns 404 when the bug does not exist', async () => {
      bugModel.assign.mockResolvedValue(null);

      const res = await request(app).patch('/api/bugs/999/assign').send({ assigned_to: 2 });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/bugs/:id', () => {
    it('returns a single bug with comments', async () => {
      bugModel.findById.mockResolvedValue({ id: 1, title: 'Login fails' });
      bugModel.findComments.mockResolvedValue([{ id: 1, message: 'Looking into it' }]);

      const res = await request(app).get('/api/bugs/1');

      expect(res.status).toBe(200);
      expect(res.body.data.comments).toHaveLength(1);
    });

    it('returns 404 for an unknown bug', async () => {
      bugModel.findById.mockResolvedValue(null);

      const res = await request(app).get('/api/bugs/404');

      expect(res.status).toBe(404);
    });
  });
});
