const { z } = require('zod');

const markReadSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

const markAllReadSchema = z.object({
  query: z.object({}).optional(),
});

module.exports = {
  markReadSchema,
  markAllReadSchema,
};
