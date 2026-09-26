/**
 * utils/logger.js — one pino instance, shared everywhere via require().
 * Use this instead of console.log so logs are structured/queryable,
 * especially important on money-movement routes where you'll want an
 * audit trail, not scattered console output.
 */
const pino = require('pino');
const config = require('../config');

const logger = pino({
  level: config.isProduction ? 'info' : 'debug',
  transport: config.isProduction
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
});

module.exports = logger;
