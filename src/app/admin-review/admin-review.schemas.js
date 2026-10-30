import { z } from 'zod';

export const adminApplicantsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  hasProfile: z
    .enum(['ALL', 'YES', 'NO'])
    .optional()
    .default('ALL'),
  status: z
    .enum(['ALL', 'ACTIVE', 'DISABLED'])
    .optional()
    .default('ALL'),
  sortBy: z.enum(['createdAt', 'fullName', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const adminApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
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
  jobId: z
    .string()
    .uuid()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
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

export const updateApplicationStatusSchema = z.object({
  status: z.enum([
    'SUBMITTED',
    'UNDER_REVIEW',
    'SHORTLISTED',
    'INTERVIEW_SCHEDULED',
    'SELECTED',
    'REJECTED',
    'OFFER_EXTENDED',
    'HIRED',
    'WITHDRAWN',
  ]),
  remarks: z.string().max(1000).optional(),
  internalRemarks: z.string().max(2000).optional(),
});

export const createReviewNoteSchema = z.object({
  note: z.string().min(1, 'Review note cannot be empty').max(3000),
});

