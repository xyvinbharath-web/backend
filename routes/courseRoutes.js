const router = require('express').Router();
const { protect, authorize, optionalAuth } = require('../middlewares/authMiddleware');
const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  addLesson,
  updateProgress,
} = require('../controllers/courseController');
const {
  listCourseReviews,
  courseRatingSummary,
  upsertReview,
} = require('../controllers/reviewController');

router.get('/', optionalAuth, getCourses);
router.get('/:id', optionalAuth, getCourseById);

router.post('/', protect, authorize('partner', 'admin'), createCourse);
router.put('/:id', protect, authorize('partner', 'admin'), updateCourse);
router.delete('/:id', protect, authorize('admin'), deleteCourse);

router.post('/:id/lessons', protect, authorize('partner', 'admin'), addLesson);
router.post('/:id/progress', protect, updateProgress);

// Reviews (courses)
router.get('/:courseId/reviews', optionalAuth, listCourseReviews);
router.get('/:courseId/reviews/summary', optionalAuth, courseRatingSummary);
router.post('/:courseId/reviews', protect, upsertReview);

module.exports = router;
