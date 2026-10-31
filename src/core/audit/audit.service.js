import { prisma } from '../database/prisma.js';

export class AuditLogService {
  /**
   * Records an audit log event
   */
  static async log({
    actorId = null,
    actorEmail = null,
    actorRole = null,
    action,
    entityType,
    entityId = null,
    description,
    metadata = null,
    ipAddress = null,
    userAgent = null,
  }) {
    try {
      return await prisma.auditLog.create({
        data: {
          actorId: actorId ? String(actorId) : null,
          actorEmail: actorEmail || null,
          actorRole: actorRole || null,
          action,
          entityType,
          entityId: entityId ? String(entityId) : null,
          description,
          metadata: metadata || undefined,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });
    } catch (err) {
      console.error('[AuditLog] Failed to record audit log:', err.message);
      return null;
    }
  }

  /**
   * Lists audit logs with filtering & pagination
   */
  static async getLogs({
    page = 1,
    limit = 20,
    search,
    action,
    entityType,
    actorRole,
    fromDate,
    toDate,
  }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { description: { contains: term, mode: 'insensitive' } },
        { action: { contains: term, mode: 'insensitive' } },
        { actorEmail: { contains: term, mode: 'insensitive' } },
        { entityType: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (action && action !== 'ALL') {
      where.action = action;
    }

    if (entityType && entityType !== 'ALL') {
      where.entityType = entityType;
    }

    if (actorRole && actorRole !== 'ALL') {
      where.actorRole = actorRole;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        if (toDate.length === 10) end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

