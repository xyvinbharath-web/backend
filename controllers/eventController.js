const Event = require('../models/Event');
const { ok, created, notFoundRes, badRequest } = require('../utils/response');

// POST /api/events
exports.createEvent = async (req, res, next) => {
  try {
    const ev = await Event.create(req.body);
    return created(res, ev, 'Event created');
  } catch (err) {
    next(err);
  }
};

// GET /api/events
exports.getEvents = async (req, res, next) => {
  try {
    const events = await Event.find();
    return ok(res, events, 'Events');
  } catch (err) {
    next(err);
  }
};

// POST /api/events/:id/book
exports.bookEvent = async (req, res, next) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) return notFoundRes(res, 'Event not found');
    const already = ev.bookings.find((b) => String(b.user) === String(req.user._id));
    if (already) return badRequest(res, 'Already booked');

    if (ev.capacity && ev.bookings.length >= ev.capacity) return badRequest(res, 'Event full');

    ev.bookings.push({ user: req.user._id });
    await ev.save();
    return ok(res, ev, 'Event booked');
  } catch (err) {
    next(err);
  }
};
