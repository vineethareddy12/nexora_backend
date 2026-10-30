import { z } from 'zod';

export const submitApplicationSchema = z.object({
  resumeId: z.string().uuid({ message: 'Valid resume document ID is required' }),
  certificateIds: z.array(z.string().uuid()).optional().default([]),
  coverNote: z.string().max(2000).optional(),
  noticePeriod: z.string().max(60).optional(),
  privacyAcknowledged: z.literal(true, {
    errorMap: () => ({ message: 'You must explicitly acknowledge the Privacy Notice to submit your application' }),
  }),
  privacyNoticeVersion: z.string().min(1).default('1.2'),
});

export const withdrawApplicationSchema = z.object({
  reason: z.string().max(500).optional(),
});

