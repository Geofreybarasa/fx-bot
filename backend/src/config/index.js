/**
 * config/index.js
 * ------------------------------------------------------------------
 * Reads and validates process.env ONCE at startup and exports a
 * single frozen config object. Nothing else in the codebase should
 * read process.env directly — import this instead.
 *
 * Fails fast (throws before the server starts listening) if a
 * required variable is missing. For a platform moving money, it's
 * far better to crash at boot than to silently run with a missing
 * secret or a wrong CORS origin.
 * ------------------------------------------------------------------
 */
require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

const isProduction = process.env.NODE_ENV === 'production';

// In production, secrets and DB/provider URLs are mandatory.
// In development, we let them be empty so the server can boot before
// those pieces exist yet — routes that need them should check and
// return a clear 501/503 rather than crashing on every request.
const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  isProduction,
  port: Number(optional('PORT', 4000)),

  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  jwt: {
    secret: isProduction ? required('JWT_SECRET') : optional('JWT_SECRET', 'dev-only-secret-do-not-use-in-prod'),
    expiresIn: optional('JWT_EXPIRES_IN', '15m')
  },

  databaseUrl: isProduction ? required('DATABASE_URL') : optional('DATABASE_URL', null),

  marketData: {
    providerUrl: optional('MARKET_DATA_PROVIDER_URL', null),
    apiKey: optional('MARKET_DATA_PROVIDER_API_KEY', null)
  },

  ticker: {
    broadcastIntervalMs: Number(optional('TICKER_BROADCAST_INTERVAL_MS', 2000))
  }
});

module.exports = config;
