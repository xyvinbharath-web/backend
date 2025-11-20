const router = require('express').Router();
const { protect } = require('../middlewares/authMiddleware');
const { createTicket, myTickets, getTicket, addReply } = require('../controllers/ticketController');

router.use(protect);

router.post('/tickets', createTicket);
router.get('/tickets', myTickets);
router.get('/tickets/:id', getTicket);
router.post('/tickets/:id/replies', addReply);

module.exports = router;
