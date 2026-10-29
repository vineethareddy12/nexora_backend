export const applicationsOpenApi = {
  paths: {
    '/api/v1/jobs/{jobId}/applications': {
      post: {
        tags: ['Job Applications'],
        summary: 'Submit a job application for a published vacancy (Phase 2)',
        description:
          'Submits an application with selected resume, optional certificates, cover note, notice period, and explicit privacy acknowledgement.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'jobId',
            in: 'path',
            required: true,
            description: 'UUID of the published job posting',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['resumeId', 'privacyAcknowledged'],
                properties: {
                  resumeId: {
                    type: 'string',
                    format: 'uuid',
                    description: 'UUID of the candidate resume from documents vault',
                    example: '8f7d3a24-789a-4c21-9e5b-d36cfa9281a0',
                  },
                  certificateIds: {
                    type: 'array',
                    items: { type: 'string', format: 'uuid' },
                    description: 'Array of supporting certificate IDs from vault',
                  },
                  coverNote: {
                    type: 'string',
                    maxLength: 2000,
                    description: 'Optional note or cover letter to the hiring team',
                  },
                  noticePeriod: {
                    type: 'string',
                    maxLength: 60,
                    example: 'Immediate to 30 days',
                  },
                  privacyAcknowledged: {
                    type: 'boolean',
                    description: 'Candidate must explicitly acknowledge the privacy policy',
                    example: true,
                  },
                  privacyNoticeVersion: {
                    type: 'string',
                    default: '1.2',
                    example: '1.2',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Application successfully submitted and transaction committed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Application submitted successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        application: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            referenceNumber: { type: 'string', example: 'NX-APP-2026-F8K2M9' },
                            status: { type: 'string', example: 'SUBMITTED' },
                            jobTitle: { type: 'string', example: 'Senior Cloud Architect' },
                            submittedAt: { type: 'string', format: 'date-time' },
                            documentsAttachedCount: { type: 'integer', example: 2 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Validation failed, missing profile fields, or deadline expired' },
          401: { description: 'Authentication required' },
          404: { description: 'Job not found' },
          409: { description: 'Duplicate application already submitted for this job opening' },
        },
      },
    },
    '/api/v1/me/applications': {
      get: {
        tags: ['Job Applications'],
        summary: 'List all applications submitted by the authenticated candidate',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'List of submitted applications',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        applications: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/JobApplicationSummary' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/v1/me/applications/{id}': {
      get: {
        tags: ['Job Applications'],
        summary: 'Get details of a specific submitted application',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Application details with job and snapshot data',
          },
          404: { description: 'Application not found or access denied (IDOR protection)' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/v1/me/applications/{id}/documents': {
      get: {
        tags: ['Job Applications'],
        summary: 'Get document snapshots preserved with this application',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'List of document snapshots frozen at submission time',
          },
          404: { description: 'Application not found or access denied' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/v1/me/applications/{id}/withdraw': {
      post: {
        tags: ['Job Applications'],
        summary: 'Withdraw a submitted application',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: { type: 'string', maxLength: 500, example: 'Accepted another offer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Application successfully marked as WITHDRAWN' },
          400: { description: 'Cannot withdraw in current status' },
          404: { description: 'Application not found or access denied' },
          401: { description: 'Unauthorized' },
        },
      },
    },
  },
  components: {
    schemas: {
      JobApplicationSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          referenceNumber: { type: 'string', example: 'NX-APP-2026-F8K2M9' },
          status: {
            type: 'string',
            enum: [
              'SUBMITTED',
              'UNDER_REVIEW',
              'SHORTLISTED',
              'INTERVIEW_SCHEDULED',
              'REJECTED',
              'OFFER_EXTENDED',
              'HIRED',
              'WITHDRAWN',
            ],
            example: 'SUBMITTED',
          },
          submittedAt: { type: 'string', format: 'date-time' },
          withdrawnAt: { type: 'string', format: 'date-time', nullable: true },
          job: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              jobCode: { type: 'string', example: 'ENG-2026-001' },
              title: { type: 'string', example: 'Senior Cloud Solutions Engineer' },
              department: { type: 'string', example: 'Cloud Infrastructure' },
              location: { type: 'string', example: 'Hyderabad, India' },
              employmentType: { type: 'string', example: 'FULL_TIME' },
              workMode: { type: 'string', example: 'HYBRID' },
            },
          },
          documents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                isResume: { type: 'boolean' },
                documentType: { type: 'string' },
                originalFilename: { type: 'string' },
                fileSizeBytes: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  },
};
