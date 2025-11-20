const User = require('../models/User');
const Token = require('../models/Token');
const Otp = require('../models/Otp');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');
const { ok, created, badRequest, unauthorized } = require('../utils/response');

// POST /api/v1/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, phone, email, role, referralCode } = req.body || {};

    if (!name || !phone) {
      return badRequest(res, 'name and phone are required');
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return badRequest(res, 'User already exists for phone');
    }

    // Admin accounts are not created via public register
    let finalRole = 'user';
    let status = 'active';
    let pendingApproval = false;

    if (role === 'partner') {
      finalRole = 'partner_request';
      status = 'pending';
      pendingApproval = true;
    }

    const user = await User.create({
      name,
      phone,
      email,
      role: finalRole,
      status,
      referralCode,
    });

    const accessToken = generateToken(user._id, user.role);
    const refreshToken = await issueRefreshToken(user._id);
    const data = { user: sanitizeUser(user), accessToken, refreshToken };
    if (pendingApproval) data.pendingApproval = true;

    return created(res, data, 'Registered');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/send-otp
exports.sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body || {};
    if (!phone) {
      return badRequest(res, 'phone is required');
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return badRequest(res, 'User not found for phone');
    }

    if (user.role === 'partner_request') {
      return res
        .status(403)
        .json({ success: false, message: 'Partner account awaiting admin approval', data: null });
    }

    if (user.isSuspended || user.status === 'suspended') {
      return res
        .status(403)
        .json({ success: false, message: 'Account suspended', data: null });
    }

    await createOtp(phone, 'login');

    return ok(res, { ttl: 300 }, 'OTP sent');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/verify-otp
exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, code } = req.body || {};
    if (!phone || !code) {
      return badRequest(res, 'phone and code are required');
    }

    const now = new Date();
    const record = await Otp.findOne({ phone, code, purpose: 'login' });
    if (!record || record.expiresAt < now) {
      return badRequest(res, 'OTP expired or invalid');
    }

    await record.deleteOne();

    const user = await User.findOne({ phone });
    if (!user) {
      return badRequest(res, 'User not found for phone');
    }

    if (user.role === 'partner_request') {
      return res
        .status(403)
        .json({ success: false, message: 'Partner account awaiting admin approval', data: null });
    }

    if (user.isSuspended || user.status === 'suspended') {
      return res
        .status(403)
        .json({ success: false, message: 'Account suspended', data: null });
    }

    const accessToken = generateToken(user._id, user.role);
    const refreshToken = await issueRefreshToken(user._id);

    return ok(res, { user: sanitizeUser(user), accessToken, refreshToken }, 'Authenticated');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/refresh
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return badRequest(res, 'Refresh token required');

    const record = await Token.findOne({ token: refreshToken, type: 'refresh' });
    if (!record || record.expiresAt < new Date()) return unauthorized(res, 'Invalid refresh token');

    const user = await User.findById(record.user);
    if (!user) return unauthorized(res, 'Invalid refresh token');

    const accessToken = generateToken(user._id, user.role);
    return ok(res, { accessToken }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex');
  const ttlDays = parseInt(process.env.REFRESH_TTL_DAYS || '30', 10);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  await Token.create({ user: userId, token, type: 'refresh', expiresAt });
  return token;
}

function sanitizeUser(u) {
  return {
    _id: u._id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    avatar: u.avatar,
    rewards: u.rewards,
    membershipTier: u.membershipTier,
    status: u.status,
  };
}

async function createOtp(phone, purpose) {
  await Otp.deleteMany({ phone, purpose });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await Otp.create({ phone, code, purpose, expiresAt });
}
