import express from 'express';
import { configureHelmet } from './core/security/helmet.js';
import { configureCors } from './core/security/cors.js';
import { globalLimiter } from './core/middleware/rateLimiters.js';
import { configureSwagger } from './docs/swagger.js';
import { errorHandler } from './core/middleware/errorHandler.js';
import { notFoundHandler } from './core/middleware/notFoundHandler.js';
import { env } from './core/config/env.js';

// Central API v1 router (CivilEdge pattern)
import apiV1Router from './api/v1/router.js';
import healthRouter from './app/health/health.routes.js';

const app = express();

// Security middleware
app.use(configureHelmet());
app.use(configureCors());
app.use(globalLimiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Swagger Documentation at /api-docs and /api-docs.json
configureSwagger(app);

// Direct /health check endpoint for probes
app.use('/health', healthRouter);

// Mount centralized API v1 router under /api/v1
app.use(env.API_PREFIX, apiV1Router);

// 404 handler
app.use(notFoundHandler);

// Centralized error handling
app.use(errorHandler);

export default app;
