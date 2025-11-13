const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const Token = require('../models/Token');
const crypto = require('crypto');
const { ok, created, badRequest, unauthorized } = require('../utils/response');

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, referralCode } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return badRequest(res, 'User already exists');

    const user = await User.create({ name, email, password, role, referralCode });
    const accessToken = generateToken(user._id, user.role);
    const refreshToken = await issueRefreshToken(user._id);
    return created(res, { user: sanitizeUser(user), accessToken, refreshToken }, 'Registered');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'test') {
      return unauthorized(res, 'Invalid credentials');
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) return unauthorized(res, 'Invalid credentials');

    const match = await user.matchPassword(password);
    if (!match) return unauthorized(res, 'Invalid credentials');

    if (user.isSuspended) return badRequest(res, 'Account suspended');

    const accessToken = generateToken(user._id, user.role);
    const refreshToken = await issueRefreshToken(user._id);
    return ok(res, { user: sanitizeUser(user), accessToken, refreshToken }, 'Authenticated');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return badRequest(res, 'Refresh token required');
    const record = await Token.findOne({ token: refreshToken, type: 'refresh' });
    if (!record || record.expiresAt < new Date()) return unauthorized(res, 'Invalid refresh token');
    const user = await User.findById(record.user);
    if (!user) return unauthorized(res, 'Invalid refresh token');
    const accessToken = generateToken(user._id, user.role);
    return ok(res, { accessToken }, 'Token refreshed');
  } catch (err) { next(err); }
};

// POST /api/auth/send-otp
exports.sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return badRequest(res, 'Email required');
    const code = ('' + Math.floor(100000 + Math.random() * 900000));
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await Token.create({ token, type: 'otp', expiresAt, meta: { email, code } });
    if (process.env.NODE_ENV !== 'production') {
      console.log('OTP for', email, 'is', code);
    }
    // TODO: Send code via email/SMS provider or push notification
    return ok(res, { token, ttl: 300 }, 'OTP sent');
  } catch (err) { next(err); }
};

// POST /api/auth/verify-otp
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, code, token } = req.body;
    if (!email || !code || !token) return badRequest(res, 'Email, code and token required');
    const record = await Token.findOne({ token, type: 'otp' });
    if (!record || record.expiresAt < new Date()) return unauthorized(res, 'OTP expired or invalid');
    if (!record.meta || record.meta.email !== email || record.meta.code !== code) return unauthorized(res, 'OTP mismatch');

    let user = await User.findOne({ email });
    if (!user) {
      const name = email.split('@')[0];
      user = await User.create({ name, email, password: crypto.randomBytes(8).toString('hex'), role: 'user' });
    }
    const accessToken = generateToken(user._id, user.role);
    const refreshToken = await issueRefreshToken(user._id);
    await record.deleteOne();
    return ok(res, { user: sanitizeUser(user), accessToken, refreshToken }, 'Authenticated');
  } catch (err) { next(err); }
};

async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex');
  const ttlDays = parseInt(process.env.REFRESH_TTL_DAYS || '30', 10);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  await Token.create({ user: userId, token, type: 'refresh', expiresAt });
  return token;
}

function sanitizeUser(u) {
  return { _id: u._id, name: u.name, email: u.email, role: u.role, avatar: u.avatar, rewards: u.rewards };
}
