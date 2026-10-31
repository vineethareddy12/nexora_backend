
import cors from 'cors';
import { env } from '../config/env.js';

const normalizeOrigin = (value) => value?.trim().replace(/\/+$/, '');

export const configureCors = () => {
  // Parse all allowed origins purely from environment variables
  // No URLs are hardcoded here — all come from CLIENT_URL and ALLOWED_ORIGINS env vars
  const envOrigins = [
    ...(env.CLIENT_URL || '').split(','),
    ...(process.env.ALLOWED_ORIGINS || '').split(','),
    process.env.RENDER_EXTERNAL_URL,
    process.env.API_DOCS_URL,
  ]
    .map(normalizeOrigin)
    .filter(Boolean);

  const allowedOrigins = Array.from(new Set(envOrigins));

  console.log('[CORS] Allowed origins:', allowedOrigins);

  return cors({
    origin: (origin, callback) => {
      const normalizedOrigin = normalizeOrigin(origin);

      if (!origin || allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.error('[CORS] Rejected origin:', origin);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ],
  });
};
