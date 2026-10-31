import { Router } from 'express';
import { interviewsController } from './interviews.controller.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { requireRole } from '../../core/middleware/authorize.js';

export const adminInterviewsRouter = Router();
export const applicantInterviewsRouter = Router();

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
adminInterviewsRouter.use(authenticate);
adminInterviewsRouter.use(requireRole(['ADMIN']));

adminInterviewsRouter.get('/dashboard', (req, res, next) => interviewsController.getDashboardMetrics(req, res, next));
adminInterviewsRouter.get('/', (req, res, next) => interviewsController.getInterviews(req, res, next));
adminInterviewsRouter.post('/', (req, res, next) => interviewsController.scheduleInterview(req, res, next));
adminInterviewsRouter.get('/:interviewId', (req, res, next) => interviewsController.getInterviewDetails(req, res, next));
adminInterviewsRouter.patch('/:interviewId/reschedule', (req, res, next) => interviewsController.rescheduleInterview(req, res, next));
adminInterviewsRouter.patch('/:interviewId/cancel', (req, res, next) => interviewsController.cancelInterview(req, res, next));
adminInterviewsRouter.post('/:interviewId/feedback', (req, res, next) => interviewsController.addFeedback(req, res, next));

// ─── APPLICANT ROUTES ─────────────────────────────────────────────────────────
applicantInterviewsRouter.use(authenticate);
applicantInterviewsRouter.get('/', (req, res, next) => interviewsController.getInterviews(req, res, next));
applicantInterviewsRouter.get('/:interviewId', (req, res, next) => interviewsController.getInterviewDetails(req, res, next));
