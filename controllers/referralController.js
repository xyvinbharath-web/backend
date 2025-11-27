const mongoose = require('mongoose');
const Referral = require('../models/Referral');
const User = require('../models/User');
const Setting = require('../models/Setting');
const { ok, badRequest, notFoundRes } = require('../utils/response');

async function getRewardConfig() {
  const doc = await Setting.findOne({ key: 'global' }).lean();
  return {
    inviteSignupPoints:
      doc && typeof doc.inviteSignupPoints === 'number' ? doc.inviteSignupPoints : 50,
    inviteGoldPoints:
      doc && typeof doc.inviteGoldPoints === 'number' ? doc.inviteGoldPoints : 200,
  };
}

const parseReferralCode = (code) => {
  if (!code || !code.startsWith('INVITE-')) return null;
  const id = code.slice('INVITE-'.length);
  return mongoose.Types.ObjectId.isValid(id) ? id : null;
};

// GET /api/v1/referral/code
exports.getReferralCode = async (req, res, next) => {
  try {
    const code = `INVITE-${req.user._id}`;
    return ok(res, { code }, 'Referral code');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/referral/stats
exports.getReferralStats = async (req, res, next) => {
  try {
    const referrerId = req.user._id;

    const referrals = await Referral.find({ referrerId }).lean();
    const user = await User.findById(referrerId).select('rewards');

    const totalReferred = referrals.length;
    const rewardsIssuedCount = referrals.filter((r) => r.rewardIssued).length;
    const pendingRewardsCount = referrals.filter((r) => !r.rewardIssued && r.subscriptionCompleted).length;

    const rewardsEarned = user ? user.rewards || 0 : 0;

    return ok(
      res,
      {
        totalReferred,
        rewardsEarned,
        pendingRewardsCount,
      },
      'Referral stats'
    );
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/referral/apply
exports.applyReferral = async (req, res, next) => {
  try {
    const { referralCode } = req.body;
    const referredId = req.user._id;

    const referrerId = parseReferralCode(referralCode);
    if (!referrerId) return badRequest(res, 'Invalid referral code');

    if (String(referrerId) === String(referredId)) {
      // Self-referral should always be treated as a bad request, regardless of referrer existence
      return badRequest(res, 'Cannot use your own referral code');
    }

    const existing = await Referral.findOne({ referrerId, referredId });
    if (existing) {
      return ok(res, existing, 'Referral already applied');
    }

    const referral = await Referral.create({
      referrerId,
      referredId,
      rewardIssued: false,
      subscriptionCompleted: false,
    });

    const { inviteSignupPoints } = await getRewardConfig();
    if (inviteSignupPoints > 0) {
      await User.findByIdAndUpdate(referrerId, { $inc: { rewards: inviteSignupPoints } });
    }

    return ok(res, referral, 'Referral applied');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/referral/issue-reward
// Typically called after referred user completes subscription/payment
exports.issueReward = async (req, res, next) => {
  try {
    const { userId } = req.body; // referred user id

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return badRequest(res, 'Invalid user id');
    }

    const referral = await Referral.findOne({ referredId: userId });
    if (!referral) {
      return notFoundRes(res, 'Referral not found');
    }

    if (referral.rewardIssued) {
      return ok(res, referral, 'Reward already issued');
    }

    referral.subscriptionCompleted = true;
    referral.rewardIssued = true;

    const { inviteGoldPoints } = await getRewardConfig();

    const referrer = await User.findByIdAndUpdate(
      referral.referrerId,
      inviteGoldPoints > 0 ? { $inc: { rewards: inviteGoldPoints } } : {},
      { new: true }
    );

    await referral.save();

    return ok(
      res,
      {
        referral,
        referrerRewards: referrer ? referrer.rewards : undefined,
      },
      'Referral reward issued'
    );
  } catch (err) {
    next(err);
  }
};
