/**
 * middleware/auth.js
 * ------------------------------------------------------------------
 * Verifies a bearer JWT and attaches `req.user`. This is a STARTING
 * POINT, not a finished auth system — plug in your real session/user
 * lookup where marked below.
 *
 * Usage:
 *   router.get('/account', requireAuth, accountController.getAccount);
 * ------------------------------------------------------------------
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('./errorHandler');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('Authentication required', 401));
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);

    // TODO: look up the user/session in your database here and attach
    // the fields your controllers actually need — don't trust the JWT
    // payload alone for anything sensitive (e.g. re-check account
    // status, whether the session was revoked, etc.).
    req.user = { id: payload.sub, ...payload };

    next();
  } catch (err) {
    next(new AppError('Invalid or expired session', 401));
  }
}

/** Optional auth: attaches req.user if present, but never blocks the request. */
function attachUserIfPresent(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      req.user = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      // Ignore invalid tokens for optional-auth routes.
    }
  }
  next();
}

module.exports = { requireAuth, attachUserIfPresent };
