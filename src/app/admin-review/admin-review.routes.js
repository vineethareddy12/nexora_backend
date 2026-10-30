import { Router } from 'express';
import { adminReviewController } from './admin-review.controller.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRole } from '../../core/middleware/authorizeRole.js';
import { validateRequest } from '../../core/middleware/validateRequest.js';
import {
  adminApplicantsQuerySchema,
  adminApplicationsQuerySchema,
  updateApplicationStatusSchema,
  createReviewNoteSchema,
} from './admin-review.schemas.js';

export const adminReviewRouter = Router();

// Enforce strict authentication and ADMIN role for all routes in this router
adminReviewRouter.use(authenticate, authorizeRole('ADMIN'));

// Admin Dashboard KPI metrics and recent applications
adminReviewRouter.get('/dashboard', (req, res, next) =>
  adminReviewController.getDashboardMetrics(req, res, next)
);

// Registered applicants directory and profile details
adminReviewRouter.get('/applicants', validateRequest(adminApplicantsQuerySchema, 'query'), (req, res, next) =>
  adminReviewController.getApplicants(req, res, next)
);
adminReviewRouter.get('/applicants/:id', (req, res, next) =>
  adminReviewController.getApplicantDetails(req, res, next)
);

// Applications listing and individual application details
adminReviewRouter.get('/applications', validateRequest(adminApplicationsQuerySchema, 'query'), (req, res, next) =>
  adminReviewController.getApplications(req, res, next)
);
adminReviewRouter.get('/applications/:id', (req, res, next) =>
  adminReviewController.getApplicationDetails(req, res, next)
);

// Status transition management
adminReviewRouter.patch(
  '/applications/:id/status',
  validateRequest(updateApplicationStatusSchema, 'body'),
  (req, res, next) => adminReviewController.updateApplicationStatus(req, res, next)
);

// Status transition audit history
adminReviewRouter.get('/applications/:id/status-history', (req, res, next) =>
  adminReviewController.getStatusHistory(req, res, next)
);

// Internal administrative review notes
adminReviewRouter.get('/applications/:id/notes', (req, res, next) =>
  adminReviewController.getReviewNotes(req, res, next)
);
adminReviewRouter.post(
  '/applications/:id/notes',
  validateRequest(createReviewNoteSchema, 'body'),
  (req, res, next) => adminReviewController.addReviewNote(req, res, next)
);

// Secure document snapshot download/stream
adminReviewRouter.get('/applications/:id/documents/:documentId/download', (req, res, next) =>
  adminReviewController.downloadDocument(req, res, next)
);

