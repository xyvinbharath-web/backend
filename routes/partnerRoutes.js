const router = require('express').Router();
const { authorizeOrPending, protect } = require('../middlewares/authMiddleware');
const { ok } = require('../utils/response');

// GET /api/v1/partner/onboarding
router.get('/onboarding', protect, authorizeOrPending('partner'), (req, res) => {
  return ok(res, {
    steps: [
      'Complete your partner profile',
      'Upload required documents',
      'Wait for final review',
    ],
  }, 'Partner onboarding');
});

module.exports = router;
