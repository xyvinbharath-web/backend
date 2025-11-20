const jwt = require('jsonwebtoken');

function verifyToken(token) {
  if (!token) {
    throw new Error('Token required');
  }
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { verifyToken };
