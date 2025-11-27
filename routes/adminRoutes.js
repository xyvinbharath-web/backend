const router = require('express').Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const { adminLogin, approveUser, suspendUser, getStats, setMembership, setRole, setStatus, invitePartner, adminAuditLogs, adminListUsers, adminGetUser, deleteUser, adminGetPartnerCourses, adminListCourses, adminGetCourse, adminUpdateCourse, adminDeleteCourse, adminListEvents, adminGetEvent, adminUpdateEvent, adminDeleteEvent, adminListBookings, adminUpdateBooking, resetAdminPasswordDev, adminGetMe, adminUpdatePassword, getAdminSettings, updateAdminSettings, adminListPosts, adminUpdatePostStatus, adminBulkUpdatePostStatus } = require('../controllers/adminController');
const { adminList, adminUpdateStatus } = require('../controllers/ticketController');
const { adminListRedemptions, adminUpdateRedemptionStatus } = require('../controllers/rewardController');

// Public admin login (email + password only)
router.post('/login', adminLogin);

// TEMP DEV-ONLY: reset admin password by email. REMOVE AFTER USE.
router.post('/reset-password-dev', resetAdminPasswordDev);

// All routes below require authenticated admin
router.use(protect, authorize('admin'));

router.get('/me', adminGetMe);
router.patch('/me/password', adminUpdatePassword);

router.get('/users', adminListUsers);
router.get('/users/:id', adminGetUser);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/approve', approveUser);
router.patch('/users/:id/suspend', suspendUser);
router.patch('/users/:id/membership', setMembership);
router.patch('/users/:id/role', setRole);
router.patch('/users/:id/status', setStatus);
router.post('/invite-partner', invitePartner);
router.get('/audit-logs', adminAuditLogs);
router.get('/stats', getStats);
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);
// Posts (admin)
router.get('/posts', adminListPosts);
router.patch('/posts/:id/status', adminUpdatePostStatus);
router.patch('/posts/bulk-status', adminBulkUpdatePostStatus);
// Reward redemptions (admin)
router.get('/rewards/redemptions', adminListRedemptions);
router.patch('/rewards/redemptions/:id', adminUpdateRedemptionStatus);
// Bookings (admin)
router.get('/bookings', adminListBookings);
router.patch('/bookings/:id', adminUpdateBooking);
// Events (admin)
router.get('/events', adminListEvents);
router.get('/events/:id', adminGetEvent);
router.patch('/events/:id', adminUpdateEvent);
router.delete('/events/:id', adminDeleteEvent);
// Courses (admin)
router.get('/partners/:id/courses', adminGetPartnerCourses);
router.get('/courses', adminListCourses);
router.get('/courses/:courseId', adminGetCourse);
router.patch('/courses/:courseId', adminUpdateCourse);
router.delete('/courses/:courseId', adminDeleteCourse);
// Support tickets (admin)
router.get('/support/tickets', adminList);
router.patch('/support/tickets/:id/status', adminUpdateStatus);

module.exports = router;
