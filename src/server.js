import app from './app.js';
import { env } from './core/config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`=========================================`);
  console.log(`Nexora Technologies Backend Server`);
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Listening on: http://localhost:${env.PORT}`);
  console.log(`Health Check: http://localhost:${env.PORT}/health`);
  console.log(`API Base:    http://localhost:${env.PORT}${env.API_PREFIX}`);
  console.log(`Swagger Docs: http://localhost:${env.PORT}/api-docs`);
  console.log(`OpenAPI JSON: http://localhost:${env.PORT}/api-docs.json`);
  console.log(`=========================================`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
