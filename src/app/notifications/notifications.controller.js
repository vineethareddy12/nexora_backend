import { NotificationService } from './notifications.service.js';
import { prisma } from '../../core/database/prisma.js';

export class NotificationsController {
  async getNotifications(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '15', 10);
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await NotificationService.getUserNotifications(req.user.id, {
        page,
        limit,
        unreadOnly,
      });

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const count = await NotificationService.getUnreadCount(req.user.id);
      res.status(200).json({ success: true, data: { unreadCount: count } });
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req, res, next) {
    try {
      await NotificationService.markAsRead(req.params.notificationId, req.user.id);
      res.status(200).json({ success: true, message: 'Notification marked as read.' });
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      await NotificationService.markAllAsRead(req.user.id);
      res.status(200).json({ success: true, message: 'All notifications marked as read.' });
    } catch (err) {
      next(err);
    }
  }

  async getEmailLogs(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '20', 10);
      const search = req.query.search;
      const skip = (page - 1) * limit;

      const where = {};
      if (search && search.trim()) {
        const term = search.trim();
        where.OR = [
          { recipientEmail: { contains: term, mode: 'insensitive' } },
          { subject: { contains: term, mode: 'insensitive' } },
          { templateType: { contains: term, mode: 'insensitive' } },
        ];
      }

      const [logs, total] = await Promise.all([
        prisma.emailLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { sentAt: 'desc' },
        }),
        prisma.emailLog.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationsController = new NotificationsController();
