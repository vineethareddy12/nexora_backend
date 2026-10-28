export const enquiriesOpenApi = {
  '/api/v1/enquiries': {
    post: {
      tags: ['Public - Contact Us'],
      summary: 'Submit an inbound client contact enquiry',
      description: 'Public endpoint allowing visitors to submit business or technology inquiries.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['fullName', 'email', 'subject', 'message'],
              properties: {
                fullName: { type: 'string', example: 'Rohan Verma' },
                email: { type: 'string', example: 'rohan.v@example.com' },
                phone: { type: 'string', example: '+91 98765 43210' },
                subject: { type: 'string', example: 'Cloud Architecture & Microservices Consulting' },
                message: { type: 'string', example: 'We require technical guidance decomposing an on-premise monolithic application.' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Enquiry received successfully' },
        422: { description: 'Validation error' },
      },
    },
  },
  '/api/v1/admin/enquiries': {
    get: {
      tags: ['Admin - Contact Enquiries'],
      summary: 'List, filter, and search received contact enquiries',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['NEW', 'IN_PROGRESS', 'RESOLVED'] } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: { description: 'Paginated enquiries' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
      },
    },
  },
  '/api/v1/admin/enquiries/{id}': {
    get: {
      tags: ['Admin - Contact Enquiries'],
      summary: 'Retrieve enquiry details and internal notes',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'Enquiry details' },
        404: { description: 'Not found' },
      },
    },
    delete: {
      tags: ['Admin - Contact Enquiries'],
      summary: 'Delete an enquiry according to retention policy',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'Enquiry removed' },
      },
    },
  },
  '/api/v1/admin/enquiries/{id}/status': {
    patch: {
      tags: ['Admin - Contact Enquiries'],
      summary: 'Transition enquiry resolution status and update internal notes',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: { type: 'string', enum: ['NEW', 'IN_PROGRESS', 'RESOLVED'] },
                adminNotes: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Status updated' },
      },
    },
  },
  '/api/v1/admin/enquiries/{id}/notes': {
    patch: {
      tags: ['Admin - Contact Enquiries'],
      summary: 'Record internal recruiter or sales remarks on an enquiry',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                adminNotes: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Internal remarks saved' },
      },
    },
  },
};
