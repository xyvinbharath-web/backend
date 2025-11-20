const mongoose = require('mongoose');
const Follow = require('../models/Follow');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { ok, created, forbidden, badRequest, notFoundRes } = require('../utils/response');
const { getIo } = require('../src/lib/io');

const toObjectId = (id) => (id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id)));

// POST /api/v1/chat/follow/:userId
exports.followUser = async (req, res, next) => {
  try {
    const followerId = toObjectId(req.user._id);
    const followingId = toObjectId(req.params.userId);

    if (String(followerId) === String(followingId)) {
      return badRequest(res, 'Cannot follow yourself');
    }

    await Follow.updateOne(
      { followerId, followingId },
      { $setOnInsert: { followerId, followingId } },
      { upsert: true }
    );

    return ok(res, null, 'Followed');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/chat/unfollow/:userId
exports.unfollowUser = async (req, res, next) => {
  try {
    const followerId = toObjectId(req.user._id);
    const followingId = toObjectId(req.params.userId);

    await Follow.deleteOne({ followerId, followingId });

    return ok(res, null, 'Unfollowed');
  } catch (err) {
    next(err);
  }
};

// Helper to get or create a conversation between two users (members sorted)
const getOrCreateConversation = async (userAId, userBId) => {
  const a = toObjectId(userAId);
  const b = toObjectId(userBId);
  const memberIds = [a, b].sort((x, y) => String(x).localeCompare(String(y)));

  let convo = await Conversation.findOne({ members: memberIds });
  if (!convo) {
    convo = await Conversation.create({ members: memberIds });
  }
  return convo;
};

// POST /api/v1/chat/message
exports.sendMessage = async (req, res, next) => {
  try {
    const senderId = toObjectId(req.user._id);
    const receiverId = toObjectId(req.body.receiverId);
    const { text, attachments = [] } = req.body;

    if (String(senderId) === String(receiverId)) {
      return badRequest(res, 'Cannot send messages to yourself');
    }

    const [f1, f2] = await Promise.all([
      Follow.exists({ followerId: senderId, followingId: receiverId }),
      Follow.exists({ followerId: receiverId, followingId: senderId }),
    ]);

    if (!f1 || !f2) {
      return forbidden(res, 'Messaging requires mutual follow');
    }

    const conversation = await getOrCreateConversation(senderId, receiverId);

    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      receiverId,
      text,
      attachments,
    });

    conversation.lastMessage = text || '[attachment]';
    await conversation.save();

    const io = getIo();
    if (io) {
      io.to(String(receiverId)).emit('message:new', {
        conversationId: String(conversation._id),
        messageId: String(message._id),
        senderId: String(senderId),
        receiverId: String(receiverId),
        text: message.text,
        attachments: message.attachments,
        createdAt: message.createdAt,
      });
    }

    return created(res, message, 'Message sent');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/chat/conversations
exports.getConversations = async (req, res, next) => {
  try {
    const userId = toObjectId(req.user._id);

    const conversations = await Conversation.find({ members: userId })
      .sort({ updatedAt: -1 })
      .lean();

    const otherUserIds = [
      ...new Set(
        conversations
          .map((c) => c.members.map((m) => String(m)))
          .flat()
          .filter((id) => id !== String(userId))
      ),
    ];

    const users = await User.find({ _id: { $in: otherUserIds } })
      .select('_id name phone role')
      .lean();
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const records = conversations.map((c) => {
      const otherId = c.members.map((m) => String(m)).find((id) => id !== String(userId));
      return {
        _id: String(c._id),
        members: c.members.map((m) => String(m)),
        lastMessage: c.lastMessage,
        updatedAt: c.updatedAt,
        otherUser: otherId ? userMap.get(otherId) || { _id: otherId } : null,
      };
    });

    return ok(res, {
      records,
      page: 1,
      limit: records.length,
      totalPages: 1,
      totalRecords: records.length,
    }, 'Conversations');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/chat/conversations/:id/messages
exports.getConversationMessages = async (req, res, next) => {
  try {
    const userId = toObjectId(req.user._id);
    const conversationId = toObjectId(req.params.id);

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return notFoundRes(res, 'Conversation not found');

    const memberIds = conversation.members.map((m) => String(m));
    if (!memberIds.includes(String(userId))) {
      return forbidden(res, 'Not a member of this conversation');
    }

    const page = req.query?.page ? Number(req.query.page) : 1;
    const limit = req.query?.limit ? Number(req.query.limit) : 20;
    const skip = (page - 1) * limit;

    const [totalRecords, messages] = await Promise.all([
      Message.countDocuments({ conversationId }),
      Message.find({ conversationId })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return ok(
      res,
      {
        records: messages.map((m) => ({
          _id: String(m._id),
          conversationId: String(m.conversationId),
          senderId: String(m.senderId),
          receiverId: String(m.receiverId),
          text: m.text,
          attachments: m.attachments,
          seen: m.seen,
          createdAt: m.createdAt,
        })),
        page,
        limit,
        totalPages,
        totalRecords,
      },
      'Conversation messages'
    );
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/chat/message/seen/:messageId
exports.markMessageSeen = async (req, res, next) => {
  try {
    const userId = toObjectId(req.user._id);
    const messageId = toObjectId(req.params.messageId);

    const message = await Message.findById(messageId);
    if (!message) return notFoundRes(res, 'Message not found');

    if (String(message.receiverId) !== String(userId)) {
      return forbidden(res, 'Only the receiver can mark message as seen');
    }

    if (!message.seen) {
      message.seen = true;
      await message.save();

      const io = getIo();
      if (io) {
        io.to(String(message.senderId)).emit('message:seen', {
          messageId: String(message._id),
          conversationId: String(message.conversationId),
        });
      }
    }

    return ok(res, null, 'Message seen');
  } catch (err) {
    next(err);
  }
};
