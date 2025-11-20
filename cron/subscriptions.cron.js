let cron = null;
try {
  // Optional dependency: if node-cron is not installed, scheduling will be disabled gracefully.
  // This keeps tests and environments without cron from failing on require.
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  cron = require('node-cron');
} catch (_) {
  cron = null;
}
const User = require('../models/User');
const Notification = require('../models/Notification');

async function expireSubscriptionsNow() {
  const now = new Date();

  const result = await User.updateMany(
    {
      'subscription.plan': 'gold',
      'subscription.status': 'active',
      'subscription.expiresAt': { $lt: now },
    },
    {
      $set: { 'subscription.status': 'expired' },
    }
  );

  const modifiedCount = result.modifiedCount || result.nModified || 0;

  if (modifiedCount > 0) {
    const users = await User.find({
      'subscription.plan': 'gold',
      'subscription.status': 'expired',
      'subscription.expiresAt': { $lt: now },
    }).select('_id');

    const notifications = users.map((u) => ({
      user: u._id,
      type: 'subscription_expired',
      title: 'Subscription expired',
      body: 'Your Gold membership has expired. Renew to continue accessing premium courses.',
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  }

  return modifiedCount;
}

function scheduleExpiryCron() {
  const enabled = (process.env.CRON_ENABLED || 'true') === 'true';
  const isTest = process.env.NODE_ENV === 'test';
  if (!enabled || isTest || !cron) {
    return null;
  }

  const tz = process.env.CRON_TZ || 'UTC';

  const task = cron.schedule(
    '0 2 * * *',
    () => {
      expireSubscriptionsNow().catch(() => {});
    },
    {
      timezone: tz,
    }
  );

  return task;
}

module.exports = { expireSubscriptionsNow, scheduleExpiryCron };
