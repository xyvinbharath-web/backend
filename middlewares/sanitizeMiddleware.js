// Lightweight sanitizer compatible with Express 5
// - Sanitizes req.body and req.params in place
// - Provides req.safeQuery (sanitized clone of req.query) without reassigning req.query
const mongoSanitize = require('express-mongo-sanitize');

function stripXSS(str) {
  if (typeof str !== 'string') return str;
  // Remove script/style tags and their content, and basic event handlers
  return str
    .replace(/<\/(script|style)>/gi, '')
    .replace(/<(script|style)[^>]*>[\s\S]*?/gi, '')
    .replace(/on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/on[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:\s*/gi, '')
    .replace(/<[^>]+>/g, '');
}

function deepSanitize(input) {
  if (Array.isArray(input)) return input.map(deepSanitize);
  if (input && typeof input === 'object') {
    const out = Array.isArray(input) ? [] : {};
    for (const k of Object.keys(input)) out[k] = deepSanitize(input[k]);
    return out;
  }
  if (typeof input === 'string') return stripXSS(input);
  return input;
}

module.exports = function sanitizeMiddleware(req, res, next) {
  try {
    if (req.body) {
      req.body = deepSanitize(req.body);
      req.body = mongoSanitize.sanitize(req.body);
    }
    if (req.params) {
      req.params = deepSanitize(req.params);
      req.params = mongoSanitize.sanitize(req.params);
    }
    // clone and sanitize query into a safe accessor
    try {
      const q = req.query || {};
      req.safeQuery = deepSanitize({ ...q });
      req.safeQuery = mongoSanitize.sanitize(req.safeQuery);
    } catch (_) {
      req.safeQuery = {};
    }
    next();
  } catch (e) {
    // If anything goes wrong, do not block the request
    next();
  }
};
