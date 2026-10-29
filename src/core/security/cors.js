
import cors from 'cors';
import { env } from '../config/env.js';

const normalizeOrigin = (value) => value?.trim().replace(/\/+$/, '');

export const configureCors = () => {
  const allowedOrigins = [
    env.CLIENT_URL,
    env.API_DOCS_URL,
    process.env.RENDER_EXTERNAL_URL,
    'https://nexora-backend-uqvc.onrender.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4000',
    'http://127.0.0.1:4000',
  ]
    .filter(Boolean)
    .map(normalizeOrigin);

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
