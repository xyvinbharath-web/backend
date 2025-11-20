const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
  {
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referredId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rewardIssued: { type: Boolean, default: false },
    subscriptionCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

referralSchema.index({ referrerId: 1, referredId: 1 }, { unique: true });

module.exports = mongoose.model('Referral', referralSchema);
