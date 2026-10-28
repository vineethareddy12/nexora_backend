import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(120).optional(),
  phone: z.string().max(25).optional().nullable(),
  currentLocation: z.string().max(160).optional().nullable(),
  highestQualification: z.string().max(120).optional().nullable(),
  collegeUniversity: z.string().max(180).optional().nullable(),
  graduationYear: z.number().int().min(1960).max(2100).optional().nullable(),
  technicalSkills: z.array(z.string()).optional(),
  totalExperienceYears: z.number().min(0).max(50).optional().nullable(),
  currentOrPreviousEmployer: z.string().max(180).optional().nullable(),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').optional().nullable().or(z.literal('')),
  githubUrl: z.string().url('Invalid GitHub URL').optional().nullable().or(z.literal('')),
  portfolioUrl: z.string().url('Invalid portfolio URL').optional().nullable().or(z.literal('')),
});
