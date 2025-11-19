const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const objectIdString = z
  .string()
  .min(1)
  .regex(objectIdRegex, 'Invalid ObjectId');

const paginationQuery = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? '1' : v))
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
      message: 'page must be a positive number',
    }),
  limit: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? '20' : v))
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0 && Number(v) <= 100, {
      message: 'limit must be between 1 and 100',
    }),
});

const followUserSchema = z.object({
  params: z.object({
    userId: objectIdString,
  }),
});

const unfollowUserSchema = z.object({
  params: z.object({
    userId: objectIdString,
  }),
});

const sendMessageSchema = z.object({
  body: z.object({
    receiverId: objectIdString,
    text: z.string().min(1),
    attachments: z.array(z.string()).optional(),
  }),
});

const getConversationMessagesSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  query: paginationQuery.optional(),
});

const markMessageSeenSchema = z.object({
  params: z.object({
    messageId: objectIdString,
  }),
});

module.exports = {
  followUserSchema,
  unfollowUserSchema,
  sendMessageSchema,
  getConversationMessagesSchema,
  markMessageSeenSchema,
};
