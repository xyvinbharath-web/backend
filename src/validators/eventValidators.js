const { z } = require('zod');

// For now, match the existing API/tests: require title and description,
// but allow flexibility for date/startDate/endDate/location/capacity.
const eventBody = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  // Older tests may send `date`; newer flows may use startDate/endDate.
  date: z.string().min(1).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  location: z.string().min(1).optional(),
});

const createEventSchema = z.object({
  body: eventBody,
});

const bookEventSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

module.exports = {
  createEventSchema,
  bookEventSchema,
};
