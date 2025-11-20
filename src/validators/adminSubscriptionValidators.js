const { z } = require('zod');

const adminListSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    plan: z.enum(['free', 'gold']).optional(),
    status: z.enum(['active', 'expired', 'canceled', 'pending', 'succeeded', 'failed']).optional(),
  }),
});

const adminPatchSubscriptionSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    plan: z.enum(['free', 'gold']).optional(),
    status: z.enum(['active', 'expired', 'canceled']).optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  }).refine((data) => data.plan || data.status || Object.prototype.hasOwnProperty.call(data, 'expiresAt'), {
    message: 'At least one of plan, status, or expiresAt must be provided',
  }),
});

module.exports = { adminListSchema, adminPatchSubscriptionSchema };
