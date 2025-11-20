const mongoose = require('mongoose');
const User = require('../../../models/User');
const Notification = require('../../../models/Notification');
const { ok, badRequest, notFoundRes } = require('../../../utils/response');
const { paginate } = require('../../../utils/pagination');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

async function listSubscriptions(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const filter = {};

    if (req.query.plan) {
      filter['subscription.plan'] = req.query.plan;
    }
    if (req.query.status) {
      filter['subscription.status'] = req.query.status;
    }

    const [records, totalRecords] = await Promise.all([
      User.find(filter).select('name email subscription').skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
    ]);

    const data = paginate({ records, page, limit, totalRecords });
    return ok(res, data, 'Subscriptions list');
  } catch (err) {
    next(err);
  }
}

async function listPayments(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);

    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.plan) {
      filter.plan = req.query.plan;
    }

    const Payment = mongoose.model('Payment');

    const [records, totalRecords] = await Promise.all([
      Payment.find(filter).skip((page - 1) * limit).limit(limit),
      Payment.countDocuments(filter),
    ]);

    const data = paginate({ records, page, limit, totalRecords });
    return ok(res, data, 'Payments list');
  } catch (err) {
    next(err);
  }
}

async function patchUserSubscription(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return badRequest(res, 'Invalid user id');
    }

    const update = {};
    if (req.body.plan) {
      update['subscription.plan'] = req.body.plan;
    }
    if (req.body.status) {
      update['subscription.status'] = req.body.status;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'expiresAt')) {
      update['subscription.expiresAt'] = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
    }

    if (Object.keys(update).length === 0) {
      return badRequest(res, 'No valid fields to update');
    }

    const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true }).select('subscription');
    if (!user) {
      return notFoundRes(res, 'User not found');
    }

    return ok(res, user.subscription, 'Subscription updated');
  } catch (err) {
    next(err);
  }
}

module.exports = { listSubscriptions, listPayments, patchUserSubscription };
