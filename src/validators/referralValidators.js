const { z } = require('zod');

const referralCodePattern = /^INVITE-[0-9a-fA-F]{24}$/;

const getReferralCodeSchema = z.object({
  body: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
});

const getReferralStatsSchema = getReferralCodeSchema;

const applyReferralSchema = z.object({
  body: z.object({
    referralCode: z
      .string()
      .min(1)
      .regex(referralCodePattern, 'Invalid referral code format'),
  }),
  params: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
});

const issueRewardSchema = z.object({
  body: z.object({
    userId: z.string().min(1),
  }),
  params: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
});

module.exports = {
  getReferralCodeSchema,
  getReferralStatsSchema,
  applyReferralSchema,
  issueRewardSchema,
};
