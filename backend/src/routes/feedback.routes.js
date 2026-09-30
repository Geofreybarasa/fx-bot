const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { hourly } = require('../middleware/rateLimit');
const feedbackController = require('../controllers/feedback.controller');

const router = express.Router();

// Matches the payload sent by frontend/js/feedback.js. Limits here mirror
// the maxlength attributes in the form — the browser's limits are a
// convenience, THESE are the real ones.
const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  message: z.string().trim().min(5).max(2000),
  name: z.string().trim().max(80).nullable().optional(),
  country: z.string().trim().max(80).nullable().optional()
});

// Public (no login needed, since visitors send feedback before signing up),
// so it gets the hourly per-IP limit against spam.
router.post('/', hourly, validate({ body: feedbackSchema }), feedbackController.submit);

module.exports = router;