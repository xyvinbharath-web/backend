const router = require('express').Router();
const { register, refresh, sendOtp, verifyOtp } = require('../controllers/authController');
const validate = require('../middlewares/validate');
const { registerSchema, sendOtpSchema, verifyOtpSchema } = require('../src/validators/authValidators');

// Public registration (users and partners)
router.post('/register', validate(registerSchema), register);

// Phone + OTP login flow for users/partners
router.post('/send-otp', validate(sendOtpSchema), sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);

// Refresh token endpoint (unchanged)
router.post('/refresh', refresh);

module.exports = router;
