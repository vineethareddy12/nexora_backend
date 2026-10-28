import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

export const validateRequest = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
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
