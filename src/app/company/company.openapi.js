export const companyOpenApi = {
  '/api/v1/company': {
    get: {
      tags: ['Company Profile'],
      summary: 'Retrieve approved public company information',
      description: 'Provides official company identity, address, contact coordinates, mission, vision, and capabilities for the public website.',
      responses: {
        200: {
          description: 'Official public company profile',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      company: {
                        type: 'object',
                        properties: {
                          companyName: { type: 'string', example: 'Nexora Technologies Private Limited' },
                          logoUrl: { type: 'string', nullable: true },
                          shortDescription: { type: 'string' },
                          about: { type: 'string' },
                          mission: { type: 'string' },
                          vision: { type: 'string' },
                          areasOfExpertise: { type: 'array', items: { type: 'string' } },
                          businessCapabilities: { type: 'array', items: { type: 'string' } },
                          email: { type: 'string', example: 'info@nexoratech.com' },
                          phone: { type: 'string', example: '+91 93904 66320' },
                          address: { type: 'string' },
                          websiteUrl: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/admin/company': {
    get: {
      tags: ['Admin - Company Management'],
      summary: 'Load full corporate settings for administration',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Full corporate profile data' },
        401: { description: 'Authentication required' },
        403: { description: 'Administrator privileges required' },
      },
    },
    put: {
      tags: ['Admin - Company Management'],
      summary: 'Update official company information',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['companyName', 'shortDescription', 'about', 'mission', 'vision', 'email', 'phone', 'address'],
              properties: {
                companyName: { type: 'string' },
                shortDescription: { type: 'string' },
                about: { type: 'string' },
                mission: { type: 'string' },
                vision: { type: 'string' },
                areasOfExpertise: { type: 'array', items: { type: 'string' } },
                businessCapabilities: { type: 'array', items: { type: 'string' } },
                email: { type: 'string' },
                phone: { type: 'string' },
                address: { type: 'string' },
                websiteUrl: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Company profile updated successfully' },
        400: { description: 'Validation failed' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
      },
    },
  },
  '/api/v1/company/logo/upload-url': {
    post: {
      tags: ['Admin - Company Management'],
      summary: 'Request signed direct upload URL for company logo',
      description: 'Validates file metadata and returns a direct upload URL (Supabase signed URL or local upload endpoint) and token for the frontend to upload image bytes directly.',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['filename', 'contentType', 'size'],
              properties: {
                filename: { type: 'string', example: 'company-logo.png' },
                contentType: { type: 'string', enum: ['image/png', 'image/jpeg', 'image/webp'], example: 'image/png' },
                size: { type: 'integer', example: 125000, description: 'File size in bytes (max 5MB)' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Upload URL generated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      uploadId: { type: 'string', format: 'uuid' },
                      uploadUrl: { type: 'string' },
                      storageKey: { type: 'string', example: 'logos/company/550e8400-e29b-41d4-a716-446655440000.png' },
                      method: { type: 'string', example: 'PUT' },
                      headers: { type: 'object' },
                      expiresIn: { type: 'integer', example: 900 },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: 'Invalid image format or file exceeds 5MB limit' },
        401: { description: 'Authentication required' },
        403: { description: 'Administrator privileges required' },
      },
    },
  },
  '/api/v1/company/logo/confirm-upload': {
    post: {
      tags: ['Admin - Company Management'],
      summary: 'Confirm direct logo upload and update company profile',
      description: 'Verifies the uploaded object in the storage provider, validates image signature, updates database reference, and cleans up obsolete logo.',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['uploadId'],
              properties: {
                uploadId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Logo confirmed and persisted',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string' },
                  data: {
                    type: 'object',
                    properties: {
                      logoUrl: { type: 'string' },
                      storageKey: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: 'Upload verification failed' },
        404: { description: 'Pending upload not found or object missing in storage' },
        409: { description: 'Upload authorization already consumed' },
      },
    },
  },
  '/api/v1/company/logo/content': {
    get: {
      tags: ['Company Profile'],
      summary: 'Serve company logo content (Local Storage)',
      description: 'Safely serves the validated logo image bytes from local storage root or redirects to cloud storage.',
      parameters: [
        {
          name: 'key',
          in: 'query',
          required: true,
          schema: { type: 'string' },
          description: 'Controlled storage key (e.g. logos/company/uuid.png)',
        },
      ],
      responses: {
        200: { description: 'Image binary data' },
        400: { description: 'Invalid or missing storage key' },
        403: { description: 'Path traversal attempt rejected' },
        404: { description: 'Logo file not found' },
      },
    },
  },
};
