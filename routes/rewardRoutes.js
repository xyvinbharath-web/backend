const router = require('express').Router();
const { protect } = require('../middlewares/authMiddleware');
const { earn, redeem } = require('../controllers/rewardController');

router.post('/earn', protect, earn);
router.post('/redeem', protect, redeem);

module.exports = router;
