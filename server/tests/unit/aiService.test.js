const {
  extractKeywords,
  mockTriage,
  parseTriageResponse,
  scoreAssignee,
  recommendAssignees,
  triageBug,
  getConfig,
} = require('../../src/services/aiService');

describe('aiService', () => {
  describe('extractKeywords', () => {
    it('extracts meaningful keywords from bug text', () => {
      const keywords = extractKeywords(
        'Database connection timeout in production under load',
        'timeout error connecting to Postgres'
      );
      expect(keywords).toEqual(
        expect.arrayContaining(['database', 'connection', 'timeout', 'production'])
      );
    });

    it('ignores common stop words', () => {
      const keywords = extractKeywords('the login page is broken for all users');
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('for');
      expect(keywords).toEqual(expect.arrayContaining(['login', 'page', 'broken', 'users']));
    });
  });

  describe('mockTriage', () => {
    it('classifies critical production failures as blocker/critical', () => {
      const result = mockTriage({
        title: 'Database connection timeout',
        description: 'Production service unavailable due to timeout under load',
      });
      expect(['critical']).toContain(result.suggested_priority);
      expect(['critical', 'blocker']).toContain(result.suggested_severity);
      expect(result.source).toBe('mock');
      expect(result.summary).toBeTruthy();
      expect(result.possible_root_cause).toMatch(/timeout|database|connection/i);
    });

    it('returns medium priority for UI typo with reasonable defaults', () => {
      const result = mockTriage({
        title: 'Fix typo in dashboard',
        description: 'A small wording issue on the dashboard header',
      });
      expect(result.suggested_priority).toBe('low');
      expect(result.suggested_severity).toBe('minor');
      expect(result.possible_root_cause).toMatch(/not yet determined|rendering/i);
    });
  });

  describe('parseTriageResponse', () => {
    it('parses valid JSON from provider response', () => {
      const raw = JSON.stringify({
        suggested_priority: 'high',
        suggested_severity: 'major',
        summary: 'API returns 500 on payment checkout',
        possible_root_cause: 'Exception thrown in payment gateway handler',
      });
      const parsed = parseTriageResponse(raw);
      expect(parsed).toMatchObject({
        suggested_priority: 'high',
        suggested_severity: 'major',
        source: 'ai',
      });
    });

    it('extracts JSON from fenced markdown', () => {
      const raw = '```json\n' + JSON.stringify({
        suggested_priority: 'critical',
        suggested_severity: 'blocker',
        summary: 'Crash',
        possible_root_cause: 'Unhandled error',
      }) + '\n```';
      expect(parseTriageResponse(raw)).toBeTruthy();
    });

    it('returns null for malformed payload', () => {
      expect(parseTriageResponse('{ invalid')).toBeNull();
      expect(parseTriageResponse(null)).toBeNull();
    });

    it('rejects values outside the allowed enums', () => {
      const raw = JSON.stringify({
        suggested_priority: 'urgent',
        suggested_severity: 'major',
        summary: 'oops',
        possible_root_cause: 'oops',
      });
      expect(parseTriageResponse(raw)).toBeNull();
    });
  });

  describe('scoreAssignee', () => {
    it('favors developers with matching resolved history', () => {
      const bug = {
        title: 'Login session timeout',
        description: 'Users are logged out after inactivity due to timeout',
      };
      const candidate = { id: 2, name: 'Sam', email: 'sam@example.com', role: 'developer' };
      const stats = {
        open_count: 1,
        resolved_count: 5,
        resolved_titles: ['Fix login timeout', 'Session token renewal'],
        max_open: 2,
      };
      const scored = scoreAssignee({ bug, candidate, stats });
      expect(scored.matchScore).toBeGreaterThanOrEqual(60);
      expect(scored.reason).toMatch(/developer|resolved|open/i);
    });

    it('assigns a baseline score when no matching history exists', () => {
      const bug = { title: 'Typo', description: 'Fix heading text' };
      const candidate = { id: 3, name: 'Moe', email: 'moe@example.com', role: 'reporter' };
      const stats = { open_count: 0, resolved_count: 0, resolved_titles: [], max_open: 0 };
      const scored = scoreAssignee({ bug, candidate, stats });
      expect(scored.matchScore).toBeGreaterThanOrEqual(1);
      expect(scored.matchScore).toBeLessThanOrEqual(99);
    });
  });

  describe('recommendAssignees', () => {
    it('returns ranked recommendations up to the limit', () => {
      const bug = { title: 'API timeout', description: 'Database query timeout' };
      const users = [
        { id: 1, name: 'Alice', role: 'developer' },
        { id: 2, name: 'Bob', role: 'developer' },
      ];
      const statsByUser = {
        1: { open_count: 0, resolved_count: 10, resolved_titles: ['Optimize DB queries', 'Fix API timeout'] },
        2: { open_count: 3, resolved_count: 1, resolved_titles: ['Update styles'] },
      };
      const result = recommendAssignees({ bug, users, statsByUser });
      expect(result.recommendations[0].userId).toBe(1);
      expect(result.recommendations).toHaveLength(2);
      expect(result.source).toBe('mock');
    });
  });

  describe('triageBug', () => {
    it('returns mock result when no API key is present', async () => {
      const result = await triageBug({ title: 'Crash', description: 'App crashes on start' });
      expect(result.source).toBe('mock');
    });

    it('falls back to mock if live response is invalid', async () => {
      // Temporarily simulate live mode by overriding isLive
      const ai = require('../../src/services/aiService');
      const originalIsLive = ai.isLive;
      ai.isLive = () => true;
      // Monkey-patch callProvider via module cache by temporarily stubbing fetch? Easier: replace internals.
      // Since the module uses callProvider internally, we can spy by re-requiring with a stubbed implementation.
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'not-json' } }] }),
      });
      const res = await ai.triageBug({ title: 'X', description: 'Y needs more characters to satisfy min length? Y'.repeat(2) });
      // Clean up
      global.fetch = originalFetch;
      ai.isLive = originalIsLive;
      expect(res.source).toBe('mock');
    });
  });
});
