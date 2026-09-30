/**
 * middleware/rateLimit.js
 * Three presets: a generous one for read-mostly routes, a strict one
 * for anything security- or money-sensitive (login, withdrawals), and
 * an hourly one for public write forms that bots love (feedback).
 * Tune the numbers to your real traffic once you have data.
 *
 * DEPLOYMENT NOTE: limits are counted per client IP. Behind a reverse
 * proxy (nginx, a load balancer, most PaaS hosts) every request appears
 * to come from the proxy unless Express is told to trust it — add
 * `app.set('trust proxy', 1)` in app.js (adjust the hop count to your
 * setup) or every visitor will share ONE bucket and get locked out together.
 */
const rateLimit = require('express-rate-limit');

const standard = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false
});

const strict = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts. Please wait and try again.' } }
});

// Public forms that anyone can POST to without an account.
const hourly = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many submissions. Please try again later.' } }
});

module.exports = { standard, strict, hourly };