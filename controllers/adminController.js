const User = require('../models/User');
const Course = require('../models/Course');
const Event = require('../models/Event');
const Post = require('../models/Post');
const { ok, notFoundRes } = require('../utils/response');

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
