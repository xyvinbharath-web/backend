const router = require('express').Router();
const { protect } = require('../middlewares/authMiddleware');
const { earn, redeem, leaderboard } = require('../controllers/rewardController');
const validate = require('../middlewares/validate');
const { redeemRewardSchema } = require('../src/validators/rewardValidators');

router.post('/earn', protect, earn);
router.post('/redeem', protect, validate(redeemRewardSchema), redeem);
router.get('/leaderboard', leaderboard);

module.exports = router;
