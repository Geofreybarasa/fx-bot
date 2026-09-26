/**
 * services/marketData.service.js
 * ------------------------------------------------------------------
 * Single source of truth for market data. Both the REST snapshot
 * (`GET /api/v1/markets/quotes`) and the WebSocket ticker
 * (`sockets/ticker.socket.js`) call `getLatestQuotes()` — so there is
 * exactly one place to plug in a real upstream provider.
 *
 * TODO before production:
 *   - Replace DEMO_QUOTES with a real feed (REST poll or a persistent
 *     upstream WebSocket to your liquidity/data provider), using
 *     config.marketData.providerUrl / providerApiKey.
 *   - Cache the latest snapshot in memory (or Redis if you run more
 *     than one instance) so `getLatestQuotes()` never blocks on a
 *     slow upstream call — read the cache, refresh it in the background.
 *   - This data is DISPLAY ONLY. Actual trade execution must re-quote
 *     and validate against the provider at execution time — never
 *     execute a trade against a cached/broadcast price.
 * ------------------------------------------------------------------
 */

/** @typedef {{ symbol: string, price: number, changePct: number|null, decimals: number }} Quote */

/** @type {Quote[]} */
const DEMO_QUOTES = [
  { symbol: 'EUR/USD', price: 1.1392, changePct: null, decimals: 4 },
  { symbol: 'GBP/USD', price: 1.3246, changePct: null, decimals: 4 },
  { symbol: 'USD/JPY', price: 157.19, changePct: null, decimals: 2 },
  { symbol: 'ETH/USD', price: 2687.75, changePct: 0.22, decimals: 2 },
  { symbol: 'BTC/USD', price: 83926.0, changePct: -0.43, decimals: 2 },
  { symbol: 'XAU/USD', price: 4286.2, changePct: 0.42, decimals: 2 }
];

const MARKET_LIST = [
  { id: 'crypto', name: 'Crypto', spreadLabel: 'Spread from 0.5 pip', pairCount: 8 },
  { id: 'gold', name: 'Gold', spreadLabel: 'Spread from 0.18', pair: 'XAU/USD' },
  { id: 'fx', name: 'FX', spreadLabel: 'Spread from 0.3 pip', pairCount: 12 }
];

async function getLatestQuotes() {
  // TODO: swap for a real provider call / in-memory cache read.
  return DEMO_QUOTES;
}

async function getMarketList() {
  // TODO: swap for real spread/pair-count aggregation once available.
  return MARKET_LIST;
}

module.exports = { getLatestQuotes, getMarketList };
