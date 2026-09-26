/**
 * middleware/rateLimit.js
 * Two presets: a generous one for read-mostly routes, and a strict one
 * for anything security- or money-sensitive (login, withdrawals).
 * Tune the numbers to your real traffic once you have data.
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

module.exports = { standard, strict };
