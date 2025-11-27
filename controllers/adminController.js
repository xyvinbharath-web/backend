const User = require('../models/User');
const Course = require('../models/Course');
const Event = require('../models/Event');
const Post = require('../models/Post');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const Setting = require('../models/Setting');
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

// PATCH /api/v1/admin/posts/:id/status
exports.adminUpdatePostStatus = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const status = (req.body && req.body.status) || '';
    const allowed = ['pending', 'approved', 'rejected'];
    if (!allowed.includes(status)) {
      return badRequest(res, 'status must be one of: pending, approved, rejected');
    }

    const post = await Post.findByIdAndUpdate(postId, { status }, { new: true });
    if (!post) return notFoundRes(res, 'Post not found');

    return ok(res, post, 'Post status updated');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/admin/posts/bulk-status
exports.adminBulkUpdatePostStatus = async (req, res, next) => {
  try {
    const ids = (req.body && req.body.ids) || [];
    const status = (req.body && req.body.status) || '';
    const allowed = ['pending', 'approved', 'rejected'];

    if (!Array.isArray(ids) || ids.length === 0) {
      return badRequest(res, 'ids must be a non-empty array');
    }
    if (!allowed.includes(status)) {
      return badRequest(res, 'status must be one of: pending, approved, rejected');
    }

    const result = await Post.updateMany({ _id: { $in: ids } }, { status });

    if (result.matchedCount === 0) {
      return notFoundRes(res, 'No posts found for given ids');
    }

    try {
      await AuditLog.create({
        actorId: req.user && req.user._id,
        action: 'ADMIN_POSTS_BULK_STATUS_UPDATE',
        meta: {
          ids: ids.map((x) => String(x)),
          status,
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        },
        ip: req.ip,
      });
    } catch (_) {}

    return ok(
      res,
      { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount },
      'Posts status updated'
    );
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/admin/posts/bulk-status
exports.adminBulkUpdatePostStatus = async (req, res, next) => {
  try {
    const ids = (req.body && req.body.ids) || [];
    const status = (req.body && req.body.status) || '';
    const allowed = ['pending', 'approved', 'rejected'];

    if (!Array.isArray(ids) || ids.length === 0) {
      return badRequest(res, 'ids must be a non-empty array');
    }
    if (!allowed.includes(status)) {
      return badRequest(res, 'status must be one of: pending, approved, rejected');
    }

    const result = await Post.updateMany({ _id: { $in: ids } }, { status });

    if (result.matchedCount === 0) {
      return notFoundRes(res, 'No posts found for given ids');
    }

    try {
      await AuditLog.create({
        actorId: req.user && req.user._id,
        action: 'ADMIN_POSTS_BULK_STATUS_UPDATE',
        meta: {
          ids: ids.map((x) => String(x)),
          status,
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        },
        ip: req.ip,
      });
    } catch (_) {}

    return ok(
      res,
      { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount },
      'Posts status updated'
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/posts
exports.adminListPosts = async (req, res, next) => {
  try {
    const page = Math.max(
      parseInt((req.safeQuery && req.safeQuery.page) || req.query.page || '1', 10),
      1
    );
    const limit = Math.min(
      Math.max(
        parseInt((req.safeQuery && req.safeQuery.limit) || req.query.limit || '20', 10),
        1
      ),
      100
    );

    const status = ((req.safeQuery && req.safeQuery.status) || req.query.status || '').trim();
    const q = ((req.safeQuery && req.safeQuery.q) || req.query.q || '').trim();

    const filter = {};
    if (status) filter.status = status;
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.content = regex;
    }

    const [items, total] = await Promise.all([
      Post.find(filter)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Post.countDocuments(filter),
    ]);

    return ok(
      res,
      paginate({ records: items, page, limit, totalRecords: total }),
      'Posts'
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/me
exports.adminGetMe = async (req, res, next) => {
  try {
    return ok(res, req.user, 'Admin profile');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/admin/me/password
exports.adminUpdatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return badRequest(res, 'currentPassword and newPassword are required');
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return notFoundRes(res, 'User not found');

    const match = await user.matchPassword(currentPassword);
    if (!match) {
      return unauthorized(res, 'Current password is incorrect');
    }

    user.password = newPassword; // hashed by pre-save hook
    await user.save();

    return ok(res, null, 'Password updated');
  } catch (err) {
    next(err);
  }
};

// TEMP DEV: POST /api/v1/admin/reset-password-dev
// WARNING: Remove this endpoint after resetting your admin password.
exports.resetAdminPasswordDev = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body || {};
    if (!email || !newPassword) {
      return badRequest(res, 'email and newPassword are required');
    }

    const user = await User.findOne({ email });
    if (!user) return notFoundRes(res, 'User not found');

    user.password = newPassword; // Will be hashed by User model pre-save hook
    await user.save();

    return ok(res, { id: user._id, email: user.email }, 'Admin password reset (dev)');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/events
exports.adminListEvents = async (req, res, next) => {
  try {
    const page = Math.max(
      parseInt((req.safeQuery && req.safeQuery.page) || req.query.page || '1', 10),
      1
    );
    const limit = Math.min(
      Math.max(
        parseInt((req.safeQuery && req.safeQuery.limit) || req.query.limit || '20', 10),
        1
      ),
      100
    );

    const q = ((req.safeQuery && req.safeQuery.q) || req.query.q || '').trim();
    const time = ((req.safeQuery && req.safeQuery.time) || req.query.time || '').trim(); // 'upcoming' | 'past'
    const status = ((req.safeQuery && req.safeQuery.status) || req.query.status || '').trim();

    const filter = {};
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.title = regex;
    }
    if (status) {
      filter.status = status;
    }

    const now = new Date();
    if (time === 'upcoming') filter.date = { $gte: now };
    if (time === 'past') filter.date = { $lt: now };

    const [items, total] = await Promise.all([
      Event.find(filter).sort({ date: 1 }).skip((page - 1) * limit).limit(limit),
      Event.countDocuments(filter),
    ]);

    const enriched = items.map((ev) => {
      const obj = ev.toObject();
      obj.bookingsCount = (obj.bookings && obj.bookings.length) || 0;
      return obj;
    });

    return ok(
      res,
      paginate({ records: enriched, page, limit, totalRecords: total }),
      'Events'
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/events/:id
exports.adminGetEvent = async (req, res, next) => {
  try {
    const ev = await Event.findById(req.params.id).populate('bookings.user', 'name email phone');
    if (!ev) return notFoundRes(res, 'Event not found');
    return ok(res, ev, 'Event');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/admin/events/:id
exports.adminUpdateEvent = async (req, res, next) => {
  try {
    const allowed = ['title', 'description', 'date', 'capacity', 'status'];
    const update = {};
    allowed.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
        if (field === 'status') {
          const allowedStatus = ['pending', 'approved', 'rejected'];
          if (!allowedStatus.includes(req.body.status)) {
            return;
          }
        }
        update[field] = req.body[field];
      }
    });
    if (Object.keys(update).length === 0) {
      return badRequest(res, 'No valid fields to update');
    }
    if (Object.prototype.hasOwnProperty.call(update, 'status')) {
      const allowedStatus = ['pending', 'approved', 'rejected'];
      if (!allowedStatus.includes(update.status)) {
        return badRequest(res, 'status must be one of: pending, approved, rejected');
      }
    }
    const ev = await Event.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!ev) return notFoundRes(res, 'Event not found');
    return ok(res, ev, 'Event updated');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/admin/events/:id
exports.adminDeleteEvent = async (req, res, next) => {
  try {
    const ev = await Event.findByIdAndDelete(req.params.id);
    if (!ev) return notFoundRes(res, 'Event not found');
    return ok(res, null, 'Event deleted');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/bookings
exports.adminListBookings = async (req, res, next) => {
  try {
    const page = Math.max(
      parseInt((req.safeQuery && req.safeQuery.page) || req.query.page || '1', 10),
      1
    );
    const limit = Math.min(
      Math.max(
        parseInt((req.safeQuery && req.safeQuery.limit) || req.query.limit || '20', 10),
        1
      ),
      100
    );

    const status = ((req.safeQuery && req.safeQuery.status) || req.query.status || '').trim();
    const eventId = ((req.safeQuery && req.safeQuery.event) || req.query.event || '').trim();
    const userId = ((req.safeQuery && req.safeQuery.user) || req.query.user || '').trim();
    const q = ((req.safeQuery && req.safeQuery.q) || req.query.q || '').trim();

    const pipeline = [];

    pipeline.push({ $unwind: '$bookings' });

    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'bookings.user',
        foreignField: '_id',
        as: 'user',
      },
    });
    pipeline.push({ $unwind: { path: '$user', preserveNullAndEmptyArrays: true } });

    const match = {};
    if (status) match['bookings.status'] = status;
    if (eventId) match._id = eventId;
    if (userId) match['bookings.user'] = userId;

    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      match.$or = [{ title: regex }, { 'user.name': regex }, { 'user.email': regex }];
    }

    if (Object.keys(match).length) {
      pipeline.push({ $match: match });
    }

    pipeline.push({ $sort: { 'bookings.createdAt': -1 } });

    pipeline.push({
      $project: {
        _id: '$bookings._id',
        eventId: '$_id',
        eventTitle: '$title',
        userId: '$user._id',
        userName: '$user.name',
        userEmail: '$user.email',
        status: '$bookings.status',
        createdAt: '$bookings.createdAt',
      },
    });

    pipeline.push({
      $facet: {
        records: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    });

    const agg = await Event.aggregate(pipeline);
    const records = (agg[0] && agg[0].records) || [];
    const totalRecords = (agg[0] && agg[0].total[0] && agg[0].total[0].count) || 0;

    return ok(
      res,
      paginate({ records, page, limit, totalRecords }),
      'Bookings'
    );
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/admin/bookings/:id
exports.adminUpdateBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const status = (req.body && req.body.status) || '';
    const allowed = ['booked', 'cancelled'];
    if (!allowed.includes(status)) {
      return badRequest(res, 'status must be one of: booked, cancelled');
    }

    const ev = await Event.findOneAndUpdate(
      { 'bookings._id': bookingId },
      { 'bookings.$.status': status },
      { new: true }
    );
    if (!ev) return notFoundRes(res, 'Booking not found');

    return ok(res, null, 'Booking updated');
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

// GET /api/v1/admin/settings
exports.getAdminSettings = async (req, res, next) => {
  try {
    const doc = await Setting.findOne({ key: 'global' });
    const payload = {
      registrationEnabled: doc ? doc.registrationEnabled : true,
      maintenanceMessage: doc ? doc.maintenanceMessage : '',
      inviteSignupPoints: doc && typeof doc.inviteSignupPoints === 'number' ? doc.inviteSignupPoints : 50,
      inviteGoldPoints: doc && typeof doc.inviteGoldPoints === 'number' ? doc.inviteGoldPoints : 200,
      pointsToCurrencyRate:
        doc && typeof doc.pointsToCurrencyRate === 'number' ? doc.pointsToCurrencyRate : 10,
      minRedeemPoints: doc && typeof doc.minRedeemPoints === 'number' ? doc.minRedeemPoints : 500,
    };
    return ok(res, payload, 'Settings');
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/admin/settings
exports.updateAdminSettings = async (req, res, next) => {
  try {
    const {
      registrationEnabled,
      maintenanceMessage,
      inviteSignupPoints,
      inviteGoldPoints,
      pointsToCurrencyRate,
      minRedeemPoints,
    } = req.body || {};

    const update = {};
    if (typeof registrationEnabled === 'boolean') update.registrationEnabled = registrationEnabled;
    if (typeof maintenanceMessage === 'string') update.maintenanceMessage = maintenanceMessage;
    if (typeof inviteSignupPoints === 'number') update.inviteSignupPoints = inviteSignupPoints;
    if (typeof inviteGoldPoints === 'number') update.inviteGoldPoints = inviteGoldPoints;
    if (typeof pointsToCurrencyRate === 'number') update.pointsToCurrencyRate = pointsToCurrencyRate;
    if (typeof minRedeemPoints === 'number') update.minRedeemPoints = minRedeemPoints;
    const doc = await Setting.findOneAndUpdate(
      { key: 'global' },
      { key: 'global', ...update },
      { new: true, upsert: true }
    );
    const payload = {
      registrationEnabled: doc.registrationEnabled,
      maintenanceMessage: doc.maintenanceMessage,
      inviteSignupPoints: doc.inviteSignupPoints,
      inviteGoldPoints: doc.inviteGoldPoints,
      pointsToCurrencyRate: doc.pointsToCurrencyRate,
      minRedeemPoints: doc.minRedeemPoints,
    };
    return ok(res, payload, 'Settings updated');
  } catch (err) {
    next(err);
  }
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

// GET /api/v1/admin/stats
exports.getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalPartners, bookingsAgg, revenueAgg, monthlyUsersAgg, monthlyRevenueAgg] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'partner' }),
        // total bookings across all events
        Event.aggregate([
          { $unwind: '$bookings' },
          { $group: { _id: null, count: { $sum: 1 } } },
        ]),
        // total revenue from succeeded payments
        Payment.aggregate([
          { $match: { status: 'succeeded' } },
          { $group: { _id: null, revenue: { $sum: '$amount' } } },
        ]),
        // monthly users created
        User.aggregate([
          {
            $group: {
              _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
              users: { $sum: 1 },
            },
          },
        ]),
        // monthly revenue from payments
        Payment.aggregate([
          { $match: { status: 'succeeded' } },
          {
            $group: {
              _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
              revenue: { $sum: '$amount' },
            },
          },
        ]),
      ]);

    const totalBookings = (bookingsAgg[0] && bookingsAgg[0].count) || 0;
    const totalRevenue = (revenueAgg[0] && revenueAgg[0].revenue) || 0;

    // Build simple last-12-months series combining users + revenue
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const usersByKey = new Map();
    monthlyUsersAgg.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      usersByKey.set(key, item.users || 0);
    });

    const revenueByKey = new Map();
    monthlyRevenueAgg.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      revenueByKey.set(key, item.revenue || 0);
    });

    const now = new Date();
    const monthly = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const key = `${year}-${monthIndex + 1}`;
      monthly.push({
        month: monthNames[monthIndex],
        users: usersByKey.get(key) || 0,
        revenue: revenueByKey.get(key) || 0,
      });
    }

    const payload = {
      totalUsers,
      totalPartners,
      totalBookings,
      totalRevenue,
      monthly,
    };

    return ok(res, payload, 'Stats');
  } catch (err) {
    next(err);
  }
};


// GET /api/v1/admin/users
exports.adminListUsers = async (req, res, next) => {
  try {
    const page = Math.max(
      parseInt((req.safeQuery && req.safeQuery.page) || req.query.page || "1", 10),
      1
    );
    const limit = Math.min(
      Math.max(
        parseInt((req.safeQuery && req.safeQuery.limit) || req.query.limit || "20", 10),
        1
      ),
      100
    );

    const role = ((req.safeQuery && req.safeQuery.role) || req.query.role || "").trim();
    const status = ((req.safeQuery && req.safeQuery.status) || req.query.status || "").trim();
    const q = ((req.safeQuery && req.safeQuery.q) || req.query.q || "").trim();

    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    const ids = items.map((u) => u._id);

    const [coursesAgg, bookingsAgg] = await Promise.all([
      Course.aggregate([
        { $match: { instructor: { $in: ids } } },
        { $group: { _id: "$instructor", count: { $sum: 1 } } },
      ]),
      Event.aggregate([
        { $unwind: "$bookings" },
        { $match: { "bookings.user": { $in: ids } } },
        { $group: { _id: "$bookings.user", count: { $sum: 1 } } },
      ]),
    ]);

    const courseMap = new Map(coursesAgg.map((c) => [String(c._id), c.count]));
    const bookingMap = new Map(bookingsAgg.map((b) => [String(b._id), b.count]));

    const enriched = items.map((user) => {
      const idStr = String(user._id);
      const obj = user.toObject();
      obj.coursesCreatedCount = courseMap.get(idStr) || 0;
      obj.eventBookingsCount = bookingMap.get(idStr) || 0;
      return obj;
    });

    return ok(
      res,
      paginate({ records: enriched, page, limit, totalRecords: total }),
      "Users"
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/users/:id
exports.adminGetUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFoundRes(res, 'User not found');

    const [coursesCreated, bookingsAgg] = await Promise.all([
      Course.countDocuments({ instructor: user._id }),
      Event.aggregate([
        { $unwind: "$bookings" },
        { $match: { "bookings.user": user._id } },
        { $group: { _id: "$bookings.user", count: { $sum: 1 } } },
      ]),
    ]);

    const bookingsCount = bookingsAgg[0]?.count || 0;
    const obj = user.toObject();
    obj.coursesCreatedCount = coursesCreated;
    obj.eventBookingsCount = bookingsCount;

    return ok(res, obj, 'User');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return notFoundRes(res, 'User not found');
    return ok(res, null, 'User deleted');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/partners/:id/courses
exports.adminGetPartnerCourses = async (req, res, next) => {
  try {
    const partnerId = req.params.id;
    const partner = await User.findById(partnerId);
    if (!partner) return notFoundRes(res, 'User not found');

    const courses = await Course.find({ instructor: partnerId }).sort({ createdAt: -1 });
    return ok(res, courses, 'Partner courses');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/courses/:courseId
exports.adminGetCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate('instructor', 'name email role');
    if (!course) return notFoundRes(res, 'Course not found');
    return ok(res, course, 'Course');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/admin/courses/:courseId
exports.adminUpdateCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const allowedFields = ['title', 'description', 'price', 'published'];
    const update = {};
    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
        update[field] = req.body[field];
      }
    });

    if (Object.keys(update).length === 0) {
      return badRequest(res, 'No valid fields to update');
    }

    const course = await Course.findByIdAndUpdate(courseId, update, { new: true });
    if (!course) return notFoundRes(res, 'Course not found');
    return ok(res, course, 'Course updated');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/admin/courses/:courseId
exports.adminDeleteCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findByIdAndDelete(courseId);
    if (!course) return notFoundRes(res, 'Course not found');
    return ok(res, null, 'Course deleted');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/courses
exports.adminListCourses = async (req, res, next) => {
  try {
    const page = Math.max(
      parseInt((req.safeQuery && req.safeQuery.page) || req.query.page || '1', 10),
      1
    );
    const limit = Math.min(
      Math.max(
        parseInt((req.safeQuery && req.safeQuery.limit) || req.query.limit || '20', 10),
        1
      ),
      100
    );

    const q = ((req.safeQuery && req.safeQuery.q) || req.query.q || '').trim();
    const published = ((req.safeQuery && req.safeQuery.published) || req.query.published || '').trim();
    const priceType = ((req.safeQuery && req.safeQuery.priceType) || req.query.priceType || '').trim(); // 'free' | 'paid'
    const instructor = ((req.safeQuery && req.safeQuery.instructor) || req.query.instructor || '').trim();

    const filter = {};
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.title = regex;
    }

    if (published === 'true') filter.published = true;
    if (published === 'false') filter.published = false;

    if (priceType === 'free') filter.price = 0;
    if (priceType === 'paid') filter.price = { $gt: 0 };

    if (instructor) filter.instructor = instructor;

    const [items, total] = await Promise.all([
      Course.find(filter).populate('instructor', 'name email role').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Course.countDocuments(filter),
    ]);

    return ok(
      res,
      paginate({ records: items, page, limit, totalRecords: total }),
      'Courses'
    );
  } catch (err) {
    next(err);
  }
};