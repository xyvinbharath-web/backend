const request = require('supertest');
const mongoose = require('mongoose');

// Use the real server and Socket.io integration; we only assert on HTTP and DB state
const app = require('../../server');
const User = require('../../models/User');
const Follow = require('../../models/Follow');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');

const asUser = (agent, userId) =>
  agent.set('Authorization', 'Bearer test-token').set('x-test-role', 'user').set('x-test-user-id', String(userId));

const objectId = () => new mongoose.Types.ObjectId();

describe('Chat API', () => {
  let userA;
  let userB;
  let userC;

  beforeAll(async () => {
    userA = await User.create({ name: 'User A', phone: '+911111111111', role: 'user' });
    userB = await User.create({ name: 'User B', phone: '+922222222222', role: 'user' });
    userC = await User.create({ name: 'User C', phone: '+933333333333', role: 'user' });
  });

  beforeEach(async () => {
    await Promise.all([Follow.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({})]);
  });

  // 1) FOLLOW / UNFOLLOW
  describe('Follow / Unfollow', () => {
    it('follow user, idempotent, self-follow and invalid id', async () => {
      // follow userB as userA
      let res = await asUser(request(app).post(`/api/v1/chat/follow/${userB._id}`), userA._id);
      expect(res.status).toBe(200);

      // follow twice -> still 200
      res = await asUser(request(app).post(`/api/v1/chat/follow/${userB._id}`), userA._id);
      expect(res.status).toBe(200);

      // self-follow -> 400
      res = await asUser(request(app).post(`/api/v1/chat/follow/${userA._id}`), userA._id);
      expect(res.status).toBe(400);

      // invalid ObjectId -> 400 from validator
      res = await asUser(request(app).post('/api/v1/chat/follow/not-an-id'), userA._id);
      expect(res.status).toBe(400);
    });

    it('unfollow user is idempotent', async () => {
      // first follow, then unfollow
      await asUser(request(app).post(`/api/v1/chat/follow/${userB._id}`), userA._id);

      let res = await asUser(request(app).post(`/api/v1/chat/unfollow/${userB._id}`), userA._id);
      expect(res.status).toBe(200);

      // unfollow again -> still 200
      res = await asUser(request(app).post(`/api/v1/chat/unfollow/${userB._id}`), userA._id);
      expect(res.status).toBe(200);
    });
  });

  // Helper to create mutual follow between A and B
  const makeMutualFollow = async () => {
    await asUser(request(app).post(`/api/v1/chat/follow/${userB._id}`), userA._id);
    await asUser(request(app).post(`/api/v1/chat/follow/${userA._id}`), userB._id);
  };

  // 2) SEND MESSAGE
  describe('Send message', () => {
    it('requires mutual follow and sends message with attachments', async () => {
      await makeMutualFollow();

      const payload = {
        receiverId: String(userB._id),
        text: 'Hello B',
        attachments: ['https://example.com/file1.png'],
      };

      const res = await asUser(request(app).post('/api/v1/chat/message').send(payload), userA._id);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toMatchObject({
        senderId: String(userA._id),
        receiverId: String(userB._id),
        text: 'Hello B',
        attachments: ['https://example.com/file1.png'],
      });
    });

    it('rejects self-message with 400', async () => {
      await makeMutualFollow();

      const res = await asUser(
        request(app).post('/api/v1/chat/message').send({ receiverId: String(userA._id), text: 'hi self' }),
        userA._id
      );
      expect(res.status).toBe(400);
    });

    it('rejects when not mutual follow with 403', async () => {
      // Only A follows B
      await asUser(request(app).post(`/api/v1/chat/follow/${userB._id}`), userA._id);

      const res = await asUser(
        request(app).post('/api/v1/chat/message').send({ receiverId: String(userB._id), text: 'hi' }),
        userA._id
      );
      expect(res.status).toBe(403);
    });

    it('invalid payload gives 400', async () => {
      await makeMutualFollow();

      const res = await asUser(
        request(app).post('/api/v1/chat/message').send({ receiverId: String(userB._id) }),
        userA._id
      );
      expect(res.status).toBe(400);
    });
  });

  // 3) GET CONVERSATIONS
  describe('Get conversations', () => {
    it('returns conversations with lastMessage and otherUser', async () => {
      await makeMutualFollow();
      await asUser(
        request(app).post('/api/v1/chat/message').send({ receiverId: String(userB._id), text: 'conv msg' }),
        userA._id
      );

      const res = await asUser(request(app).get('/api/v1/chat/conversations'), userA._id);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      const { records } = res.body.data;
      expect(Array.isArray(records)).toBe(true);
      expect(records.length).toBeGreaterThanOrEqual(1);
      const conv = records[0];
      expect(conv).toHaveProperty('lastMessage');
      expect(conv).toHaveProperty('otherUser');
      expect(conv.members).toContain(String(userA._id));
      expect(conv.members).toContain(String(userB._id));
    });

    it('returns empty list when no conversations', async () => {
      const res = await asUser(request(app).get('/api/v1/chat/conversations'), userC._id);
      expect(res.status).toBe(200);
      expect(res.body.data.records).toEqual([]);
      expect(res.body.data.totalRecords).toBe(0);
    });
  });

  // 4) GET MESSAGES (pagination)
  describe('Get conversation messages', () => {
    let conversationId;

    beforeEach(async () => {
      await makeMutualFollow();
      // send a few messages A -> B
      for (let i = 0; i < 5; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await asUser(
          request(app).post('/api/v1/chat/message').send({ receiverId: String(userB._id), text: `msg-${i}` }),
          userA._id
        );
      }
      const convs = await Conversation.find({}).lean();
      conversationId = convs[0]._id;
    });

    it('returns paginated messages for member', async () => {
      const res = await asUser(
        request(app)
          .get(`/api/v1/chat/conversations/${conversationId}/messages`)
          .query({ page: 1, limit: 2 }),
        userA._id
      );
      expect(res.status).toBe(200);
      expect(res.body.data.records.length).toBeLessThanOrEqual(2);
      expect(res.body.data.totalRecords).toBeGreaterThanOrEqual(5);
    });

    it('returns 403 for non-member', async () => {
      const res = await asUser(
        request(app).get(`/api/v1/chat/conversations/${conversationId}/messages`),
        userC._id
      );
      expect(res.status).toBe(403);
    });

    it('returns 404 when conversation not found', async () => {
      const fakeId = objectId();
      const res = await asUser(
        request(app).get(`/api/v1/chat/conversations/${fakeId}/messages`),
        userA._id
      );
      expect(res.status).toBe(404);
    });
  });

  // 5) MARK MESSAGE SEEN
  describe('Mark message seen', () => {
    it('allows receiver to mark seen and emits event', async () => {
      await makeMutualFollow();
      const sendRes = await asUser(
        request(app).post('/api/v1/chat/message').send({ receiverId: String(userB._id), text: 'to be seen' }),
        userA._id
      );
      const messageId = sendRes.body.data._id;

      const res = await asUser(
        request(app).post(`/api/v1/chat/message/seen/${messageId}`),
        userB._id
      );
      expect(res.status).toBe(200);

      const updated = await Message.findById(messageId);
      expect(updated.seen).toBe(true);
    });

    it('prevents sender from marking seen', async () => {
      await makeMutualFollow();
      const sendRes = await asUser(
        request(app).post('/api/v1/chat/message').send({ receiverId: String(userB._id), text: 'blocked seen' }),
        userA._id
      );
      const messageId = sendRes.body.data._id;

      const res = await asUser(
        request(app).post(`/api/v1/chat/message/seen/${messageId}`),
        userA._id
      );
      expect(res.status).toBe(403);
    });

    it('returns 404 when message not found', async () => {
      const fakeId = objectId();
      const res = await asUser(
        request(app).post(`/api/v1/chat/message/seen/${fakeId}`),
        userA._id
      );
      expect(res.status).toBe(404);
    });
  });
});
