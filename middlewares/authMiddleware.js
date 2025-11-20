const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { unauthorized, forbidden } = require('../utils/response');

const protect = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'test' && req.headers['x-test-role']) {
      // In tests, when explicitly requested, bypass DB and inject role (and optional user id) via headers
      const testRole = req.headers['x-test-role'] || 'admin';
      const testUserId = req.headers['x-test-user-id'] || 'u_test';
      req.user = { _id: testUserId, role: testRole };
      return next();
    }
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return unauthorized(res, 'Not authorized, token missing');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return unauthorized(res, 'User not found');
    if (req.user.isSuspended || req.user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Account suspended', data: null });
    }

    next();
  } catch (error) {
    return unauthorized(res, 'Not authorized, token failed');
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return forbidden(res, 'Forbidden: insufficient role');
  if (roles.includes('partner') && req.user.role === 'partner_request') {
    return res.status(403).json({ success: false, message: 'Partner approval pending', data: null });
  }
  if (!roles.includes(req.user.role)) {
    return forbidden(res, 'Forbidden: insufficient role');
  }
  next();
};

module.exports = { protect, authorize };

// Optional auth: attaches req.user if a valid Bearer token is present; otherwise proceeds without error
const optionalAuth = async (req, _res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user) req.user = user;
    return next();
  } catch (_) {
    return next();
  }
};

module.exports.optionalAuth = optionalAuth;

// Allows routes where partner_request can access when 'partner' is specified
const authorizeOrPending = (...roles) => (req, res, next) => {
  if (!req.user) return forbidden(res, 'Forbidden: insufficient role');
  // If partner is required, accept partner_request too
  const expanded = roles.includes('partner') ? [...new Set([...roles, 'partner_request'])] : roles;
  if (!expanded.includes(req.user.role)) {
    return forbidden(res, 'Forbidden: insufficient role');
  }
  next();
};

module.exports.authorizeOrPending = authorizeOrPending;
