const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    registrationEnabled: { type: Boolean, default: true },
    maintenanceMessage: { type: String, default: '' },
    // Reward system configuration
    inviteSignupPoints: { type: Number, default: 50 },
    inviteGoldPoints: { type: Number, default: 200 },
    pointsToCurrencyRate: { type: Number, default: 10 }, // e.g. 10 points = 1 unit
    minRedeemPoints: { type: Number, default: 500 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
