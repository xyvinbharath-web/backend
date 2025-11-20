const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    phone: z.string().min(5),
    email: z.string().email().optional(),
    role: z.enum(['user', 'partner']).optional(),
    referralCode: z.string().optional(),
  }),
});

const sendOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(5),
  }),
});

const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(5),
    code: z.string().min(4),
  }),
});

module.exports = {
  registerSchema,
  sendOtpSchema,
  verifyOtpSchema,
};
