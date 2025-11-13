const router = require('express').Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // TODO: integrate S3 later

const { protect } = require('../middlewares/authMiddleware');
const { createPost, getPosts, toggleLike, addComment } = require('../controllers/communityController');

router.get('/posts', getPosts);
router.post('/posts', protect, upload.single('image'), createPost);
router.post('/posts/:id/like', protect, toggleLike);
router.post('/posts/:id/comments', protect, addComment);

module.exports = router;
