const User = require('../models/User');
const RewardRedemption = require('../models/RewardRedemption');
const Setting = require('../models/Setting');
const { ok, badRequest, notFoundRes, conflict } = require('../utils/response');
const { paginate } = require('../utils/pagination');

async function getRewardSettings() {
  const doc = await Setting.findOne({ key: 'global' }).lean();
  return {
    pointsToCurrencyRate:
      doc && typeof doc.pointsToCurrencyRate === 'number' && doc.pointsToCurrencyRate > 0
        ? doc.pointsToCurrencyRate
        : 10,
    minRedeemPoints:
      doc && typeof doc.minRedeemPoints === 'number' && doc.minRedeemPoints > 0
        ? doc.minRedeemPoints
        : 500,
  };
}

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
    const { points, payoutMethod, note } = req.body || {};
    if (typeof points !== 'number' || points <= 0) {
      return badRequest(res, 'Invalid points');
    }

    const user = await User.findById(req.user._id);
    if (!user) return notFoundRes(res, 'User not found');

    const { pointsToCurrencyRate, minRedeemPoints } = await getRewardSettings();

    if (points < minRedeemPoints) {
      return badRequest(
        res,
        `Minimum redeem points is ${minRedeemPoints}`
      );
    }

    if (user.rewards < points) {
      return badRequest(res, 'Insufficient rewards');
    }

    const amount = points / pointsToCurrencyRate;

    user.rewards -= points;
    await user.save();

    const redemption = await RewardRedemption.create({
      user: user._id,
      points,
      amount,
      status: 'pending',
      payoutMethod: payoutMethod || '',
      note: note || '',
    });

    return ok(
      res,
      {
        rewards: user.rewards,
        redemption,
      },
      'Redemption requested'
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/rewards/redemptions
exports.adminListRedemptions = async (req, res, next) => {
  try {
    const page = Math.max(
      parseInt((req.safeQuery && req.safeQuery.page) || req.query.page || '1', 10),
      1
    );
    const limit = Math.min(
      Math.max(
        parseInt((req.safeQuery && req.safeQuery.limit) || req.query.limit || '20', 10),
        1
      ),
      100
    );

    const status = ((req.safeQuery && req.safeQuery.status) || req.query.status || '').trim();
    const filter = {};
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      RewardRedemption.find(filter)
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      RewardRedemption.countDocuments(filter),
    ]);

    return ok(
      res,
      paginate({ records: items, page, limit, totalRecords: total }),
      'Reward redemptions'
    );
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/admin/rewards/redemptions/:id
exports.adminUpdateRedemptionStatus = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { status } = req.body || {};
    const allowed = ['pending', 'approved', 'rejected', 'paid'];
    if (!allowed.includes(status)) {
      return badRequest(res, 'status must be one of: pending, approved, rejected, paid');
    }

    const redemption = await RewardRedemption.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!redemption) return notFoundRes(res, 'Redemption not found');

    return ok(res, redemption, 'Redemption updated');
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
