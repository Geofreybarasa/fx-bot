const express = require('express');
const { standard } = require('../middleware/rateLimit');
const marketsController = require('../controllers/markets.controller');

const router = express.Router();

// Public, read-only, display data — generous rate limit is fine here.
router.get('/quotes', standard, marketsController.getQuotes);
router.get('/catalog', standard, marketsController.getMarketCatalog);
router.get('/', standard, marketsController.getMarketList);

module.exports = router;
