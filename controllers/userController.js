const User = require('../models/User');
const Course = require('../models/Course');
const { ok, created, badRequest, notFoundRes } = require('../utils/response');
const QRCode = require('qrcode');

// GET /api/users/profile
exports.getProfile = async (req, res, next) => {
  try {
    return ok(res, req.user, 'Profile');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/users/:id/card
exports.getBusinessCard = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('name email role avatar followers following');
    if (!user) return notFoundRes(res, 'User not found');
    const data = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      followers: user.followers?.length || 0,
      following: user.following?.length || 0,
    };
    return ok(res, data, 'Card');
  } catch (err) { next(err); }
};

// GET /api/v1/users/:id/qr
exports.getUserQR = async (req, res, next) => {
  try {
    const profileUrlBase = process.env.PUBLIC_APP_BASE_URL || 'http://localhost:5000';
    const url = `${profileUrlBase}/api/v1/users/${req.params.id}/card`;
    const png = await QRCode.toBuffer(url, { width: 256 });
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(png);
  } catch (err) { next(err); }
};

// POST /api/v1/users/:id/follow
exports.followUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    if (String(targetId) === String(req.user._id)) return badRequest(res, 'Cannot follow yourself');
    const target = await User.findByIdAndUpdate(targetId, { $addToSet: { followers: req.user._id } }, { new: true });
    if (!target) return notFoundRes(res, 'User not found');
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: targetId } });
    return ok(res, { followers: target.followers.length }, 'Followed');
  } catch (err) { next(err); }
};

// POST /api/v1/users/:id/unfollow
exports.unfollowUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    if (String(targetId) === String(req.user._id)) return badRequest(res, 'Cannot unfollow yourself');
    const target = await User.findByIdAndUpdate(targetId, { $pull: { followers: req.user._id } }, { new: true });
    if (!target) return notFoundRes(res, 'User not found');
    await User.findByIdAndUpdate(req.user._id, { $pull: { following: targetId } });
    return ok(res, { followers: target.followers.length }, 'Unfollowed');
  } catch (err) { next(err); }
};

// GET /api/v1/users/:id/followers
exports.listFollowers = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('followers', 'name avatar');
    if (!user) return notFoundRes(res, 'User not found');
    return ok(res, user.followers, 'Followers');
  } catch (err) { next(err); }
};

// GET /api/v1/users/:id/following
exports.listFollowing = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('following', 'name avatar');
    if (!user) return notFoundRes(res, 'User not found');
    return ok(res, user.following, 'Following');
  } catch (err) { next(err); }
};

// PATCH /api/users/rewards
exports.updateRewards = async (req, res, next) => {
  try {
    const body = req.body || {};
    const { delta } = body; // +/- number
    const amount = Number(delta);
    if (!Number.isFinite(amount)) {
      return badRequest(res, 'delta must be a number');
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { rewards: amount } },
      { new: true }
    );
    return ok(res, user, 'Rewards updated');
  } catch (err) {
    next(err);
  }
};

// POST /api/users/referrals
exports.setReferral = async (req, res, next) => {
  try {
    const body = req.body || {};
    const { referredBy } = body; // code or user id
    if (typeof referredBy === 'undefined' || referredBy === null || referredBy === '') {
      return badRequest(res, 'referredBy is required');
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { referredBy },
      { new: true }
    );
    return ok(res, user, 'Referral updated');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/users/profile/update
exports.updateProfile = async (req, res, next) => {
  try {
    const fields = ['name', 'avatar'];
    const updates = {};
    const body = req.body || {};
    fields.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(body, f)) updates[f] = body[f];
    });
    if (Object.keys(updates).length === 0) {
      return badRequest(res, 'No updatable fields provided');
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    return ok(res, user, 'Profile updated');
  } catch (err) { next(err); }
};

// POST /api/v1/users/progress
exports.userProgress = async (req, res, next) => {
  try {
    const { courseId, completedLessons, percentage } = req.body;
    if (!courseId) return badRequest(res, 'courseId required');
    const course = await Course.findById(courseId);
    if (!course) return notFoundRes(res, 'Course not found');
    const existing = course.progress.find((p) => String(p.user) === String(req.user._id));
    if (existing) {
      existing.completedLessons = completedLessons || existing.completedLessons || [];
      existing.percentage = percentage ?? existing.percentage ?? 0;
    } else {
      course.progress.push({ user: req.user._id, completedLessons: completedLessons || [], percentage: percentage || 0 });
    }
    await course.save();
    return ok(res, course, 'Progress updated');
  } catch (err) { next(err); }
};
