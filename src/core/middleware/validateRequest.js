import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

export const validateRequest = (schema, source = 'body') => (req, res, next) => {
  try {
    req[source] = schema.parse(req[source]);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return next(AppError.unprocessableEntity('Validation failed', details));
    }
    next(error);
  }
};
