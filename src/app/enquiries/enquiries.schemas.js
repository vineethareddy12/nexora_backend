import { z } from 'zod';

export const enquiryStatusEnum = z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED']);

export const createEnquirySchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().email('Please enter a valid email address').max(255),
  phone: z.string().max(30).optional().nullable().or(z.literal('')),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(4000),
});

export const updateEnquiryStatusSchema = z.object({
  status: enquiryStatusEnum,
  adminNotes: z.string().max(4000).optional().nullable(),
});

export const updateEnquiryNotesSchema = z.object({
  adminNotes: z.string().max(4000).optional().nullable(),
});
