const feedbackService = require('../services/feedback.service');

/** POST /api/v1/feedback — thin: body is already validated by the route's zod schema. */
async function submit(req, res, next) {
  try {
    const { rating, message, name, country } = req.body;
    await feedbackService.saveFeedback({
      rating,
      message,
      name: name || null,
      country: country || null
    });
    res.status(201).json({ message: 'Thank you for your feedback.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { submit };