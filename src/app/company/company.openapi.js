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
};
