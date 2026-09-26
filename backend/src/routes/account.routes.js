const express = require('express');
const { requireAuth } = require('../middleware/auth');
const accountController = require('../controllers/account.controller');

const router = express.Router();

// Everything in this router requires a valid session — account data
// is exactly the kind of thing that must never be reachable without auth.
router.use(requireAuth);

router.get('/me', accountController.getCurrentAccount);

module.exports = router;
