const Post = require('../models/Post');
const { uploadBuffer } = require('../services/storageService');
const { ok, created, notFoundRes } = require('../utils/response');

// POST /api/community/posts
exports.createPost = async (req, res, next) => {
  try {
    let image;
    if (req.file && req.file.buffer) {
      const up = await uploadBuffer({ buffer: req.file.buffer, mimeType: req.file.mimetype, keyPrefix: 'posts/' });
      image = up.url;
    }
    const post = await Post.create({ user: req.user._id, content: req.body.content, image });
    return created(res, post, 'Post created');
  } catch (err) {
    next(err);
  }
};

// GET /api/community/posts
exports.getPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({ status: 'approved' })
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    return ok(res, posts, 'Posts');
  } catch (err) {
    next(err);
  }
};

// POST /api/community/posts/:id/like
exports.toggleLike = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return notFoundRes(res, 'Post not found');
    const idx = post.likes.findIndex((u) => String(u) === String(req.user._id));
    if (idx > -1) post.likes.splice(idx, 1);
    else post.likes.push(req.user._id);
    await post.save();
    return ok(res, post, 'Post updated');
  } catch (err) {
    next(err);
  }
};

// POST /api/community/posts/:id/comments
exports.addComment = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return notFoundRes(res, 'Post not found');
    post.comments.push({ user: req.user._id, text: req.body.text });
    await post.save();
    return created(res, post, 'Comment added');
  } catch (err) {
    next(err);
  }
};
