import { prisma } from '../../core/database/prisma.js';

export class NotificationService {
  /**
   * Creates an in-app notification
   */
  static async notify({
    recipientId,
    userId,
    title,
    message,
    notificationType,
    type = 'INFO',
    relatedEntityType = null,
    relatedEntityId = null,
    link = null,
    metadata = null,
  }) {
    try {
      const targetUserId = recipientId || userId;
      const nType = notificationType || type || 'INFO';
      return await prisma.notification.create({
        data: {
          recipientId: targetUserId,
          title,
          message,
          notificationType: nType,
          relatedEntityType: relatedEntityType || (metadata?.entityType || null),
          relatedEntityId: relatedEntityId ? String(relatedEntityId) : (metadata?.offerId || metadata?.interviewId || null),
        },
      });
    } catch (err) {
      console.error('[NotificationService] Failed to create notification:', err.message);
      return null;
    }
  }

  /**
   * Broadcasts an in-app notification to all administrators
   */
  static async notifyAdmins({
    title,
    message,
    notificationType,
    type = 'INFO',
    relatedEntityType = null,
    relatedEntityId = null,
    link = null,
    metadata = null,
  }) {
    try {
      const nType = notificationType || type || 'INFO';
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', status: 'ACTIVE' },
        select: { id: true },
      });

      const promises = admins.map((admin) =>
        prisma.notification.create({
          data: {
            recipientId: admin.id,
            title,
            message,
            notificationType: nType,
            relatedEntityType: relatedEntityType || (metadata?.entityType || null),
            relatedEntityId: relatedEntityId ? String(relatedEntityId) : (metadata?.offerId || metadata?.interviewId || null),
          },
        })
      );

      return await Promise.all(promises);
    } catch (err) {
      console.error('[NotificationService] Failed to notify admins:', err.message);
      return [];
    }
  }

  /**
   * Lists notifications for a user with unread count
   */
  static async getUserNotifications(userId, { page = 1, limit = 15, unreadOnly = false }) {
    const skip = (page - 1) * limit;
    const where = { recipientId: userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { recipientId: userId, isRead: false } }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Marks a specific notification as read
   */
  static async markAsRead(notificationId, userId) {
    return prisma.notification.updateMany({
      where: { id: notificationId, recipientId: userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Marks all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    return prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Returns unread count
   */
  static async getUnreadCount(userId) {
    return prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    });
  }
}
