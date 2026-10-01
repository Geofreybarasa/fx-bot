const newsService = require('../services/news.service');

/** GET /api/v1/news — merged, sorted headlines from every live source. */
async function list(req, res, next) {
  try {
    const data = await newsService.getNews();
    // Public, same for everyone: let it be cached briefly by browsers/CDNs too.
    res.set('Cache-Control', 'public, max-age=120');
    res.json({
      data,
      sources: newsService.getSources(),
      updatedAt: new Date().toISOString(),
      refreshIntervalMinutes: newsService.CACHE_TTL_MINUTES
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/news/sources — source list for the filter pills (incl. link-only). */
async function sources(req, res) {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json({ data: newsService.getSources() });
}

module.exports = { list, sources };