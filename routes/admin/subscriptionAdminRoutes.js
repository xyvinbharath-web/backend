const router = require('express').Router();
const { protect, authorize } = require('../../middlewares/authMiddleware');
const { listSubscriptions, listPayments, patchUserSubscription } = require('../../src/controllers/admin/subscriptionController');
const validate = require('../../middlewares/validate');
const { adminListSchema, adminPatchSubscriptionSchema } = require('../../src/validators/adminSubscriptionValidators');

router.use(protect, authorize('admin'));

router.get('/subscriptions', validate(adminListSchema), listSubscriptions);
router.get('/payments', validate(adminListSchema), listPayments);
router.patch('/users/:id/subscription', validate(adminPatchSubscriptionSchema), patchUserSubscription);

module.exports = router;
