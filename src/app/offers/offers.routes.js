import { Router } from 'express';
import { offersController } from './offers.controller.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { requireAdmin, requireRole } from '../../core/middleware/authorize.js';

export const adminOffersRouter = Router();
export const applicantOffersRouter = Router();

// ==========================================
// ADMIN ROUTES
// ==========================================
adminOffersRouter.use(authenticate, requireAdmin);

adminOffersRouter.get('/metrics', offersController.getMetrics);
adminOffersRouter.get('/', offersController.listOffers);
adminOffersRouter.post('/', offersController.createOffer);
adminOffersRouter.get('/:id', offersController.getOfferById);
adminOffersRouter.put('/:id', offersController.updateOffer);
adminOffersRouter.post('/:id/issue', offersController.issueOffer);
adminOffersRouter.post('/:id/withdraw', offersController.withdrawOffer);
adminOffersRouter.get('/:id/preview', offersController.previewOfferHtml);

// ==========================================
// APPLICANT ROUTES
// ==========================================
applicantOffersRouter.use(authenticate, requireRole('APPLICANT'));

applicantOffersRouter.get('/', offersController.getApplicantOffers);
applicantOffersRouter.get('/:id', offersController.getOfferById);
applicantOffersRouter.post('/:id/respond', offersController.respondToOffer);
applicantOffersRouter.get('/:id/preview', offersController.previewOfferHtml);

