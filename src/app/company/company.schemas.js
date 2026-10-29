import { z } from 'zod';

export const updateCompanySchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(160),
  logoUrl: z.string().max(2000000, 'Logo file too large').optional().nullable().or(z.literal('')),
  shortDescription: z.string().min(10, 'Short description must be at least 10 characters').max(500),
  about: z.string().min(20, 'About information must be at least 20 characters'),
  mission: z.string().min(10, 'Mission statement must be at least 10 characters'),
  vision: z.string().min(10, 'Vision statement must be at least 10 characters'),
  areasOfExpertise: z.array(z.string()).default([]),
  businessCapabilities: z.array(z.string()).default([]),
  email: z.string().email('Invalid official contact email'),
  careersEmail: z.string().email('Invalid careers contact email').optional().nullable().or(z.literal('')),
  phone: z.string().min(6, 'Contact phone must be at least 6 characters').max(60),
  secondaryPhone: z.string().max(60).optional().nullable().or(z.literal('')),
  address: z.string().min(10, 'Corporate address must be at least 10 characters'),
  operatingHours: z.string().max(255).optional().nullable().or(z.literal('')),
  websiteUrl: z.string().url('Invalid website URL').optional().nullable().or(z.literal('')),
});

export const requestLogoUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255),
  contentType: z.string().min(1, 'ContentType is required'),
  size: z.number().positive('Size must be positive').max(5 * 1024 * 1024, 'Size exceeds 5MB limit'),
});

export const confirmLogoUploadSchema = z.object({
  uploadId: z.string().uuid('Valid uploadId is required'),
});
