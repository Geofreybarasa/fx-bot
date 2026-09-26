/**
 * server.js
 * Boots the HTTP server (Express app from app.js) and attaches the
 * ticker WebSocket to the SAME server/port — one process, one port,
 * simpler to deploy behind a single reverse proxy.
 */
const http = require('http');
const config = require('./config');
const logger = require('./utils/logger');
const createApp = require('./app');
const { attachTickerSocket } = require('./sockets/ticker.socket');

const app = createApp();
const server = http.createServer(app);

attachTickerSocket(server);

server.listen(config.port, () => {
  logger.info(
    { port: config.port, env: config.env },
    `fx-bot backend listening on http://localhost:${config.port} (ws: /v1/ticker)`
  );
});

// Fail loudly on unhandled errors rather than limping along in a bad state.
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});
