const webinarsService = require('../services/webinars.service');

/** GET /api/v1/webinars — public list for the Webinar page. */
async function list(req, res, next) {
  try {
    const data = await webinarsService.getWebinars();
    // Public, identical for everyone: let browsers/CDNs reuse it briefly so a
    // traffic spike on this page doesn't become a spike on your database.
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = { list };