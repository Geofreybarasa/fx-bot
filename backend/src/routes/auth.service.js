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

/**
 * TODO before production:
 *   1. Check the email isn't already registered (return a 409, but
 *      see the timing/enumeration note below).
 *   2. Hash the password (bcrypt/argon2) — never store or log plaintext.
 *   3. Create the user record with status = 'pending_email_confirmation'.
 *   4. Generate a confirmation code (short numeric code or a signed
 *      token) and email it — this is the "confirm email code" flow
 *      mentioned when this page was built. Store the code (or its
 *      hash) with an expiry, and add a POST /auth/confirm-email route
 *      once that's ready.
 *   5. If referralCode is present, record it against the new account
 *      for later attribution — the actual reward calculation belongs
 *      in a referrals service, not here (nothing here computes a
 *      referral credit; the frontend never did either).
 *   6. Log the signup attempt (success/failure, IP) for audit.
 *
 * Note on email enumeration: consider returning the same generic
 * "check your email" response whether or not the email was already
 * registered, and sending a "you already have an account" email
 * instead in that case — this avoids leaking which emails are
 * registered to anyone probing the signup endpoint.
 */
async function createAccount({ fullName, email, password, countryCode, currency, referralCode }) {
  const isDemoMode = !config.databaseUrl;
  if (isDemoMode) {
    throw Object.assign(
      new Error('Account creation not yet connected to a database (DATABASE_URL is unset).'),
      { statusCode: 501 }
    );
  }

  // Example shape once wired up:
  // const existing = await userRepository.findByEmail(email);
  // if (existing) { /* see enumeration note above */ }
  // const passwordHash = await bcrypt.hash(password, 12);
  // const user = await userRepository.create({
  //   fullName, email, passwordHash, countryCode, currency,
  //   status: 'pending_email_confirmation'
  // });
  // if (referralCode) await referralService.recordReferral(user.id, referralCode);
  // await emailService.sendConfirmationCode(user.email, generateConfirmationCode());
  // return { message: 'Account created. Check your email to confirm your address.' };

  return null;
}

module.exports = { authenticate, createAccount };