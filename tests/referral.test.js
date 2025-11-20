const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const Referral = require('../models/Referral');

describe('Referral API', () => {
  let referrer;
  let referred;
  let referrerToken; // in tests we use x-test-role instead of real JWT

  beforeAll(async () => {
    // Create real users in test DB so ObjectIds are valid
    referrer = await User.create({ name: 'Referrer', phone: '+911111111111', role: 'user' });
    referred = await User.create({ name: 'Referred', phone: '+922222222222', role: 'user' });
  });

  afterAll(async () => {
    await Referral.deleteMany({});
    await User.deleteMany({ _id: { $in: [referrer._id, referred._id] } });
  });

  it('GET /api/v1/referral/code returns deterministic code', async () => {
    const res = await request(app)
      .get('/api/v1/referral/code')
      .set('Authorization', `Bearer test-token`)
      .set('x-test-role', 'user')
      .set('x-test-user-id', String(referrer._id));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe(`INVITE-${referrer._id}`);
  });

  it('POST /api/v1/referral/apply applies referral and prevents self-referral', async () => {
    // Self-referral should fail
    let res = await request(app)
      .post('/api/v1/referral/apply')
      .send({ referralCode: `INVITE-${referrer._id}` })
      .set('Authorization', `Bearer test-token`)
      .set('x-test-role', 'user')
      .set('x-test-user-id', String(referrer._id));

    expect(res.status).toBe(400);

    // Valid referral: referred user using referrer's code
    res = await request(app)
      .post('/api/v1/referral/apply')
      .send({ referralCode: `INVITE-${referrer._id}` })
      .set('Authorization', `Bearer test-token`)
      .set('x-test-role', 'user')
      .set('x-test-user-id', String(referred._id));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const count = await Referral.countDocuments({ referrerId: referrer._id, referredId: referred._id });
    expect(count).toBe(1);

    // Applying again should not create duplicate
    res = await request(app)
      .post('/api/v1/referral/apply')
      .send({ referralCode: `INVITE-${referrer._id}` })
      .set('Authorization', `Bearer test-token`)
      .set('x-test-role', 'user')
      .set('x-test-user-id', String(referred._id));

    expect(res.status).toBe(200);
  });

  it('POST /api/v1/referral/issue-reward issues reward only once after subscription', async () => {
    // Ensure a referral exists for this pair in this test run (DB is cleared beforeEach)
    let applyRes = await request(app)
      .post('/api/v1/referral/apply')
      .send({ referralCode: `INVITE-${referrer._id}` })
      .set('Authorization', `Bearer test-token`)
      .set('x-test-role', 'user')
      .set('x-test-user-id', String(referred._id));

    expect(applyRes.status).toBe(200);

    const referral = await Referral.findOne({ referrerId: referrer._id, referredId: referred._id });
    expect(referral).toBeTruthy();

    // First call issues reward
    let res = await request(app)
      .post('/api/v1/referral/issue-reward')
      .send({ userId: String(referred._id) })
      .set('Authorization', `Bearer admin-token`)
      .set('x-test-role', 'admin');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedReferral = await Referral.findOne({ referrerId: referrer._id, referredId: referred._id });
    expect(updatedReferral.rewardIssued).toBe(true);

    // Second call should be idempotent: no extra reward or state change
    res = await request(app)
      .post('/api/v1/referral/issue-reward')
      .send({ userId: String(referred._id) })
      .set('Authorization', `Bearer admin-token`)
      .set('x-test-role', 'admin');

    expect(res.status).toBe(200);

    const referralAfterSecond = await Referral.findOne({ referrerId: referrer._id, referredId: referred._id });
    expect(referralAfterSecond.rewardIssued).toBe(true);
  });
});
