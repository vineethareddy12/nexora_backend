import { authOpenApi } from '../app/auth/auth.openapi.js';
import { profileOpenApi } from '../app/applicant-profile/profile.openapi.js';
import { documentsOpenApi } from '../app/documents/documents.openapi.js';
import { companyOpenApi } from '../app/company/company.openapi.js';
import { servicesOpenApi } from '../app/services/services.openapi.js';
import { jobsOpenApi } from '../app/jobs/jobs.openapi.js';
import { enquiriesOpenApi } from '../app/enquiries/enquiries.openapi.js';
import { env } from '../core/config/env.js';

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Nexora Technologies API',
    version: '1.0.0',
    description: 'REST API documentation for Nexora Technologies Website & Job Application Portal',
    contact: {
      name: 'Nexora Engineering',
      email: 'careers@nexoratech.com',
    },
  },
  servers: [
    {
      url: process.env.RENDER_EXTERNAL_URL || 'https://nexora-backend-uqvc.onrender.com',
      description: 'Production Server',
    },
    {
      url: `http://localhost:${env.PORT}`,
      description: 'Local Development Server',
    },
  ],

  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JWT access token to authenticate',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'BAD_REQUEST' },
              message: { type: 'string', example: 'Detailed error explanation' },
            },
          },
        },
      },
      ...documentsOpenApi.components.schemas,
    },
    responses: {
      ...documentsOpenApi.components.responses,
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Service health status probe',
        responses: {
          200: { description: 'API service is operational' },
        },
      },
    },
    ...authOpenApi,
    ...profileOpenApi,
    ...documentsOpenApi.paths,
    ...companyOpenApi,
    ...servicesOpenApi,
    ...jobsOpenApi,
    ...enquiriesOpenApi,
  },
};


