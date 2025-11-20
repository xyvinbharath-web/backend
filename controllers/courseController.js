const Course = require('../models/Course');
const { ok, created, notFoundRes, forbidden } = require('../utils/response');

// POST /api/courses
exports.createCourse = async (req, res, next) => {
  try {
    const course = await Course.create({ ...req.body, instructor: req.user._id });
    return created(res, course, 'Course created');
  } catch (err) {
    next(err);
  }
};

// GET /api/courses
exports.getCourses = async (req, res, next) => {
  try {
    const isGold = req.user && req.user.membershipTier === 'gold';
    const filter = isGold ? {} : { $or: [{ price: { $exists: false } }, { price: 0 }] };
    const courses = await Course.find(filter).populate('instructor', 'name');
    return ok(res, courses, 'Courses');
  } catch (err) {
    next(err);
  }
};

// GET /api/courses/:id
exports.getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return notFoundRes(res, 'Course not found');
    if ((course.price || 0) > 0) {
      if (!req.user || req.user.membershipTier !== 'gold') {
        return forbidden(res, 'Gold membership required for paid courses');
      }
    }
    return ok(res, course, 'Course');
  } catch (err) {
    next(err);
  }
};

// PUT /api/courses/:id
exports.updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!course) return notFoundRes(res, 'Course not found');
    return ok(res, course, 'Course updated');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/courses/:id
exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return notFoundRes(res, 'Course not found');
    return ok(res, null, 'Course deleted');
  } catch (err) {
    next(err);
  }
};

// POST /api/courses/:id/lessons
exports.addLesson = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return notFoundRes(res, 'Course not found');
    course.lessons.push(req.body);
    await course.save();
    return created(res, course, 'Lesson added');
  } catch (err) {
    next(err);
  }
};

// POST /api/courses/:id/progress
exports.updateProgress = async (req, res, next) => {
  try {
    const { completedLessons, percentage } = req.body;
    const course = await Course.findById(req.params.id);
    if (!course) return notFoundRes(res, 'Course not found');
    if ((course.price || 0) > 0) {
      if (!req.user || req.user.membershipTier !== 'gold') {
        return forbidden(res, 'Gold membership required for paid courses');
      }
    }

    const existing = course.progress.find((p) => String(p.user) === String(req.user._id));
    if (existing) {
      existing.completedLessons = completedLessons || existing.completedLessons;
      existing.percentage = percentage ?? existing.percentage;
    } else {
      course.progress.push({ user: req.user._id, completedLessons: completedLessons || [], percentage: percentage || 0 });
    }
    await course.save();
    return ok(res, course, 'Progress updated');
  } catch (err) {
    next(err);
  }
};
