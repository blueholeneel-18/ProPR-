/**
 * Authentication middleware.
 *
 * This scaffold ships with a light-weight header based authenticator so the
 * API is testable before a full auth provider is wired up. A real
 * implementation would verify a signed JWT from the Authorization header.
 *
 * `authenticate` is non-blocking: if credentials are present it attaches
 * `req.user`, otherwise the request continues as anonymous.
 * `requireAuth` blocks anonymous requests.
 */
function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme === 'Bearer' && token) {
    // Placeholder: decode `Bearer <userId>` for local development.
    const userId = Number.parseInt(token, 10);
    if (!Number.isNaN(userId)) {
      req.user = { id: userId };
    }
  }

  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return next();
}

module.exports = { authenticate, requireAuth };
