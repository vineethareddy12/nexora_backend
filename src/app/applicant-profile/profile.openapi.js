export const profileOpenApi = {
  '/api/v1/me/profile': {
    get: {
      tags: ['Applicant Profile'],
      summary: 'Get own professional profile',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Profile retrieved successfully' },
        401: { description: 'Unauthorized' },
      },
    },
    patch: {
      tags: ['Applicant Profile'],
      summary: 'Update own professional profile',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                phone: { type: 'string', example: '+91 98765 43210' },
                currentLocation: { type: 'string', example: 'Bangalore' },
                highestQualification: { type: 'string', example: 'B.Tech' },
                collegeUniversity: { type: 'string', example: 'NIT' },
                graduationYear: { type: 'integer', example: 2023 },
                technicalSkills: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
                },
                totalExperienceYears: { type: 'number', example: 2.5 },
                currentOrPreviousEmployer: { type: 'string', example: 'Tech Corp' },
                linkedinUrl: { type: 'string', example: 'https://linkedin.com/in/example' },
                githubUrl: { type: 'string', example: 'https://github.com/example' },
                portfolioUrl: { type: 'string', example: 'https://example.com' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Profile updated successfully' },
        422: { description: 'Validation failed' },
      },
    },
  },
};
