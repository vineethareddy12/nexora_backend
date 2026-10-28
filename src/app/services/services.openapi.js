export const servicesOpenApi = {
  '/api/v1/services': {
    get: {
      tags: ['Public - Services'],
      summary: 'List published company services',
      description: 'Public listing of all published service offerings ordered by displayOrder.',
      parameters: [
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: { description: 'Paginated list of published services' },
      },
    },
  },
  '/api/v1/services/{slug}': {
    get: {
      tags: ['Public - Services'],
      summary: 'Get published service by slug',
      parameters: [
        { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Service details' },
        404: { description: 'Service not found or unpublished' },
      },
    },
  },
  '/api/v1/admin/services': {
    get: {
      tags: ['Admin - Services Management'],
      summary: 'List all services (drafts and published)',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { name: 'isPublished', in: 'query', schema: { type: 'boolean' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: { description: 'List of services for admin' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
      },
    },
    post: {
      tags: ['Admin - Services Management'],
      summary: 'Create a new service offering',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title', 'category', 'shortDescription'],
              properties: {
                title: { type: 'string' },
                slug: { type: 'string' },
                category: { type: 'string' },
                shortDescription: { type: 'string' },
                fullDescription: { type: 'string' },
                capabilities: { type: 'array', items: { type: 'string' } },
                techStack: { type: 'array', items: { type: 'string' } },
                iconName: { type: 'string' },
                displayOrder: { type: 'integer', default: 0 },
                isPublished: { type: 'boolean', default: false },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Service created successfully' },
        409: { description: 'Slug collision' },
      },
    },
  },
  '/api/v1/admin/services/reorder': {
    patch: {
      tags: ['Admin - Services Management'],
      summary: 'Update display sequence of services',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Services reordered successfully' },
      },
    },
  },
  '/api/v1/admin/services/{id}': {
    get: {
      tags: ['Admin - Services Management'],
      summary: 'Get single service by ID for editing',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'Service record' },
        404: { description: 'Not found' },
      },
    },
    patch: {
      tags: ['Admin - Services Management'],
      summary: 'Update service details',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'Service updated successfully' },
      },
    },
    delete: {
      tags: ['Admin - Services Management'],
      summary: 'Delete eligible service',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'Service deleted successfully' },
      },
    },
  },
  '/api/v1/admin/services/{id}/status': {
    patch: {
      tags: ['Admin - Services Management'],
      summary: 'Publish or unpublish a service',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['isPublished'],
              properties: {
                isPublished: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Service publication status updated' },
      },
    },
  },
};
