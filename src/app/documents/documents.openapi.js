export const documentsOpenApi = {
  paths: {
    '/api/v1/me/documents': {
      get: {
        tags: ['Applicant Documents'],
        summary: 'List active documents for the authenticated applicant',
        description: 'Returns all uploaded resumes and certificates owned by the authenticated candidate.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'type',
            in: 'query',
            description: 'Filter documents by specific type',
            required: false,
            schema: {
              type: 'string',
              enum: [
                'RESUME',
                'EDUCATIONAL_CERTIFICATE',
                'INTERNSHIP_CERTIFICATE',
                'EXPERIENCE_CERTIFICATE',
                'OTHER',
              ],
            },
          },
          {
            name: 'includeArchived',
            in: 'query',
            description: 'Whether to include soft-deleted/archived documents',
            required: false,
            schema: { type: 'boolean', default: false },
          },
        ],
        responses: {
          200: {
            description: 'List of applicant documents retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        documents: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/ApplicantDocument' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
      post: {
        tags: ['Applicant Documents'],
        summary: 'Upload a new document (Resume or Certificate)',
        description: 'Accepts a multipart/form-data upload with a document file (PDF, PNG, JPG, JPEG up to 5MB) and metadata.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'type'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Document file (PDF, JPG, JPEG, PNG, max 5 MB)',
                  },
                  type: {
                    type: 'string',
                    enum: [
                      'RESUME',
                      'EDUCATIONAL_CERTIFICATE',
                      'INTERNSHIP_CERTIFICATE',
                      'EXPERIENCE_CERTIFICATE',
                      'OTHER',
                    ],
                    description: 'Type classification of the document',
                    example: 'RESUME',
                  },
                  description: {
                    type: 'string',
                    description: 'Optional description or note',
                    example: 'Primary software engineering resume 2026',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Document uploaded successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Document uploaded successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        document: { $ref: '#/components/schemas/ApplicantDocument' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/v1/me/documents/{id}': {
      get: {
        tags: ['Applicant Documents'],
        summary: 'Get metadata for a specific document',
        description: 'Returns metadata for a document owned by the applicant.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the document',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Document metadata retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        document: { $ref: '#/components/schemas/ApplicantDocument' },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: 'Document not found or access denied (IDOR protection)' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
      delete: {
        tags: ['Applicant Documents'],
        summary: 'Delete or archive a document',
        description: 'Safely removes a document. If referenced by historical job applications, the file is preserved and archived.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the document to delete',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Document deleted or archived successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Document deleted successfully.' },
                    data: {
                      type: 'object',
                      properties: {
                        deleted: { type: 'boolean', example: true },
                        archived: { type: 'boolean', example: false },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: 'Document not found or access denied' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/v1/me/documents/{id}/replace': {
      post: {
        tags: ['Applicant Documents'],
        summary: 'Replace an existing document',
        description: 'Replaces the document file. Preserves historical versions if referenced by submitted applications.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the document to replace',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'New replacement document file',
                  },
                  type: {
                    type: 'string',
                    enum: [
                      'RESUME',
                      'EDUCATIONAL_CERTIFICATE',
                      'INTERNSHIP_CERTIFICATE',
                      'EXPERIENCE_CERTIFICATE',
                      'OTHER',
                    ],
                    description: 'Optional updated type',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Document replaced successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Document replaced successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        document: { $ref: '#/components/schemas/ApplicantDocument' },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: 'Document not found or access denied' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/v1/me/documents/{id}/download': {
      get: {
        tags: ['Applicant Documents'],
        summary: 'Download document file',
        description: 'Secure, authorized document stream or signed URL download.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the document to download',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Binary document file stream',
            content: {
              'application/pdf': { schema: { type: 'string', format: 'binary' } },
              'image/png': { schema: { type: 'string', format: 'binary' } },
              'image/jpeg': { schema: { type: 'string', format: 'binary' } },
            },
          },
          302: { description: 'Redirect to short-lived signed download URL (for cloud object storage)' },
          404: { description: 'Document not found or access denied' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
  },
  components: {
    schemas: {
      ApplicantDocument: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '8f7d3a24-789a-4c21-9e5b-d36cfa9281a0' },
          type: {
            type: 'string',
            enum: ['RESUME', 'EDUCATIONAL_CERTIFICATE', 'INTERNSHIP_CERTIFICATE', 'EXPERIENCE_CERTIFICATE', 'OTHER'],
            example: 'RESUME',
          },
          originalFilename: { type: 'string', example: 'John_Doe_Resume_2026.pdf' },
          mimeType: { type: 'string', example: 'application/pdf' },
          fileSizeBytes: { type: 'integer', example: 1048576 },
          checksumSha256: { type: 'string', example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
          isArchived: { type: 'boolean', example: false },
          applicationCount: { type: 'integer', example: 0 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication token is missing, expired, or invalid',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      ValidationError: {
        description: 'Request validation failed (invalid MIME, file size > 5MB, corrupt bytes)',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
  },
};

