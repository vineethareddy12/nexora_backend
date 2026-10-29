import { Router } from 'express';
import multer from 'multer';
import { documentsController } from './documents.controller.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { validateRequest } from '../../core/middleware/validateRequest.js';
import { uploadDocumentSchema, getDocumentsQuerySchema } from './documents.schemas.js';
import { AppError } from '../../core/errors/AppError.js';

const router = Router();

// Configure Multer with in-memory buffering and strict 5MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
});

// Middleware to handle Multer specific errors nicely
const handleMulterUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(AppError.badRequest('File size exceeds the 5 MB limit. Please upload a smaller file.'));
        }
        return next(AppError.badRequest(`File upload error: ${err.message}`));
      }
      return next(err);
    }
    next();
  });
};

// All applicant document routes require authentication
router.use(authenticate);

// 1. GET /api/v1/me/documents — List applicant's documents
router.get('/', validateRequest(getDocumentsQuerySchema, 'query'), (req, res, next) => {
  documentsController.getDocuments(req, res, next);
});

// 2. POST /api/v1/me/documents — Upload a new document
router.post(
  '/',
  handleMulterUpload,
  validateRequest(uploadDocumentSchema),
  (req, res, next) => {
    documentsController.uploadDocument(req, res, next);
  }
);

// 3. GET /api/v1/me/documents/:id — Get document metadata
router.get('/:id', (req, res, next) => {
  documentsController.getDocumentById(req, res, next);
});

// 4. POST /api/v1/me/documents/:id/replace — Replace an existing document
router.post(
  '/:id/replace',
  handleMulterUpload,
  (req, res, next) => {
    documentsController.replaceDocument(req, res, next);
  }
);

// 5. DELETE /api/v1/me/documents/:id — Delete or archive a document
router.delete('/:id', (req, res, next) => {
  documentsController.deleteDocument(req, res, next);
});

// 6. GET /api/v1/me/documents/:id/download — Authorized file download
router.get('/:id/download', (req, res, next) => {
  documentsController.downloadDocument(req, res, next);
});

export default router;

