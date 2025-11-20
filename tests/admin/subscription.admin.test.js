const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../../server');
const User = require('../../models/User');
const Payment = require('../../models/Payment');
const Notification = require('../../models/Notification');
const { expireSubscriptionsNow } = require('../../cron/subscriptions.cron');

// Helper to get headers for admin auth in tests
const adminHeaders = { 'x-test-role': 'admin', 'x-test-user-id': new mongoose.Types.ObjectId().toHexString() };

describe('Admin Subscription Management', () => {
  describe('GET /api/v1/admin/subscriptions', () => {
    it('returns paginated results and filters by plan and status', async () => {
      await User.create([
        { name: 'Free User', phone: '100', membershipTier: 'free' },
        { name: 'Gold Active', phone: '101', membershipTier: 'gold', subscription: { plan: 'gold', status: 'active' } },
        { name: 'Gold Expired', phone: '102', membershipTier: 'gold', subscription: { plan: 'gold', status: 'expired' } },
      ]);

      const res = await request(app)
        .get('/api/v1/admin/subscriptions?plan=gold&status=active&page=1&limit=10')
        .set(adminHeaders)
        .expect(200);

      expect(res.body).toMatchObject({ success: true, message: 'Subscriptions list' });
      expect(res.body.data).toHaveProperty('records');
      expect(Array.isArray(res.body.data.records)).toBe(true);
      expect(res.body.data.records.length).toBe(1);
      expect(res.body.data.records[0].subscription).toMatchObject({ plan: 'gold', status: 'active' });
      expect(res.body.data).toHaveProperty('page', 1);
      expect(res.body.data).toHaveProperty('limit', 10);
      expect(res.body.data).toHaveProperty('totalPages');
      expect(res.body.data).toHaveProperty('totalRecords');
    });
  });

  describe('GET /api/v1/admin/payments', () => {
    it('returns payments list with filters and pagination', async () => {
      const userId = new mongoose.Types.ObjectId();
      await Payment.create([
        { user: userId, amount: 1000, currency: 'usd', plan: 'gold', status: 'succeeded' },
        { user: userId, amount: 1000, currency: 'usd', plan: 'gold', status: 'failed' },
      ]);

      const res = await request(app)
        .get('/api/v1/admin/payments?plan=gold&status=succeeded&page=1&limit=10')
        .set(adminHeaders)
        .expect(200);

      expect(res.body).toMatchObject({ success: true, message: 'Payments list' });
      expect(res.body.data).toHaveProperty('records');
      expect(Array.isArray(res.body.data.records)).toBe(true);
      expect(res.body.data.records.length).toBe(1);
      expect(res.body.data.records[0]).toMatchObject({ plan: 'gold', status: 'succeeded' });
      expect(res.body.data).toHaveProperty('page', 1);
      expect(res.body.data).toHaveProperty('limit', 10);
      expect(res.body.data).toHaveProperty('totalPages');
      expect(res.body.data).toHaveProperty('totalRecords');
    });
  });

  describe('PATCH /api/v1/admin/users/:id/subscription', () => {
    it('updates subscription for valid user', async () => {
      const user = await User.create({
        name: 'User A',
        phone: '200',
        membershipTier: 'free',
        subscription: { plan: 'free', status: 'active', expiresAt: null },
      });

      const res = await request(app)
        .patch(`/api/v1/admin/users/${user._id}/subscription`)
        .set(adminHeaders)
        .send({ plan: 'gold', status: 'active' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Subscription updated');
      expect(res.body.data).toMatchObject({ plan: 'gold', status: 'active' });
    });

    it('returns 400 for invalid id format', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/users/not-an-id/subscription')
        .set(adminHeaders)
        .send({ plan: 'gold' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 404 when user not found', async () => {
      const nonExistingId = new mongoose.Types.ObjectId().toHexString();

      const res = await request(app)
        .patch(`/api/v1/admin/users/${nonExistingId}/subscription`)
        .set(adminHeaders)
        .send({ plan: 'gold' })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User not found');
    });

    it('returns 400 when body is invalid (Zod)', async () => {
      const user = await User.create({ name: 'User B', phone: '201', membershipTier: 'free' });

      const res = await request(app)
        .patch(`/api/v1/admin/users/${user._id}/subscription`)
        .set(adminHeaders)
        .send({ unexpectedField: 'x' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Subscription expiry cron', () => {
    it('expires gold subscriptions and creates notifications', async () => {
      const expiredUser = await User.create({
        name: 'Gold Expired Soon',
        phone: '300',
        membershipTier: 'gold',
        subscription: {
          plan: 'gold',
          status: 'active',
          expiresAt: new Date(Date.now() - 60 * 1000),
        },
      });

      const resultCount = await expireSubscriptionsNow();

      expect(resultCount).toBe(1);

      const updated = await User.findById(expiredUser._id);
      expect(updated.subscription.status).toBe('expired');

      const notifications = await Notification.find({ user: expiredUser._id });
      expect(notifications.length).toBe(1);
      expect(notifications[0].body).toBe('Your Gold membership has expired. Renew to continue accessing premium courses.');
    });
  });
});
