const express = require('express');
const { standard } = require('../middleware/rateLimit');
const webinarsController = require('../controllers/webinars.controller');

const router = express.Router();

// Public, read-only. Anything that reveals join links or attendee data
// does NOT belong here — it goes behind requireAuth in the app routes.
router.get('/', standard, webinarsController.list);

module.exports = router;