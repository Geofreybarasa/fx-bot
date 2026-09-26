/**
 * app.js
 * Builds and returns the Express app. Kept separate from server.js so
 * tests can `require('./app')` and hit it with supertest without
 * actually binding a port or opening the WebSocket server.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');

const config = require('./config');
const logger = require('./utils/logger');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  // Security headers. Adjust the CSP directives to match your real
  // frontend origin(s) and any CDN/font hosts you actually use.
  app.use(helmet());

  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true
    })
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger }));

  app.use('/api/v1', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
