import { AppError } from '../errors/AppError.js';
import { env } from '../config/env.js';
import { ZodError } from 'zod';

export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let error = err;

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    error = AppError.unprocessableEntity('Validation failed', details);
  }

  // Fallback for generic or uncaught errors
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';
  const message = error.isOperational ? error.message : 'An unexpected error occurred';
  const details = error.details || null;

  if (env.NODE_ENV === 'development' && statusCode === 500) {
    console.error('[Error Details]', err);
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    },
  });
};
