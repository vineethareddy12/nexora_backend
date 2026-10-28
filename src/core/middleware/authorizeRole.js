import { AppError } from '../errors/AppError.js';

export const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden(`Access restricted to [${allowedRoles.join(', ')}]`));
    }

    next();
  };
};
