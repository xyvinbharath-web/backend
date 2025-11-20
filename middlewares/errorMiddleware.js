const crypto = require('crypto');
const logger = require('../utils/logger');

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const traceId = crypto.randomUUID();

  logger.error({
    type: 'error',
    traceId,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  // Future error monitoring integration point (e.g. Sentry/Elastic):
  // Sentry.captureException(err, { tags: { traceId } });

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? 'Internal server error' : err.message || 'Error',
    traceId,
  });
};

module.exports = { notFound, errorHandler };
