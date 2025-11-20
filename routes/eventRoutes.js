const router = require('express').Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const { createEvent, getEvents, bookEvent } = require('../controllers/eventController');
const validate = require('../middlewares/validate');
const { createEventSchema, bookEventSchema } = require('../src/validators/eventValidators');

router.get('/', getEvents);
router.post('/', protect, authorize('partner', 'admin'), validate(createEventSchema), createEvent);
router.post('/:id/book', protect, validate(bookEventSchema), bookEvent);

module.exports = router;
