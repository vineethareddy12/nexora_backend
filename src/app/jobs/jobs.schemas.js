import { z } from 'zod';

export const jobStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']);
export const employmentTypeEnum = z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']);
export const workModeEnum = z.enum(['ON_SITE', 'HYBRID', 'REMOTE']);

export const createJobSchema = z.object({
  jobCode: z.string().min(3, 'Job code must be at least 3 characters').max(50).optional(),
  title: z.string().min(3, 'Job title must be at least 3 characters').max(180),
  department: z.string().min(2, 'Department must be at least 2 characters').max(120),
  location: z.string().min(2, 'Location must be at least 2 characters').max(140),
  employmentType: employmentTypeEnum.default('FULL_TIME'),
  workMode: workModeEnum.default('HYBRID'),
  experienceRequired: z.string().min(2, 'Experience requirement must be at least 2 characters').max(80),
  salaryRange: z.string().max(100).optional().nullable(),
  description: z.string().min(20, 'Job description must be at least 20 characters'),
  responsibilities: z.array(z.string()).default([]),
  requiredQualifications: z.array(z.string()).default([]),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  numberOfOpenings: z.coerce.number().int().min(1).default(1),
  applicationDeadline: z.string().datetime().optional().nullable().or(z.literal('')),
  status: jobStatusEnum.default('DRAFT'),
  isFeatured: z.boolean().default(false),
});

export const updateJobSchema = createJobSchema.partial();

export const updateJobStatusSchema = z.object({
  status: jobStatusEnum,
});
