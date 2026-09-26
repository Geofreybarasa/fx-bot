const express = require('express');
const authRoutes = require('./auth.routes');
const accountRoutes = require('./account.routes');
const marketsRoutes = require('./markets.routes');

const router = express.Router();

// Versioned from day one — cheap now, painful to retrofit later.
router.use('/auth', authRoutes);
router.use('/account', accountRoutes);
router.use('/markets', marketsRoutes);

router.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = router;
