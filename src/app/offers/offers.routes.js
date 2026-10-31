import { Router } from 'express';
import multer from 'multer';
import { offersController } from './offers.controller.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { requireAdmin, requireRole } from '../../core/middleware/authorize.js';
import { AppError } from '../../core/errors/AppError.js';

export const adminOffersRouter = Router();
export const applicantOffersRouter = Router();

// Configure Multer for PDF attachments (max 10MB)
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(AppError.badRequest('Only PDF files are accepted for offer letters.'));
    }
  },
});

const handlePdfUpload = (req, res, next) => {
  uploadPdf.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return next(AppError.badRequest('File size exceeds the 10 MB limit for offer letters.'));
      }
      return next(err);
    }
    next();
  });
};

// ==========================================
// ADMIN ROUTES
// ==========================================
adminOffersRouter.use(authenticate, requireAdmin);

adminOffersRouter.get('/metrics', offersController.getMetrics);
adminOffersRouter.get('/', offersController.listOffers);
adminOffersRouter.post('/', offersController.createOffer);
adminOffersRouter.get('/:id', offersController.getOfferById);
adminOffersRouter.put('/:id', offersController.updateOffer);
adminOffersRouter.post('/:id/attachment', handlePdfUpload, offersController.uploadAttachment);
adminOffersRouter.get('/:id/attachment', offersController.downloadAttachment);
adminOffersRouter.post('/:id/issue', offersController.issueOffer);
adminOffersRouter.post('/:id/withdraw', offersController.withdrawOffer);
adminOffersRouter.get('/:id/preview', offersController.previewOfferHtml);

// ==========================================
// APPLICANT ROUTES
// ==========================================
applicantOffersRouter.use(authenticate, requireRole('APPLICANT'));

applicantOffersRouter.get('/', offersController.getApplicantOffers);
applicantOffersRouter.get('/:id', offersController.getOfferById);
applicantOffersRouter.get('/:id/attachment', offersController.downloadAttachment);
applicantOffersRouter.post('/:id/respond', offersController.respondToOffer);
applicantOffersRouter.get('/:id/preview', offersController.previewOfferHtml);

