const Notification = require('../models/Notification');
const { ok, created, badRequest, notFoundRes } = require('../utils/response');
const { paginate } = require('../utils/pagination');

// GET /api/v1/notifications
exports.list = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.safeQuery?.page || req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.safeQuery?.limit || req.query.limit || '10', 10), 1), 50);
    const filter = { user: req.user._id };
    const [items, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Notification.countDocuments(filter),
    ]);
    return ok(res, paginate({ records: items, page, limit, totalRecords: total }), 'Notifications');
  } catch (err) { next(err); }
};

// PATCH /api/v1/notifications/:id/read
exports.markRead = async (req, res, next) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { read: true } },
      { new: true }
    );
    if (!n) return notFoundRes(res, 'Notification not found');
    return ok(res, n, 'Marked read');
  } catch (err) { next(err); }
};

// PATCH /api/v1/notifications/read-all
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
    return ok(res, null, 'All marked read');
  } catch (err) { next(err); }
};

// POST /api/v1/notifications/test (admin)
exports.sendTest = async (req, res, next) => {
  try {
    const { userId, title, body, type, data } = req.body || {};
    if (!userId || !title || !type) return badRequest(res, 'userId, title and type are required');
    const n = await Notification.create({ user: userId, title, body, type, data });
    return created(res, n, 'Test notification created');
  } catch (err) { next(err); }
};
