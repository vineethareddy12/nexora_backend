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

export const getMyApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  search: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  status: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 'ALL';
      const u = val.trim().toUpperCase();
      if (u === 'OFFERED' || u === 'OFFER') return 'OFFER_EXTENDED';
      if (u === 'INTERVIEW') return 'INTERVIEW_SCHEDULED';
      return u;
    })
    .pipe(
      z.enum([
        'ALL',
        'SUBMITTED',
        'UNDER_REVIEW',
        'SHORTLISTED',
        'INTERVIEW_SCHEDULED',
        'SELECTED',
        'REJECTED',
        'OFFER_EXTENDED',
        'HIRED',
        'WITHDRAWN',
      ]).default('ALL')
    ),
  fromDate: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined))
    .pipe(
      z
        .string()
        .datetime()
        .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
        .optional()
    ),
  toDate: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined))
    .pipe(
      z
        .string()
        .datetime()
        .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
        .optional()
    ),
  sortBy: z.enum(['submittedAt', 'createdAt', 'updatedAt', 'status']).default('submittedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

