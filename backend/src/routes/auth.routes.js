const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { strict } = require('../middleware/rateLimit');
const authController = require('../controllers/auth.controller');

const router = express.Router();

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  // ISO 3166-1 alpha-2, e.g. "GB" — matches the value sent by the
  // country <select> in frontend/register.html (see js/countries.js).
  countryCode: z.string().length(2),
  currency: z.string().length(3), // ISO 4217, e.g. "GBP"
  referralCode: z.string().trim().max(64).nullable().optional()
  // NOTE: the frontend also has an "accept terms" checkbox. It's
  // enforced client-side, but a compliance-relevant confirmation
  // like that should be re-required here too, e.g.:
  //   acceptedTerms: z.literal(true)
  // once the frontend is sending it explicitly in the request body.
});

// Login attempts are rate-limited strictly — this is the classic
// credential-stuffing target.
router.post('/sign-in', strict, validate({ body: signInSchema }), authController.signIn);
router.post('/sign-up', strict, validate({ body: signUpSchema }), authController.signUp);
router.post('/sign-out', authController.signOut);

module.exports = router;