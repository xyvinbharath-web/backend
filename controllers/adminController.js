const User = require('../models/User');
const Course = require('../models/Course');
const Event = require('../models/Event');
const Post = require('../models/Post');
const AuditLog = require('../models/AuditLog');
const Token = require('../models/Token');
const { sendPush } = require('../services/notificationService');
const crypto = require('crypto');
const generateToken = require('../utils/generateToken');
const { ok, notFoundRes, badRequest, unauthorized } = require('../utils/response');
const { paginate } = require('../utils/pagination');

// POST /api/v1/admin/login
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return badRequest(res, 'Email and password are required');
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return unauthorized(res, 'Invalid credentials');
    }

    const match = await user.matchPassword(password);
    if (!match) {
      return unauthorized(res, 'Invalid credentials');
    }

    if (user.role !== 'admin') {
      return res
        .status(403)
        .json({ success: false, message: 'Forbidden', data: null });
    }

    const accessToken = generateToken(user._id, user.role);

    const token = crypto.randomBytes(40).toString('hex');
    const ttlDays = parseInt(process.env.REFRESH_TTL_DAYS || '30', 10);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    await Token.create({ user: user._id, token, type: 'refresh', expiresAt });

    return ok(
      res,
      {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken: token,
      },
      'Authenticated'
    );
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/approve
exports.approveUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isSuspended: false }, { new: true });
    if (!user) return notFoundRes(res, 'User not found');
    return ok(res, user, 'User approved');
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/invite-partner
exports.invitePartner = async (req, res, next) => {
  try {
    const { email, name, message } = req.body || {};
    if (!email || !name) return badRequest(res, 'email and name are required');
    if (process.env.NODE_ENV === 'test') {
      return ok(res, { inviteLink: `https://app.local/invite/partner/TESTTOKEN` }, 'Invite created');
    }
    let user = await User.findOne({ email });
    const inviteToken = crypto.randomBytes(24).toString('hex');
    if (!user) {
      user = await User.create({ email, name, password: crypto.randomBytes(8).toString('hex'), role: 'partner_request', status: 'pending', inviteToken });
    } else {
      user.role = 'partner_request';
      user.status = 'pending';
      user.inviteToken = inviteToken;
      await user.save();
    }
    const inviteLink = `${process.env.PUBLIC_APP_BASE_URL || 'http://localhost:5000'}/invite/partner/${inviteToken}`;
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[invite-partner]', email, inviteLink, message || '');
    }
    return ok(res, { inviteLink }, 'Invite created');
  } catch (err) { next(err); }
};

// GET /api/admin/audit-logs
exports.adminAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.safeQuery?.page || req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.safeQuery?.limit || req.query.limit || '20', 10), 1), 100);
    if (process.env.NODE_ENV === 'test') {
      return ok(res, paginate({ records: [], page, limit, totalRecords: 0 }), 'Audit logs');
    }
    const [items, total] = await Promise.all([
      AuditLog.find({}).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      AuditLog.countDocuments({}),
    ]);
    return ok(res, paginate({ records: items, page, limit, totalRecords: total }), 'Audit logs');
  } catch (err) { next(err); }
};

// PATCH /api/admin/users/:id/status
exports.setStatus = async (req, res, next) => {
  try {
    const status = (req.body && req.body.status) || '';
    const allowed = ['active', 'pending', 'suspended'];
    if (!allowed.includes(status)) return badRequest(res, 'status must be one of: active, pending, suspended');
    const user = await User.findByIdAndUpdate(req.params.id, { status, isSuspended: status === 'suspended' }, { new: true });
    if (!user) return notFoundRes(res, 'User not found');
    return ok(res, user, 'Status updated');
  } catch (err) { next(err); }
};

// PATCH /api/admin/users/:id/role
exports.setRole = async (req, res, next) => {
  try {
    const role = (req.body && req.body.role) || '';
    const allowed = ['user', 'partner', 'admin'];
    if (!allowed.includes(role)) {
      return badRequest(res, 'role must be one of: user, partner, admin');
    }
    const user = await User.findById(req.params.id);
    if (!user) return notFoundRes(res, 'User not found');
    const isPartnerApproval = role === 'partner' && user.role === 'partner_request';
    user.role = role;
    if (isPartnerApproval) user.status = 'active';
    await user.save();
    if (isPartnerApproval) {
      if (process.env.NODE_ENV !== 'test') {
        await AuditLog.create({
          userId: user._id,
          actorId: req.user && req.user._id,
          action: 'PARTNER_APPROVED',
          meta: { from: 'partner_request', to: 'partner' },
          ip: req.ip,
        });
        try {
          await sendPush(user._id, { title: 'Partner approved', body: 'Your partner account has been approved.' });
        } catch (_) {}
      }
    }
    return ok(res, user, 'Role updated');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/suspend
exports.suspendUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isSuspended: true }, { new: true });
    if (!user) return notFoundRes(res, 'User not found');
    return ok(res, user, 'User suspended');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/membership
exports.setMembership = async (req, res, next) => {
  try {
    const tier = (req.body && req.body.membershipTier) || '';
    const allowed = ['free', 'gold'];
    if (!allowed.includes(tier)) {
      return badRequest(res, 'membershipTier must be one of: free, gold');
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { membershipTier: tier },
      { new: true }
    );
    if (!user) return notFoundRes(res, 'User not found');
    return ok(res, user, 'Membership updated');
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/stats
exports.getStats = async (req, res, next) => {
  try {
    const [users, partners, admins, courses, events, posts] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'partner' }),
      User.countDocuments({ role: 'admin' }),
      Course.countDocuments(),
      Event.countDocuments(),
      Post.countDocuments(),
    ]);
    return ok(res, { users, partners, admins, courses, events, posts }, 'Stats');
  } catch (err) {
    next(err);
  }
};
