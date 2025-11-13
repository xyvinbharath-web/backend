const router = require('express').Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const { createEvent, getEvents, bookEvent } = require('../controllers/eventController');

router.get('/', getEvents);
router.post('/', protect, authorize('partner', 'admin'), createEvent);
router.post('/:id/book', protect, bookEvent);

module.exports = router;
