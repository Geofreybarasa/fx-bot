const express = require('express');
const { standard } = require('../middleware/rateLimit');
const newsController = require('../controllers/news.controller');

const router = express.Router();

// Public, read-only headlines — no auth needed to browse news.
router.get('/', standard, newsController.list);
router.get('/sources', standard, newsController.sources);

module.exports = router;