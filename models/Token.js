const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    token: { type: String, required: true, index: true },
    type: { type: String, enum: ['refresh', 'otp'], required: true },
    expiresAt: { type: Date, required: true },
    meta: { type: Object },
  },
  { timestamps: true }
);

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Token', tokenSchema);
