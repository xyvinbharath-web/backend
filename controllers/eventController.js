const Event = require('../models/Event');
const { ok, created, notFoundRes, badRequest, conflict } = require('../utils/response');

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
    const eventId = req.params.id;

    // First, ensure the event exists
    const existing = await Event.findById(eventId);
    if (!existing) return notFoundRes(res, 'Event not found');

    // Atomic attempt to add a booking only when:
    // - user is not already in bookings
    // - capacity is either unlimited (0) or not yet reached
    const capacityFilter = existing.capacity
      ? { $expr: { $lt: [{ $size: '$bookings' }, existing.capacity] } }
      : {}; // capacity 0 means unlimited in this codebase

    const updated = await Event.findOneAndUpdate(
      {
        _id: eventId,
        'bookings.user': { $ne: req.user._id },
        ...capacityFilter,
      },
      { $push: { bookings: { user: req.user._id } } },
      { new: true }
    );

    if (!updated) {
      // Determine why the atomic update failed: already booked or full
      const fresh = await Event.findById(eventId);
      if (!fresh) return notFoundRes(res, 'Event not found');
      const already = fresh.bookings.find((b) => String(b.user) === String(req.user._id));
      if (already) return conflict(res, 'Already booked');
      if (fresh.capacity && fresh.bookings.length >= fresh.capacity) return badRequest(res, 'Event full');
      return conflict(res, 'Cannot book event');
    }

    return ok(res, updated, 'Event booked');
  } catch (err) {
    next(err);
  }
};
