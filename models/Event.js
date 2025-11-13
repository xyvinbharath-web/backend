const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['booked', 'cancelled'], default: 'booked' },
  },
  { timestamps: true }
);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    capacity: { type: Number, default: 0 },
    bookings: [bookingSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
