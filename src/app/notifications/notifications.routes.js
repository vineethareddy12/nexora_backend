import { Router } from 'express';
import { notificationsController } from './notifications.controller.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { requireRole } from '../../core/middleware/authorize.js';

export const applicantNotificationsRouter = Router();
export const adminNotificationsRouter = Router();

// Applicant endpoints
applicantNotificationsRouter.use(authenticate);
applicantNotificationsRouter.get('/', (req, res, next) => notificationsController.getNotifications(req, res, next));
applicantNotificationsRouter.get('/unread-count', (req, res, next) => notificationsController.getUnreadCount(req, res, next));
applicantNotificationsRouter.patch('/:notificationId/read', (req, res, next) => notificationsController.markAsRead(req, res, next));
applicantNotificationsRouter.patch('/read-all', (req, res, next) => notificationsController.markAllAsRead(req, res, next));

// Admin endpoints
adminNotificationsRouter.use(authenticate);
adminNotificationsRouter.use(requireRole(['ADMIN']));
adminNotificationsRouter.get('/', (req, res, next) => notificationsController.getNotifications(req, res, next));
adminNotificationsRouter.get('/unread-count', (req, res, next) => notificationsController.getUnreadCount(req, res, next));
adminNotificationsRouter.patch('/:notificationId/read', (req, res, next) => notificationsController.markAsRead(req, res, next));
adminNotificationsRouter.patch('/read-all', (req, res, next) => notificationsController.markAllAsRead(req, res, next));
adminNotificationsRouter.get('/email-logs', (req, res, next) => notificationsController.getEmailLogs(req, res, next));
