const router = require('express').Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const {
  getReferralCodeSchema,
  getReferralStatsSchema,
  applyReferralSchema,
  issueRewardSchema,
} = require('../src/validators/referralValidators');
const {
  getReferralCode,
  getReferralStats,
  applyReferral,
  issueReward,
} = require('../controllers/referralController');

router.get('/code', protect, validate(getReferralCodeSchema), getReferralCode);
router.get('/stats', protect, validate(getReferralStatsSchema), getReferralStats);
router.post('/apply', protect, validate(applyReferralSchema), applyReferral);
// Restrict reward issuance to admin role
router.post('/issue-reward', protect, authorize('admin'), validate(issueRewardSchema), issueReward);

module.exports = router;
