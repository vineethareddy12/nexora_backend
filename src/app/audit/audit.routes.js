import { Router } from 'express';
import { AuditLogService } from '../../core/audit/audit.service.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { requireAdmin } from '../../core/middleware/authorize.js';

export const adminAuditRouter = Router();

adminAuditRouter.use(authenticate, requireAdmin);

adminAuditRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, search, action, entityType, actorRole, fromDate, toDate } = req.query;
    const result = await AuditLogService.getLogs({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      action,
      entityType,
      actorRole,
      fromDate,
      toDate,
    });
    res.status(200).json({ success: true, data: result.logs, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
});

