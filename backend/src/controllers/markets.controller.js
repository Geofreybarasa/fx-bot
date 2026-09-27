const marketDataService = require('../services/marketData.service');

/** GET /api/v1/markets/quotes — one-shot snapshot (same shape the WS pushes). */
async function getQuotes(req, res, next) {
  try {
    const quotes = await marketDataService.getLatestQuotes();
    res.json({ data: quotes });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/markets — the "Markets we trade" cards (crypto/gold/fx). */
async function getMarketList(req, res, next) {
  try {
    const markets = await marketDataService.getMarketList();
    res.json({ data: markets });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/markets/catalog — full markets page: categories + every instrument. */
async function getMarketCatalog(req, res, next) {
  try {
    const catalog = await marketDataService.getMarketCatalog();
    res.json({ data: catalog, updatedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

module.exports = { getQuotes, getMarketList, getMarketCatalog };
