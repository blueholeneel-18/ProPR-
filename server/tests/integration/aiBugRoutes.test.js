const request = require('supertest');

jest.mock('../../src/models/bugModel');
jest.mock('../../src/models/userModel');
jest.mock('../../src/services/aiService');

const app = require('../../src/app');
const bugModel = require('../../src/models/bugModel');
const userModel = require('../../src/models/userModel');
const aiService = require('../../src/services/aiService');

describe('AI Bug Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    aiService.getConfig.mockReturnValue({ mode: 'mock', provider: 'mock' });
  });

  describe('POST /api/bugs/ai-triage', () => {
    it('returns AI triage suggestions for a valid payload', async () => {
      aiService.triageBug.mockResolvedValue({
        suggested_priority: 'critical',
        suggested_severity: 'blocker',
        summary: 'Database timeout under load',
        possible_root_cause: 'Connection pool exhausted',
        source: 'mock',
      });

      const res = await request(app)
        .post('/api/bugs/ai-triage')
        .send({
          title: 'Database connection timeout',
          description: 'Production database connections are timing out under load affecting all users',
          steps_to_reproduce: 'Hit the reports endpoint with 100 concurrent requests',
        });

      expect(res.status).toBe(200);
      expect(res.body.suggested_priority).toBe('critical');
      expect(res.body.suggested_severity).toBe('blocker');
      expect(res.body.summary).toMatch(/timeout/i);
      expect(aiService.triageBug).toHaveBeenCalledWith({
        title: 'Database connection timeout',
        description: 'Production database connections are timing out under load affecting all users',
        steps_to_reproduce: 'Hit the reports endpoint with 100 concurrent requests',
      });
    });

    it('returns 422 when title is missing', async () => {
      const res = await request(app)
        .post('/api/bugs/ai-triage')
        .send({
          description: 'A description long enough to pass validation check',
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toMatch(/validation/i);
      expect(res.body.fields).toBeDefined();
      expect(aiService.triageBug).not.toHaveBeenCalled();
    });

    it('returns 422 when description is too short', async () => {
      const res = await request(app)
        .post('/api/bugs/ai-triage')
        .send({
          title: 'Short title',
          description: 'Too short',
        });

      expect(res.status).toBe(422);
      expect(res.body.fields.description).toBeDefined();
      expect(aiService.triageBug).not.toHaveBeenCalled();
    });

    it('sanitizes HTML in the payload before triage', async () => {
      aiService.triageBug.mockResolvedValue({
        suggested_priority: 'medium',
        suggested_severity: 'minor',
        summary: 'Clean',
        possible_root_cause: 'Clean',
        source: 'mock',
      });

      const res = await request(app)
        .post('/api/bugs/ai-triage')
        .send({
          title: '<script>alert(1)</script>Login fails',
          description: '<img src=x onerror=alert(1)>Users cannot log into the application after session expiry and see an error message',
        });

      expect(res.status).toBe(200);
      const callArg = aiService.triageBug.mock.calls[0][0];
      expect(callArg.title).not.toMatch(/<script/i);
      expect(callArg.description).not.toMatch(/onerror/i);
    });

    it('returns 422 when title exceeds the maximum length', async () => {
      const longTitle = 'x'.repeat(250);
      const res = await request(app)
        .post('/api/bugs/ai-triage')
        .send({
          title: longTitle,
          description: 'A sufficiently long description that describes the issue in detail',
        });

      expect(res.status).toBe(422);
      expect(res.body.fields.title).toBeDefined();
      expect(aiService.triageBug).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/bugs/:id/ai-suggest-assignee', () => {
    it('returns ranked developer recommendations', async () => {
      bugModel.findById.mockResolvedValue({
        id: 1,
        title: 'Database timeout',
        description: 'Timeout on reports endpoint',
      });
      userModel.findAll.mockResolvedValue([
        { id: 1, name: 'Alice', email: 'alice@example.com', role: 'developer' },
        { id: 2, name: 'Bob', email: 'bob@example.com', role: 'developer' },
      ]);
      bugModel.getAssignmentStats.mockResolvedValue([
        { user_id: 1, name: 'Alice', email: 'alice@example.com', role: 'developer', resolved_count: 8, open_count: 0, resolved_titles: ['Fix DB timeout'] },
        { user_id: 2, name: 'Bob', email: 'bob@example.com', role: 'developer', resolved_count: 2, open_count: 2, resolved_titles: [] },
      ]);
      aiService.recommendAssignees.mockReturnValue({
        recommendations: [
          { userId: 1, name: 'Alice', email: 'alice@example.com', matchScore: 92, reason: 'best fit' },
          { userId: 2, name: 'Bob', email: 'bob@example.com', matchScore: 68, reason: 'available' },
        ],
        source: 'mock',
      });

      const res = await request(app).post('/api/bugs/1/ai-suggest-assignee');

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toHaveLength(2);
      expect(res.body.recommendations[0].userId).toBe(1);
      expect(res.body.config).toBeDefined();
    });

    it('returns 404 when the bug does not exist', async () => {
      bugModel.findById.mockResolvedValue(null);

      const res = await request(app).post('/api/bugs/404/ai-suggest-assignee');

      expect(res.status).toBe(404);
      expect(userModel.findAll).not.toHaveBeenCalled();
      expect(aiService.recommendAssignees).not.toHaveBeenCalled();
    });

    it('handles missing data gracefully', async () => {
      bugModel.findById.mockResolvedValue({ id: 2, title: 'Minor bug', description: 'Small' });
      userModel.findAll.mockResolvedValue([]);
      bugModel.getAssignmentStats.mockResolvedValue([]);
      aiService.recommendAssignees.mockReturnValue({ recommendations: [], source: 'mock' });

      const res = await request(app).post('/api/bugs/2/ai-suggest-assignee');

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toEqual([]);
    });
  });
});
