import { Router } from 'express';
import { applicationsController } from './applications.controller.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { validateRequest } from '../../core/middleware/validateRequest.js';
import { submitApplicationSchema, withdrawApplicationSchema } from './applications.schemas.js';

export const applicantApplicationsRouter = Router();

// All applicant application routes require authentication
applicantApplicationsRouter.use(authenticate);

// 1. GET /api/v1/me/applications — List applicant's submitted applications
applicantApplicationsRouter.get('/', (req, res, next) => {
  applicationsController.getMyApplications(req, res, next);
});

// 2. GET /api/v1/me/applications/:id — View specific application details
applicantApplicationsRouter.get('/:id', (req, res, next) => {
  applicationsController.getMyApplicationDetails(req, res, next);
});

// 3. GET /api/v1/me/applications/:id/documents — View submitted document snapshots
applicantApplicationsRouter.get('/:id/documents', (req, res, next) => {
  applicationsController.getMyApplicationDocuments(req, res, next);
});

// 4. POST /api/v1/me/applications/:id/withdraw — Withdraw application
applicantApplicationsRouter.post(
  '/:id/withdraw',
  validateRequest(withdrawApplicationSchema),
  (req, res, next) => {
    applicationsController.withdrawApplication(req, res, next);
  }
);
