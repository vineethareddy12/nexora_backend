import { z } from 'zod';

export const createServiceSchema = z.object({
  title: z.string().min(2, 'Service title must be at least 2 characters').max(160),
  slug: z.string().min(2, 'Slug must be at least 2 characters').max(180).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  category: z.string().min(2, 'Category must be at least 2 characters').max(100),
  shortDescription: z.string().min(10, 'Short description must be at least 10 characters').max(320),
  fullDescription: z.string().optional().nullable(),
  capabilities: z.array(z.string()).default([]),
  techStack: z.array(z.string()).default([]),
  iconName: z.string().max(60).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  isPublished: z.boolean().default(false),
});

export const updateServiceSchema = createServiceSchema.partial();

export const updateServiceStatusSchema = z.object({
  isPublished: z.boolean(),
});

export const reorderServicesSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string().uuid('Invalid service UUID'),
      displayOrder: z.coerce.number().int().min(0),
    })
  ).min(1, 'Orders array must contain at least one item'),
});
