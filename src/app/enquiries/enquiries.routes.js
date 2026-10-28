import { Router } from 'express';
import { enquiriesController } from './enquiries.controller.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRole } from '../../core/middleware/authorizeRole.js';
import { validateRequest } from '../../core/middleware/validateRequest.js';
import {
  createEnquirySchema,
  updateEnquiryStatusSchema,
  updateEnquiryNotesSchema,
} from './enquiries.schemas.js';

export const publicEnquiriesRouter = Router();
export const adminEnquiriesRouter = Router();

// Public route: /api/v1/enquiries (rate-limited via globalLimiter / authLimiter)
publicEnquiriesRouter.post('/', validateRequest(createEnquirySchema), (req, res, next) =>
  enquiriesController.submitEnquiry(req, res, next)
);

// Admin routes: /api/v1/admin/enquiries
adminEnquiriesRouter.use(authenticate, authorizeRole('ADMIN'));
adminEnquiriesRouter.get('/', (req, res, next) =>
  enquiriesController.getAdminEnquiries(req, res, next)
);
adminEnquiriesRouter.get('/:id', (req, res, next) =>
  enquiriesController.getEnquiryById(req, res, next)
);
adminEnquiriesRouter.patch(
  '/:id/status',
  validateRequest(updateEnquiryStatusSchema),
  (req, res, next) => enquiriesController.updateEnquiryStatus(req, res, next)
);
adminEnquiriesRouter.patch(
  '/:id/notes',
  validateRequest(updateEnquiryNotesSchema),
  (req, res, next) => enquiriesController.updateEnquiryNotes(req, res, next)
);
adminEnquiriesRouter.delete('/:id', (req, res, next) =>
  enquiriesController.deleteEnquiry(req, res, next)
);
