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

// Login attempts are rate-limited strictly — this is the classic
// credential-stuffing target.
router.post('/sign-in', strict, validate({ body: signInSchema }), authController.signIn);
router.post('/sign-out', authController.signOut);

module.exports = router;
