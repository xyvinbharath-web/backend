const router = require('express').Router();
const { register, login, refresh, sendOtp, verifyOtp } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

module.exports = router;
