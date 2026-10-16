const {
  validateBug,
  validateAssignment,
  validateUser,
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
