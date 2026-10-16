/**
 * Request payload validation helpers.
 *
 * Each validator returns a middleware that responds with HTTP 400 and a
 * descriptive list of errors when the payload is invalid.
 */
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const SEVERITIES = ['minor', 'moderate', 'major', 'critical'];
const STATUSES = ['open', 'assigned', 'in_progress', 'resolved', 'closed'];

// Length constraints for the AI triage payload.
const TITLE_MIN = 3;
const TITLE_MAX = 200;
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 5000;
const STEPS_MAX = 5000;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Strip characters/patterns commonly used for XSS and injection attacks while
 * preserving the readable content of the field. Queries remain parameterised,
 * so this is a defence-in-depth measure for anything that is later rendered.
 */
function sanitizeText(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\0/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/<\s*\/?\s*(script|style|iframe|object|embed|link|meta)[^>]*>/gi, '')
    .replace(/<\s*[^>]+>/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Shared 422 responder for the standardized AI error envelope.
 */
function validationFailed(res, status, message, fields) {
  return res.status(status).json({
    error: message || 'Validation failed',
    fields,
    // Backwards-compatible list of human readable errors.
    details: Object.values(fields),
  });
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

/**
 * Validate and sanitize the payload for `POST /api/bugs/ai-triage`.
 *
 * Responds with HTTP 422 and a standardized `{ error, fields }` envelope when
 * the payload is invalid, otherwise replaces `req.body` with sanitized values.
 */
function validateAiTriage(req, res, next) {
  const body = req.body || {};
  const fields = {};

  const rawTitle = body.title;
  if (!isNonEmptyString(rawTitle)) {
    fields.title = 'Title is required.';
  }

  const rawDescription = body.description;
  if (rawDescription !== undefined && rawDescription !== null && rawDescription !== '') {
    if (typeof rawDescription !== 'string') {
      fields.description = 'Description must be a string.';
    } else if (rawDescription.trim().length < DESCRIPTION_MIN) {
      fields.description = `Description must be at least ${DESCRIPTION_MIN} characters.`;
    } else if (rawDescription.trim().length > DESCRIPTION_MAX) {
      fields.description = `Description must be at most ${DESCRIPTION_MAX} characters.`;
    }
  } else {
    fields.description = 'Description is required.';
  }

  const sanitizedTitle = sanitizeText(rawTitle);
  const sanitizedDescription = sanitizeText(rawDescription);
  const sanitizedSteps = sanitizeText(body.steps_to_reproduce);

  if (typeof sanitizedTitle === 'string') {
    if (sanitizedTitle.length < TITLE_MIN) {
      fields.title = `Title must be at least ${TITLE_MIN} characters.`;
    } else if (sanitizedTitle.length > TITLE_MAX) {
      fields.title = `Title must be at most ${TITLE_MAX} characters.`;
    }
  }

  if (sanitizedSteps && sanitizedSteps.length > STEPS_MAX) {
    fields.steps_to_reproduce = `Steps to reproduce must be at most ${STEPS_MAX} characters.`;
  }

  if (Object.keys(fields).length) {
    return validationFailed(res, 422, 'Validation failed', fields);
  }

  req.body = {
    title: sanitizedTitle,
    description: sanitizedDescription,
    steps_to_reproduce: sanitizedSteps || undefined,
  };
  return next();
}

module.exports = {
  validateBug,
  validateAssignment,
  validateUser,
  validateAiTriage,
  sanitizeText,
  validationFailed,
  PRIORITIES,
  SEVERITIES,
  STATUSES,
  TITLE_MIN,
  TITLE_MAX,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
};
