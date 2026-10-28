export const jobsOpenApi = {
  '/api/v1/jobs': {
    get: {
      tags: ['Public - Careers & Jobs'],
      summary: 'List published and active job vacancies',
      description: 'Public listing of open career opportunities with keyword search and departmental filters.',
      parameters: [
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'department', in: 'query', schema: { type: 'string' } },
        { name: 'employmentType', in: 'query', schema: { type: 'string', enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'] } },
        { name: 'workMode', in: 'query', schema: { type: 'string', enum: ['ON_SITE', 'HYBRID', 'REMOTE'] } },
        { name: 'location', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: { description: 'Paginated active job vacancies' },
      },
    },
  },
  '/api/v1/jobs/{idOrCode}': {
    get: {
      tags: ['Public - Careers & Jobs'],
      summary: 'Get details of an active job opening',
      parameters: [
        { name: 'idOrCode', in: 'path', required: true, schema: { type: 'string' }, example: 'NEX-ENG-001' },
      ],
      responses: {
        200: { description: 'Job vacancy details' },
        404: { description: 'Job not found or closed' },
      },
    },
  },
  '/api/v1/admin/jobs': {
    get: {
      tags: ['Admin - Job Postings Management'],
      summary: 'List all jobs across lifecycle (Draft, Published, Closed)',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CLOSED'] } },
        { name: 'department', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: { description: 'All job postings' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
      },
    },
    post: {
      tags: ['Admin - Job Postings Management'],
      summary: 'Create a new job vacancy (Draft or Published)',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title', 'department', 'location', 'experienceRequired', 'description'],
              properties: {
                jobCode: { type: 'string', example: 'NEX-ENG-005' },
                title: { type: 'string' },
                department: { type: 'string' },
                location: { type: 'string' },
                employmentType: { type: 'string', enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'] },
                workMode: { type: 'string', enum: ['ON_SITE', 'HYBRID', 'REMOTE'] },
                experienceRequired: { type: 'string' },
                salaryRange: { type: 'string' },
                description: { type: 'string' },
                responsibilities: { type: 'array', items: { type: 'string' } },
                requiredSkills: { type: 'array', items: { type: 'string' } },
                applicationDeadline: { type: 'string', format: 'date-time' },
                status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CLOSED'], default: 'DRAFT' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Job created' },
        409: { description: 'Job code collision' },
      },
    },
  },
  '/api/v1/admin/jobs/{id}': {
    get: {
      tags: ['Admin - Job Postings Management'],
      summary: 'Retrieve single job for editing',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'Job record' },
        404: { description: 'Not found' },
      },
    },
    patch: {
      tags: ['Admin - Job Postings Management'],
      summary: 'Update job details',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'Job updated' },
      },
    },
    delete: {
      tags: ['Admin - Job Postings Management'],
      summary: 'Remove an unneeded job posting',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'Job removed' },
      },
    },
  },
  '/api/v1/admin/jobs/{id}/status': {
    patch: {
      tags: ['Admin - Job Postings Management'],
      summary: 'Publish, close, or reopen a vacancy',
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
                status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CLOSED'] },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Job status transitioned' },
      },
    },
  },
};
