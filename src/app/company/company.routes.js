import { Router } from 'express';
import { companyController } from './company.controller.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRole } from '../../core/middleware/authorizeRole.js';
import { validateRequest } from '../../core/middleware/validateRequest.js';
import { updateCompanySchema } from './company.schemas.js';

export const publicCompanyRouter = Router();
export const adminCompanyRouter = Router();

// Public route: GET /api/v1/company
publicCompanyRouter.get('/', (req, res, next) => companyController.getPublicProfile(req, res, next));

// Admin routes: /api/v1/admin/company
adminCompanyRouter.use(authenticate, authorizeRole('ADMIN'));
adminCompanyRouter.get('/', (req, res, next) => companyController.getAdminProfile(req, res, next));
adminCompanyRouter.put('/', validateRequest(updateCompanySchema), (req, res, next) => companyController.updateProfile(req, res, next));
