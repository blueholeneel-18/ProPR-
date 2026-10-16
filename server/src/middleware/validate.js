/**
 * Request payload validation helpers.
 *
 * Each validator returns a middleware that responds with HTTP 400 and a
 * descriptive list of errors when the payload is invalid.
 */
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const SEVERITIES = ['minor', 'moderate', 'major', 'critical'];
const STATUSES = ['open', 'assigned', 'in_progress', 'resolved', 'closed'];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateBug(req, res, next) {
  const errors = [];
  const { title, priority, severity, status } = req.body || {};

  if (!isNonEmptyString(title)) {
    errors.push('title is required and must be a non-empty string');
  }
  if (priority && !PRIORITIES.includes(priority)) {
    errors.push(`priority must be one of: ${PRIORITIES.join(', ')}`);
  }
  if (severity && !SEVERITIES.includes(severity)) {
    errors.push(`severity must be one of: ${SEVERITIES.join(', ')}`);
  }
  if (status && !STATUSES.includes(status)) {
    errors.push(`status must be one of: ${STATUSES.join(', ')}`);
  }

  if (errors.length) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  return next();
}

function validateAssignment(req, res, next) {
  const { assigned_to: assignedTo } = req.body || {};
  const numeric = Number(assignedTo);

  if (assignedTo === undefined || assignedTo === null || Number.isNaN(numeric)) {
    return res.status(400).json({
      error: 'Validation failed',
      details: ['assigned_to is required and must be a numeric user id'],
    });
  }
  return next();
}

function validateUser(req, res, next) {
  const errors = [];
  const { name, email, role } = req.body || {};

  if (!isNonEmptyString(name)) {
    errors.push('name is required and must be a non-empty string');
  }
  if (!isNonEmptyString(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('email is required and must be a valid email address');
  }
  if (role && !['admin', 'developer', 'reporter'].includes(role)) {
    errors.push('role must be one of: admin, developer, reporter');
  }

  if (errors.length) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  return next();
}

module.exports = {
  validateBug,
  validateAssignment,
  validateUser,
  PRIORITIES,
  SEVERITIES,
  STATUSES,
};
