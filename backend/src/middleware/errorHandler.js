/**
 * middleware/errorHandler.js
 * Central place all errors funnel through. Controllers/services should
 * `next(err)` rather than building their own error responses, so the
 * response shape stays consistent everywhere.
 */
const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  // Never leak internals on 5xx in production.
  const isServerError = statusCode >= 500;
  if (isServerError) {
    logger.error({ err, path: req.originalUrl }, 'Unhandled error');
  } else {
    logger.warn({ err: err.message, path: req.originalUrl }, 'Request error');
  }

  res.status(statusCode).json({
    error: {
      message: isServerError && process.env.NODE_ENV === 'production'
        ? 'Something went wrong. Please try again.'
        : err.message,
      details: isServerError ? undefined : err.details
    }
  });
}

module.exports = { AppError, notFoundHandler, errorHandler };
