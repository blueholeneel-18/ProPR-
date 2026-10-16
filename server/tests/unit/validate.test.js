const {
  validateBug,
  validateAssignment,
  validateUser,
  validateAiTriage,
  sanitizeText,
} = require('../../src/middleware/validate');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('validateBug', () => {
  it('rejects a missing title', () => {
    const res = mockRes();
    const next = jest.fn();

    validateBug({ body: {} }, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid payload', () => {
    const res = mockRes();
    const next = jest.fn();

    validateBug({ body: { title: 'Crash on login', priority: 'high' } }, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects an invalid priority', () => {
    const res = mockRes();
    const next = jest.fn();

    validateBug({ body: { title: 'Bug', priority: 'urgent' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('validateAssignment', () => {
  it('requires a numeric assigned_to', () => {
    const res = mockRes();
    const next = jest.fn();

    validateAssignment({ body: {} }, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a numeric assigned_to', () => {
    const res = mockRes();
    const next = jest.fn();

    validateAssignment({ body: { assigned_to: 3 } }, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('validateUser', () => {
  it('rejects an invalid email', () => {
    const res = mockRes();
    const next = jest.fn();

    validateUser({ body: { name: 'Ada', email: 'not-an-email' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('accepts a valid user', () => {
    const res = mockRes();
    const next = jest.fn();

    validateUser({ body: { name: 'Ada', email: 'ada@example.com', role: 'developer' } }, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('validateAiTriage', () => {
  it('rejects an empty title', () => {
    const res = mockRes();
    const next = jest.fn();

    validateAiTriage(
      {
        body: {
          title: '',
          description: 'The description must be long enough to meet the minimum length requirement',
        },
      },
      res,
      next
    );

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({ title: expect.any(String) }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a description that is too short', () => {
    const res = mockRes();
    const next = jest.fn();

    validateAiTriage({ body: { title: 'Valid title', description: 'Short' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({ description: expect.any(String) }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid AI triage payload and sanitizes inputs', () => {
    const res = mockRes();
    const next = jest.fn();

    validateAiTriage(
      {
        body: {
          title: '  <script>alert(1)</script>Database timeout  ',
          description: '<b>Database connections</b> are timing out under heavy production load for all users across regions',
          steps_to_reproduce: '<iframe src="x"></iframe>Run load test against /api/reports',
        },
      },
      res,
      next
    );

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns fields map in the error response', () => {
    const res = mockRes();
    const next = jest.fn();

    validateAiTriage(
      {
        body: {
          title: 'ab',
          description: 'Too brief',
          steps_to_reproduce: 'x'.repeat(6000),
        },
      },
      res,
      next
    );

    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall.fields).toHaveProperty('title');
    expect(jsonCall.fields).toHaveProperty('description');
    expect(jsonCall.fields).toHaveProperty('steps_to_reproduce');
  });
});

describe('sanitizeText', () => {
  it('strips HTML tags and dangerous protocols', () => {
    const input = '<script>alert(1)</script><img src=x onerror=alert(2)>Hello <b>World</b> javascript:void(0)';
    const sanitized = sanitizeText(input);
    expect(sanitized).toBe('Hello World');
  });

  it('trims whitespace and drops null bytes', () => {
    const sanitized = sanitizeText('  some text \0\n ');
    expect(sanitized).toBe('some text');
  });
});
