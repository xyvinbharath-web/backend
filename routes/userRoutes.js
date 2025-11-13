const router = require('express').Router();
const { protect } = require('../middlewares/authMiddleware');
const { getProfile, updateRewards, setReferral, updateProfile, userProgress, getUserQR, getBusinessCard, followUser, unfollowUser, listFollowers, listFollowing } = require('../controllers/userController');

router.get('/profile', protect, getProfile);
router.patch('/rewards', protect, updateRewards);
router.post('/referrals', protect, setReferral);
router.patch('/profile/update', protect, updateProfile);
router.post('/progress', protect, userProgress);

// Public QR/card
router.get('/:id/qr', getUserQR);
router.get('/:id/card', getBusinessCard);

// Follow system
router.post('/:id/follow', protect, followUser);
router.post('/:id/unfollow', protect, unfollowUser);
router.get('/:id/followers', listFollowers);
router.get('/:id/following', listFollowing);

module.exports = router;
