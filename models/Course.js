const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String },
    videoUrl: { type: String },
    duration: { type: Number },
  },
  { timestamps: true }
);

const progressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    completedLessons: [{ type: Number }],
    percentage: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    price: { type: Number, default: 0 },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lessons: [lessonSchema],
    progress: [progressSchema],
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);
