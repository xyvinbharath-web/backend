const router = require('express').Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const { list, markRead, markAllRead, sendTest } = require('../controllers/notificationController');
const validate = require('../middlewares/validate');
const { markReadSchema, markAllReadSchema } = require('../src/validators/notificationValidators');

router.use(protect);

router.get('/', list);
router.patch('/:id/read', validate(markReadSchema), markRead);
router.patch('/read-all', validate(markAllReadSchema), markAllRead);

// Admin-only test sender
router.post('/test', authorize('admin'), sendTest);

module.exports = router;
