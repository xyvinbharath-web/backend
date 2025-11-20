const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const { statusCode } = res;
    const userId = req.user ? String(req.user._id) : null;

    logger.info({
      type: 'http',
      method,
      path: originalUrl,
      status: statusCode,
      durationMs,
      userId,
    });
  });

  next();
}

module.exports = requestLogger;
