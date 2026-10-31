import { z } from 'zod';

export const createOfferSchema = z.object({
  applicationId: z.string().uuid({ message: 'Valid application UUID is required' }),
  designation: z.string().min(2, 'Designation must be at least 2 characters').max(150),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']).default('FULL_TIME'),
  salary: z.number().positive({ message: 'Salary must be a positive number' }).optional().nullable(),
  currency: z.string().max(10).default('INR'),
  joiningDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Valid joining date is required' }),
  expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Valid expiry date is required' }).optional().nullable(),
  termsAndConditions: z.string().max(5000).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateOfferSchema = z.object({
  designation: z.string().min(2).max(150).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']).optional(),
  salary: z.number().positive().optional().nullable(),
  currency: z.string().max(10).optional(),
  joiningDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Valid joining date is required' }),
  expiryDate: z.string().optional().nullable().refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Valid expiry date is required' }),
  termsAndConditions: z.string().max(5000).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const withdrawOfferSchema = z.object({
  reason: z.string().min(3, 'Withdrawal reason is required').max(1000),
});

export const respondOfferSchema = z.object({
  decision: z.enum(['ACCEPTED', 'DECLINED']).optional(),
  status: z.enum(['ACCEPTED', 'DECLINED']).optional(),
  notes: z.string().max(1000).optional().nullable(),
}).refine((data) => data.decision || data.status, {
  message: 'Decision (ACCEPTED or DECLINED) is required',
});
