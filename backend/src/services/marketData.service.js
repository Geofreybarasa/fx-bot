/**
 * services/marketData.service.js
 * ------------------------------------------------------------------
 * Single source of truth for market data. The homepage cards
 * (`GET /api/v1/markets`), the full markets page
 * (`GET /api/v1/markets/catalog`), the one-shot snapshot
 * (`GET /api/v1/markets/quotes`), and the WebSocket ticker
 * (`sockets/ticker.socket.js`) all read from `INSTRUMENTS` below —
 * so there is exactly one place to plug in a real upstream provider.
 *
 * TODO before production:
 *   - Replace INSTRUMENTS with a real feed. A reasonable real split:
 *     crypto from a provider like CoinGecko, metals from a metals
 *     price API, FX from a reference-rate source (e.g. ECB) — three
 *     cheap/free upstream sources, polled server-side and cached in
 *     memory (or Redis if you run more than one instance), rather
 *     than one paid all-in-one feed.
 *   - Cache the latest snapshot so `getLatestQuotes()` /
 *     `getMarketCatalog()` never block on a slow upstream call — read
 *     the cache, refresh it in the background on an interval.
 *   - This data is DISPLAY ONLY. Actual trade execution must re-quote
 *     and validate against the provider at execution time — never
 *     execute a trade against a cached/broadcast price.
 * ------------------------------------------------------------------
 */

/**
 * @typedef {Object} Instrument
 * @property {'crypto'|'gold'|'fx'} category
 * @property {string} symbol       e.g. "BTC/USD"
 * @property {string} name         e.g. "Bitcoin"
 * @property {number} spread        typical spread, in the unit the design shows (pips for FX/crypto, absolute for metals)
 * @property {number} price
 * @property {number|null} changePct  24h/period change, percent, signed. null = not shown (e.g. FX often shown flat here)
 * @property {number} decimals       display decimals
 */

/** @type {Instrument[]} */
const INSTRUMENTS = [
  // ---- Crypto (8 pairs) ----
  { category: 'crypto', symbol: 'BTC/USD', name: 'Bitcoin', spread: 0.5, price: 84008.01, changePct: 0.13, decimals: 2 },
  { category: 'crypto', symbol: 'ETH/USD', name: 'Ethereum', spread: 0.6, price: 2685.94, changePct: -0.20, decimals: 2 },
  { category: 'crypto', symbol: 'SOL/USD', name: 'Solana', spread: 0.8, price: 121.15, changePct: -0.70, decimals: 2 },
  { category: 'crypto', symbol: 'XRP/USD', name: 'Ripple', spread: 0.9, price: 1.5242, changePct: -3.04, decimals: 4 },
  { category: 'crypto', symbol: 'AVAX/USD', name: 'Avalanche', spread: 1.1, price: 18.8295, changePct: 3.29, decimals: 4 },
  { category: 'crypto', symbol: 'ADA/USD', name: 'Cardano', spread: 1.0, price: 0.6123, changePct: 1.24, decimals: 4 },
  { category: 'crypto', symbol: 'DOGE/USD', name: 'Dogecoin', spread: 1.2, price: 0.1834, changePct: -1.52, decimals: 4 },
  { category: 'crypto', symbol: 'LINK/USD', name: 'Chainlink', spread: 1.0, price: 14.22, changePct: 0.85, decimals: 2 },

  // ---- Gold / metals ----
  { category: 'gold', symbol: 'XAU/USD', name: 'Gold Spot', spread: 0.18, price: 4284.97, changePct: 0.42, decimals: 2 },
  { category: 'gold', symbol: 'XAG/USD', name: 'Silver Spot', spread: 0.22, price: 64.4031, changePct: 0.71, decimals: 4 },

  // ---- FX (12 pairs) ----
  { category: 'fx', symbol: 'EUR/USD', name: 'Euro / US Dollar', spread: 0.3, price: 1.1404, changePct: null, decimals: 4 },
  { category: 'fx', symbol: 'GBP/USD', name: 'British Pound / US Dollar', spread: 0.3, price: 1.3246, changePct: null, decimals: 4 },
  { category: 'fx', symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', spread: 0.4, price: 157.15, changePct: null, decimals: 2 },
  { category: 'fx', symbol: 'AUD/USD', name: 'Aussie Dollar', spread: 0.5, price: 0.7024, changePct: null, decimals: 4 },
  { category: 'fx', symbol: 'USD/CAD', name: 'US Dollar / Canadian', spread: 0.5, price: 1.4138, changePct: null, decimals: 4 },
  { category: 'fx', symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', spread: 0.5, price: 0.8283, changePct: null, decimals: 4 },
  { category: 'fx', symbol: 'NZD/USD', name: 'Kiwi Dollar', spread: 0.6, price: 0.5660, changePct: null, decimals: 4 },
  { category: 'fx', symbol: 'EUR/GBP', name: 'Euro / Pound', spread: 0.6, price: 0.8594, changePct: null, decimals: 4 },
  { category: 'fx', symbol: 'EUR/JPY', name: 'Euro / Yen', spread: 0.6, price: 179.10, changePct: null, decimals: 2 },
  { category: 'fx', symbol: 'GBP/JPY', name: 'Pound / Yen', spread: 0.7, price: 208.15, changePct: null, decimals: 2 },
  { category: 'fx', symbol: 'EUR/CHF', name: 'Euro / Franc', spread: 0.6, price: 0.9445, changePct: null, decimals: 4 },
  { category: 'fx', symbol: 'AUD/JPY', name: 'Aussie / Yen', spread: 0.7, price: 110.38, changePct: null, decimals: 2 }
];

const CATEGORY_META = {
  crypto: { id: 'crypto', name: 'Crypto' },
  gold: { id: 'gold', name: 'Gold' },
  fx: { id: 'fx', name: 'FX' }
};

// Symbols shown in the header marquee — a small curated subset, not
// the full catalog (keeps the marquee readable/short).
const TICKER_SYMBOLS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'ETH/USD', 'BTC/USD', 'XAU/USD'];

function toQuote(instrument) {
  return {
    symbol: instrument.symbol,
    price: instrument.price,
    changePct: instrument.changePct,
    decimals: instrument.decimals
  };
}

/** Small subset for the header marquee. */
async function getLatestQuotes() {
  // TODO: swap INSTRUMENTS for a real cached feed (see file header).
  return INSTRUMENTS.filter((i) => TICKER_SYMBOLS.includes(i.symbol)).map(toQuote);
}

/** Homepage "Markets we trade" summary cards. */
async function getMarketList() {
  return Object.values(CATEGORY_META).map((cat) => {
    const items = INSTRUMENTS.filter((i) => i.category === cat.id);
    const minSpread = Math.min(...items.map((i) => i.spread));
    return {
      id: cat.id,
      name: cat.name,
      spreadLabel: `Spread from ${minSpread}${cat.id === 'gold' ? '' : ' pip'}`,
      pairCount: cat.id === 'gold' ? undefined : items.length,
      pair: cat.id === 'gold' ? 'XAU/USD' : undefined
    };
  });
}

/**
 * Full markets page data: each category with its instruments,
 * matching the "Markets" screen (filter pills + grouped tables).
 */
async function getMarketCatalog() {
  return Object.values(CATEGORY_META).map((cat) => {
    const items = INSTRUMENTS.filter((i) => i.category === cat.id);
    const minSpread = Math.min(...items.map((i) => i.spread));
    const spreadUnit = cat.id === 'gold' ? '' : ' pip';

    return {
      id: cat.id,
      name: cat.name,
      metaLine:
        cat.id === 'crypto'
          ? `${items.length} major pairs · 24/7 execution · spread from ${minSpread}${spreadUnit}`
          : cat.id === 'gold'
          ? `Spot XAU/USD · low-spread venue routing · spread from ${minSpread}`
          : `${items.length} majors and crosses · tight pricing · spread from ${minSpread}${spreadUnit}`,
      instruments: items.map((i) => ({
        symbol: i.symbol,
        name: i.name,
        spread: i.spread,
        price: i.price,
        changePct: i.changePct,
        decimals: i.decimals
      }))
    };
  });
}

module.exports = { getLatestQuotes, getMarketList, getMarketCatalog };
