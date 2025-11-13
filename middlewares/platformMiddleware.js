module.exports = function platform(req, res, next) {
  const platform = req.headers['x-platform'] || req.headers['platform'] || 'web';
  req.platform = typeof platform === 'string' ? platform.toLowerCase() : 'web';
  next();
}
