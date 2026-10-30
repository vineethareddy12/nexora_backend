import { adminReviewService } from './admin-review.service.js';
import { sendSuccess } from '../../core/http/response.js';

export const adminReviewController = {
  async getDashboardMetrics(req, res, next) {
    try {
      const data = await adminReviewService.getDashboardMetrics();
      return sendSuccess(res, data, 'Admin dashboard metrics retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async getApplicants(req, res, next) {
    try {
      const data = await adminReviewService.getApplicants(req.query);
      return sendSuccess(res, data, 'Applicants retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async getApplicantDetails(req, res, next) {
    try {
      const applicant = await adminReviewService.getApplicantDetails(req.params.id);
      return sendSuccess(res, { applicant }, 'Applicant details retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async getApplications(req, res, next) {
    try {
      const data = await adminReviewService.getApplications(req.query);
      return sendSuccess(res, data, 'Applications retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async getApplicationDetails(req, res, next) {
    try {
      const application = await adminReviewService.getApplicationDetails(req.params.id);
      return sendSuccess(res, { application }, 'Application details retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async updateApplicationStatus(req, res, next) {
    try {
      const result = await adminReviewService.updateApplicationStatus(
        req.params.id,
        req.body,
        req.user
      );
      return sendSuccess(res, result, 'Application status updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async addReviewNote(req, res, next) {
    try {
      const note = await adminReviewService.addReviewNote(
        req.params.id,
        req.body,
        req.user
      );
      return sendSuccess(res, { note }, 'Internal review note added successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async getReviewNotes(req, res, next) {
    try {
      const notes = await adminReviewService.getReviewNotes(req.params.id);
      return sendSuccess(res, { notes }, 'Internal review notes retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async getStatusHistory(req, res, next) {
    try {
      const history = await adminReviewService.getStatusHistory(req.params.id);
      return sendSuccess(res, { history }, 'Application status history retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async downloadDocument(req, res, next) {
    try {
      const { document, download } = await adminReviewService.getApplicationDocumentDownload(
        req.params.id,
        req.params.documentId
      );

      if (download.type === 'redirect') {
        return res.redirect(download.url);
      }

      const encodedFilename = encodeURIComponent(document.originalFilename);
      const isInline = req.query.inline === 'true';
      const dispositionType = isInline ? 'inline' : 'attachment';

      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `${dispositionType}; filename="${document.originalFilename}"; filename*=UTF-8''${encodedFilename}`
      );
      if (document.fileSizeBytes) {
        res.setHeader('Content-Length', document.fileSizeBytes);
      }
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      download.stream.pipe(res);
    } catch (err) {
      next(err);
    }
  },
};

