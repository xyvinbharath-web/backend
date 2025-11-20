const { z } = require('zod');

const redeemRewardSchema = z.object({
  body: z.object({
    rewardId: z.string().min(1),
  }),
});

module.exports = {
  redeemRewardSchema,
};
