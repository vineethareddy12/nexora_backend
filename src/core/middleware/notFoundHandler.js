import { AppError } from '../errors/AppError.js';

export const notFoundHandler = (req, res, next) => {
  next(AppError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
};
