const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: function requiredPassword() {
        return this.role === 'admin';
      },
      select: false,
    },
    phone: {
      type: String,
      required: function requiredPhone() {
        return this.role !== 'admin';
      },
      index: true,
      sparse: true,
      unique: true,
    },
    role: { type: String, enum: ['user', 'partner_request', 'partner', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'pending', 'suspended'], default: 'active' },
    avatar: { type: String },
    rewards: { type: Number, default: 0 },
    membershipTier: { type: String, enum: ['free', 'gold'], default: 'free' },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: String },
    isSuspended: { type: Boolean, default: false },
    inviteToken: { type: String, index: true, sparse: true },
    isVerified: { type: Boolean, default: false },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
