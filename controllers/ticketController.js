const Ticket = require('../models/Ticket');
const { ok, created, badRequest, notFoundRes, forbidden } = require('../utils/response');
const { paginate } = require('../utils/pagination');

// USER: POST /api/v1/support/tickets
exports.createTicket = async (req, res, next) => {
  try {
    const { subject, message } = req.body || {};
    if (!subject || !message) return badRequest(res, 'subject and message are required');
    const t = await Ticket.create({ user: req.user._id, subject, message });
    return created(res, t, 'Ticket created');
  } catch (err) { next(err); }
};

// USER: GET /api/v1/support/tickets (mine)
exports.myTickets = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.safeQuery?.page || req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.safeQuery?.limit || req.query.limit || '10', 10), 1), 50);
    const [items, total] = await Promise.all([
      Ticket.find({ user: req.user._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Ticket.countDocuments({ user: req.user._id }),
    ]);
    return ok(res, paginate({ records: items, page, limit, totalRecords: total }), 'Tickets');
  } catch (err) { next(err); }
};

// USER/ADMIN: GET /api/v1/support/tickets/:id
exports.getTicket = async (req, res, next) => {
  try {
    const t = await Ticket.findById(req.params.id).populate('user', 'name email');
    if (!t) return notFoundRes(res, 'Ticket not found');
    const isOwner = String(t.user._id || t.user) === String(req.user._id);
    if (!isOwner && req.user.role !== 'admin') return forbidden(res, 'Forbidden');
    return ok(res, t, 'Ticket');
  } catch (err) { next(err); }
};

// USER/ADMIN: POST /api/v1/support/tickets/:id/replies
exports.addReply = async (req, res, next) => {
  try {
    const { message } = req.body || {};
    if (!message) return badRequest(res, 'message is required');
    const t = await Ticket.findById(req.params.id);
    if (!t) return notFoundRes(res, 'Ticket not found');
    const isOwner = String(t.user) === String(req.user._id);
    if (!isOwner && req.user.role !== 'admin') return forbidden(res, 'Forbidden');
    t.replies.push({ user: req.user._id, message });
    await t.save();
    return ok(res, t, 'Reply added');
  } catch (err) { next(err); }
};

// ADMIN: GET /api/v1/admin/support/tickets
exports.adminList = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.safeQuery?.page || req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.safeQuery?.limit || req.query.limit || '10', 10), 1), 100);
    const status = req.safeQuery?.status || req.query.status;
    const filter = status ? { status } : {};
    const [items, total] = await Promise.all([
      Ticket.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Ticket.countDocuments(filter),
    ]);
    return ok(res, paginate({ records: items, page, limit, totalRecords: total }), 'Tickets');
  } catch (err) { next(err); }
};

// ADMIN: PATCH /api/v1/admin/support/tickets/:id/status
exports.adminUpdateStatus = async (req, res, next) => {
  try {
    const allowed = ['open', 'in_progress', 'closed'];
    const status = (req.body && req.body.status) || '';
    if (!allowed.includes(status)) return badRequest(res, 'status must be one of: open, in_progress, closed');
    const t = await Ticket.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!t) return notFoundRes(res, 'Ticket not found');
    return ok(res, t, 'Status updated');
  } catch (err) { next(err); }
};
