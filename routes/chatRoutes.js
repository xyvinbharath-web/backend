const router = require('express').Router();
const { protect } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const {
  followUserSchema,
  unfollowUserSchema,
  sendMessageSchema,
  getConversationMessagesSchema,
  markMessageSeenSchema,
} = require('../src/validators/chatValidators');
const {
  followUser,
  unfollowUser,
  sendMessage,
  getConversations,
  getConversationMessages,
  markMessageSeen,
} = require('../controllers/chatController');

router.post('/follow/:userId', protect, validate(followUserSchema), followUser);
router.post('/unfollow/:userId', protect, validate(unfollowUserSchema), unfollowUser);
router.post('/message', protect, validate(sendMessageSchema), sendMessage);
router.get('/conversations', protect, getConversations);
router.get('/conversations/:id/messages', protect, validate(getConversationMessagesSchema), getConversationMessages);
router.post('/message/seen/:messageId', protect, validate(markMessageSeenSchema), markMessageSeen);

module.exports = router;
