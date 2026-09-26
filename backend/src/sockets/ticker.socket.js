/**
 * sockets/ticker.socket.js
 * ------------------------------------------------------------------
 * Feeds the frontend's marquee (frontend/js/ticker.js). Broadcasts on
 * a fixed interval to every connected client:
 *   { "type": "quotes", "data": Quote[] }
 * — this is exactly the shape ticker.js already expects, so no
 * frontend change is needed when you point config.js at this socket's
 * URL and set TICKER_AUTOCONNECT: true.
 *
 * This channel is intentionally public/unauthenticated and read-only.
 * Never send account-specific data (balances, open positions, PnL)
 * over it — that belongs on an authenticated, per-user channel.
 * ------------------------------------------------------------------
 */
const { WebSocketServer } = require('ws');
const config = require('../config');
const logger = require('../utils/logger');
const marketDataService = require('../services/marketData.service');

/**
 * @param {import('http').Server} httpServer - attach the WS server to
 *   the same HTTP server Express listens on (share one port).
 */
function attachTickerSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/v1/ticker' });

  wss.on('connection', (socket, req) => {
    logger.info({ ip: req.socket.remoteAddress }, 'Ticker client connected');

    socket.on('close', () => {
      logger.debug('Ticker client disconnected');
    });

    socket.on('error', (err) => {
      logger.warn({ err }, 'Ticker client socket error');
    });
  });

  async function broadcastQuotes() {
    if (wss.clients.size === 0) return; // nothing to do, save the DB/provider hit

    try {
      const quotes = await marketDataService.getLatestQuotes();
      const message = JSON.stringify({ type: 'quotes', data: quotes });

      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(message);
        }
      });
    } catch (err) {
      logger.error({ err }, 'Failed to broadcast ticker quotes');
    }
  }

  const interval = setInterval(broadcastQuotes, config.ticker.broadcastIntervalMs);

  wss.on('close', () => clearInterval(interval));

  return wss;
}

module.exports = { attachTickerSocket };
