/**
 * controllers/auth.controller.js
 * Controllers stay thin: parse the (already-validated) request,
 * call a service, shape the response. All real logic — password
 * hashing/verification, session/token issuance, MFA — lives in
 * services/auth.service.js so it's unit-testable without HTTP.
 */
const authService = require('../services/auth.service');
const { AppError } = require('../middleware/errorHandler');

async function signIn(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.authenticate(email, password);

    if (!result) {
      // Deliberately vague — never reveal whether the email or the
      // password was the wrong part.
      throw new AppError('Invalid email or password', 401);
    }

    res.json({ token: result.token, expiresIn: result.expiresIn });
  } catch (err) {
    next(err);
  }
}

async function signOut(req, res) {
  // TODO: revoke the session/refresh token server-side once sessions
  // are backed by a real store (DB/Redis) rather than being pure JWT.
  res.status(204).end();
}

async function signUp(req, res, next) {
  try {
    const { fullName, email, password, countryCode, currency, referralCode } = req.body;
    const result = await authService.createAccount({
      fullName,
      email,
      password,
      countryCode,
      currency,
      referralCode: referralCode || null
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { signIn, signOut, signUp };