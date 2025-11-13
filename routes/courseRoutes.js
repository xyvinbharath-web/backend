const router = require('express').Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  addLesson,
  updateProgress,
} = require('../controllers/courseController');

router.get('/', getCourses);
router.get('/:id', getCourseById);

router.post('/', protect, authorize('partner', 'admin'), createCourse);
router.put('/:id', protect, authorize('partner', 'admin'), updateCourse);
router.delete('/:id', protect, authorize('admin'), deleteCourse);

router.post('/:id/lessons', protect, authorize('partner', 'admin'), addLesson);
router.post('/:id/progress', protect, updateProgress);

module.exports = router;
