/**
 * middleware/validate.js
 * Wraps a zod schema into an Express middleware. Validate every
 * request body/params/query BEFORE it reaches a controller — never
 * trust client input on a platform moving digital assets.
 *
 * Usage:
 *   const { z } = require('zod');
 *   const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
 *   router.post('/login', validate({ body: schema }), authController.login);
 */
const { AppError } = require('./errorHandler');

function validate({ body, params, query }) {
  return (req, res, next) => {
    try {
      if (body) req.body = body.parse(req.body);
      if (params) req.params = params.parse(req.params);
      if (query) req.query = query.parse(req.query);
      next();
    } catch (err) {
      next(new AppError('Invalid request', 400, err.errors || err.message));
    }
  };
}

module.exports = { validate };
