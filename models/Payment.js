const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    plan: { type: String, enum: ['gold'], required: true },
    status: { type: String, enum: ['pending', 'succeeded', 'failed'], required: true },
    provider: { type: String, default: 'stripe' },
    providerPaymentId: { type: String },
    metadata: { type: Object },
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
