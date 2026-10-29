import express, { Router } from 'express';
import { companyController } from './company.controller.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRole } from '../../core/middleware/authorizeRole.js';
import { validateRequest } from '../../core/middleware/validateRequest.js';
import {
  updateCompanySchema,
  requestLogoUploadSchema,
  confirmLogoUploadSchema,
} from './company.schemas.js';

export const publicCompanyRouter = Router();
export const adminCompanyRouter = Router();

// Raw binary body parser for restricted local direct uploads (up to 6MB)
const rawImageParser = express.raw({
  type: ['image/png', 'image/jpeg', 'image/webp', 'application/octet-stream'],
  limit: '6mb',
});

// ── Public Routes ─────────────────────────────────────────────────────────────
// GET /api/v1/company
publicCompanyRouter.get('/', (req, res, next) => companyController.getPublicProfile(req, res, next));

// Controlled image content serving: GET /api/v1/company/logo/content?key=...
publicCompanyRouter.get('/logo/content', (req, res, next) => companyController.serveLocalLogo(req, res, next));

// Restricted direct upload destination for local development: PUT /api/v1/company/logo/local-upload/:uploadId
publicCompanyRouter.put('/logo/local-upload/:uploadId', rawImageParser, (req, res, next) =>
  companyController.handleLocalUpload(req, res, next)
);

// Admin logo endpoints mounted under /api/v1/company/logo
publicCompanyRouter.post(
  '/logo/upload-url',
  authenticate,
  authorizeRole('ADMIN'),
  validateRequest(requestLogoUploadSchema),
  (req, res, next) => companyController.requestLogoUpload(req, res, next)
);

publicCompanyRouter.post(
  '/logo/confirm-upload',
  authenticate,
  authorizeRole('ADMIN'),
  validateRequest(confirmLogoUploadSchema),
  (req, res, next) => companyController.confirmLogoUpload(req, res, next)
);

// ── Admin Routes ──────────────────────────────────────────────────────────────
// /api/v1/admin/company
adminCompanyRouter.use(authenticate, authorizeRole('ADMIN'));
adminCompanyRouter.get('/', (req, res, next) => companyController.getAdminProfile(req, res, next));
adminCompanyRouter.put('/', validateRequest(updateCompanySchema), (req, res, next) => companyController.updateProfile(req, res, next));

// Mirror logo routes under /api/v1/admin/company/logo for consistency
adminCompanyRouter.post(
  '/logo/upload-url',
  validateRequest(requestLogoUploadSchema),
  (req, res, next) => companyController.requestLogoUpload(req, res, next)
);

adminCompanyRouter.post(
  '/logo/confirm-upload',
  validateRequest(confirmLogoUploadSchema),
  (req, res, next) => companyController.confirmLogoUpload(req, res, next)
);
