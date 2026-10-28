import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi.js';
import { env } from '../core/config/env.js';

export const configureSwagger = (app) => {
  if (env.SWAGGER_ENABLED) {
    // Serve raw OpenAPI JSON
    app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(openApiSpec);
    });

    // Serve interactive Swagger UI
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
      customSiteTitle: 'Nexora Technologies API Documentation',
      explorer: true,
    }));
  }
};
