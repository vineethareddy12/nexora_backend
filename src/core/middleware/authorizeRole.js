import { AppError } from '../errors/AppError.js';

export const authorizeRole = (...allowedRoles) => {
  const roles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden(`Access restricted to [${roles.join(', ')}]`));
    }

    next();
  };
};
