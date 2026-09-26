/**
 * controllers/account.controller.js
 * Stub — replace with real account/profile/balance lookups once the
 * database and account service exist.
 */
async function getCurrentAccount(req, res) {
  // req.user is set by middleware/auth.js's requireAuth
  res.status(501).json({
    error: { message: 'Account service not implemented yet.' },
    user: req.user
  });
}

module.exports = { getCurrentAccount };
