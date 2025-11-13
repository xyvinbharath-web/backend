const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { unauthorized, forbidden } = require('../utils/response');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return unauthorized(res, 'Not authorized, token missing');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return unauthorized(res, 'User not found');

    next();
  } catch (error) {
    return unauthorized(res, 'Not authorized, token failed');
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return forbidden(res, 'Forbidden: insufficient role');
  }
  next();
};

module.exports = { protect, authorize };
