/**
 * services/auth.service.js
 * ------------------------------------------------------------------
 * Placeholder implementation so the route is wireable end-to-end
 * today. Replace `authenticate` with real logic before this goes
 * anywhere near production:
 *   1. Look up the user by email in your database.
 *   2. Compare the password against a stored hash with a slow hash
 *      function (bcrypt/argon2) — never store or compare plaintext.
 *   3. Check account status (locked, unverified, etc.).
 *   4. Issue a short-lived JWT (+ a refresh token in an httpOnly,
 *      Secure, SameSite=strict cookie if you want longer sessions).
 *   5. Log the attempt (success/failure, IP, user agent) for audit —
 *      this matters a lot on a platform holding digital assets.
 * ------------------------------------------------------------------
 */
const config = require('../config');
// const jwt = require('jsonwebtoken'); // uncomment once real issuance is wired up

async function authenticate(email, password) {
  // TODO: replace with a real DB lookup + bcrypt/argon2 comparison.
  const isDemoMode = !config.databaseUrl;
  if (isDemoMode) {
    throw Object.assign(
      new Error('Auth service not yet connected to a database (DATABASE_URL is unset).'),
      { statusCode: 501 }
    );
  }

  // Example shape once wired up:
  // const user = await userRepository.findByEmail(email);
  // if (!user) return null;
  // const passwordOk = await bcrypt.compare(password, user.passwordHash);
  // if (!passwordOk) return null;
  //
  // const token = jwt.sign({ sub: user.id, email: user.email }, config.jwt.secret, {
  //   expiresIn: config.jwt.expiresIn
  // });
  // return { token, expiresIn: config.jwt.expiresIn };

  return null;
}

module.exports = { authenticate };
