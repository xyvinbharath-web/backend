const router = require('express').Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const { approveUser, suspendUser, getStats } = require('../controllers/adminController');

router.use(protect, authorize('admin'));

router.patch('/users/:id/approve', approveUser);
router.patch('/users/:id/suspend', suspendUser);
router.get('/stats', getStats);

module.exports = router;
