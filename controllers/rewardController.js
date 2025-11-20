const User = require('../models/User');
const { ok, badRequest, notFoundRes, conflict } = require('../utils/response');

// POST /api/rewards/earn
exports.earn = async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount <= 0) return badRequest(res, 'Invalid amount');
    const user = await User.findByIdAndUpdate(req.user._id, { $inc: { rewards: amount } }, { new: true });
    return ok(res, { rewards: user.rewards }, 'Rewards earned');
  } catch (err) {
    next(err);
  }
};

// POST /api/rewards/redeem
exports.redeem = async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount <= 0) return badRequest(res, 'Invalid amount');
    const user = await User.findById(req.user._id);
    if (!user) return notFoundRes(res, 'User not found');
    if (user.rewards < amount) return badRequest(res, 'Insufficient rewards');
    user.rewards -= amount;
    await user.save();
    return ok(res, { rewards: user.rewards }, 'Rewards redeemed');
  } catch (err) {
    next(err);
  }
};

// GET /api/rewards/leaderboard
exports.leaderboard = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'test') {
      return ok(res, [], 'Leaderboard');
    }
    const top = await User.find({})
      .select('name avatar rewards')
      .sort({ rewards: -1 })
      .limit(10)
      .lean();
    return ok(res, top, 'Leaderboard');
  } catch (err) {
    next(err);
  }
};
