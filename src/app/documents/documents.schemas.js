import { z } from 'zod';

export const DOCUMENT_TYPES = [
  'RESUME',
  'EDUCATIONAL_CERTIFICATE',
  'INTERNSHIP_CERTIFICATE',
  'EXPERIENCE_CERTIFICATE',
  'OTHER',
];

export const uploadDocumentSchema = z.object({
  type: z.enum(DOCUMENT_TYPES, {
    errorMap: () => ({
      message: `Invalid document type. Allowed types: ${DOCUMENT_TYPES.join(', ')}`,
    }),
  }),
  description: z.string().max(255).optional(),
});

export const getDocumentsQuerySchema = z.object({
  type: z.enum(DOCUMENT_TYPES).optional(),
  includeArchived: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
});

