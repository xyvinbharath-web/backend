const router = require('express').Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const { adminLogin, approveUser, suspendUser, getStats, setMembership, setRole, setStatus, invitePartner, adminAuditLogs } = require('../controllers/adminController');
const { adminList, adminUpdateStatus } = require('../controllers/ticketController');

// Public admin login (email + password only)
router.post('/login', adminLogin);

// All routes below require authenticated admin
router.use(protect, authorize('admin'));

router.patch('/users/:id/approve', approveUser);
router.patch('/users/:id/suspend', suspendUser);
router.patch('/users/:id/membership', setMembership);
router.patch('/users/:id/role', setRole);
router.patch('/users/:id/status', setStatus);
router.post('/invite-partner', invitePartner);
router.get('/audit-logs', adminAuditLogs);
router.get('/stats', getStats);
// Support tickets (admin)
router.get('/support/tickets', adminList);
router.patch('/support/tickets/:id/status', adminUpdateStatus);

module.exports = router;
