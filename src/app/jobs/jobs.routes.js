import { Router } from 'express';
import { jobsController } from './jobs.controller.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRole } from '../../core/middleware/authorizeRole.js';
import { validateRequest } from '../../core/middleware/validateRequest.js';
import { createJobSchema, updateJobSchema, updateJobStatusSchema } from './jobs.schemas.js';

export const publicJobsRouter = Router();
export const adminJobsRouter = Router();

// Public routes: /api/v1/jobs
publicJobsRouter.get('/', (req, res, next) => jobsController.getPublishedJobs(req, res, next));
publicJobsRouter.get('/:idOrCode', (req, res, next) => jobsController.getPublishedJobDetails(req, res, next));

// Admin routes: /api/v1/admin/jobs
adminJobsRouter.use(authenticate, authorizeRole('ADMIN'));
adminJobsRouter.get('/', (req, res, next) => jobsController.getAdminJobs(req, res, next));
adminJobsRouter.post('/', validateRequest(createJobSchema), (req, res, next) => jobsController.createJob(req, res, next));
adminJobsRouter.get('/:id', (req, res, next) => jobsController.getJobById(req, res, next));
adminJobsRouter.patch('/:id', validateRequest(updateJobSchema), (req, res, next) => jobsController.updateJob(req, res, next));
adminJobsRouter.patch('/:id/status', validateRequest(updateJobStatusSchema), (req, res, next) => jobsController.updateJobStatus(req, res, next));
adminJobsRouter.delete('/:id', (req, res, next) => jobsController.deleteJob(req, res, next));
