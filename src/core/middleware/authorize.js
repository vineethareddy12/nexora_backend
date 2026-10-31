import { authorizeRole } from './authorizeRole.js';

export { authorizeRole };
export const requireAdmin = authorizeRole('ADMIN', 'SUPER_ADMIN');
export const requireApplicant = authorizeRole('APPLICANT');
export const requireRole = (...roles) => authorizeRole(...roles);

