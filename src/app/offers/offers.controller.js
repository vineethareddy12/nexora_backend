import { offersService } from './offers.service.js';
import { createOfferSchema, updateOfferSchema, respondOfferSchema, withdrawOfferSchema } from './offers.schemas.js';

export const offersController = {
  /**
   * Admin: Metrics
   */
  async getMetrics(req, res, next) {
    try {
      const metrics = await offersService.getMetrics();
      res.status(200).json({ success: true, data: metrics });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin: List offers
   */
  async listOffers(req, res, next) {
    try {
      const { page, limit, search, status, jobId, sortBy, sortOrder } = req.query;
      const result = await offersService.listOffers({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        search,
        status,
        jobId,
        sortBy,
        sortOrder,
      });
      res.status(200).json({ success: true, data: result.offers, pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin & Applicant: Get Offer details
   */
  async getOfferById(req, res, next) {
    try {
      const offer = await offersService.getOfferById(req.params.id, req.user);
      res.status(200).json({ success: true, data: offer });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin: Create offer
   */
  async createOffer(req, res, next) {
    try {
      const parsed = createOfferSchema.parse(req.body);
      const offer = await offersService.createOffer(parsed, req.user, req);
      res.status(201).json({ success: true, message: 'Draft offer created successfully', data: offer });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin: Update draft offer
   */
  async updateOffer(req, res, next) {
    try {
      const parsed = updateOfferSchema.parse(req.body);
      const updated = await offersService.updateOffer(req.params.id, parsed, req.user, req);
      res.status(200).json({ success: true, message: 'Offer updated successfully', data: updated });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin: Issue offer
   */
  async issueOffer(req, res, next) {
    try {
      const issued = await offersService.issueOffer(req.params.id, req.user, req);
      res.status(200).json({ success: true, message: 'Offer issued to candidate successfully', data: issued });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin: Withdraw offer
   */
  async withdrawOffer(req, res, next) {
    try {
      const parsed = withdrawOfferSchema.parse(req.body);
      const withdrawn = await offersService.withdrawOffer(req.params.id, parsed.reason, req.user, req);
      res.status(200).json({ success: true, message: 'Offer withdrawn successfully', data: withdrawn });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Applicant: Get their offers
   */
  async getApplicantOffers(req, res, next) {
    try {
      const { page, limit, status } = req.query;
      const result = await offersService.getApplicantOffers(req.user.id, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
      });
      res.status(200).json({ success: true, data: result.offers, pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Applicant: Respond to offer (ACCEPT / DECLINE)
   */
  async respondToOffer(req, res, next) {
    try {
      const parsed = respondOfferSchema.parse(req.body);
      const decision = parsed.decision || parsed.status;
      const updated = await offersService.respondToOffer(req.params.id, decision, parsed.notes, req.user, req);
      res.status(200).json({
        success: true,
        message: `Offer ${decision.toLowerCase()} successfully`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin: Upload PDF attachment for offer letter
   */
  async uploadAttachment(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'PDF file is required' });
      }
      const updated = await offersService.uploadAttachment(req.params.id, req.file, req.user);
      res.status(200).json({
        success: true,
        message: 'Offer letter PDF attached successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin & Applicant: Download or get secure link for attached PDF
   */
  async downloadAttachment(req, res, next) {
    try {
      const { download, filename } = await offersService.getAttachmentDownload(req.params.id, req.user);

      if (download.type === 'redirect') {
        return res.json({ success: true, downloadUrl: download.url, filename });
      }

      if (download.type === 'stream') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return download.stream.pipe(res);
      }

      if (download.type === 'buffer') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(download.buffer);
      }

      res.status(404).json({ success: false, message: 'Attachment file not found' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Preview / Print Offer Letter HTML
   */
  async previewOfferHtml(req, res, next) {
    try {
      const html = await offersService.getOfferHtml(req.params.id, req.user);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      next(err);
    }
  },
};
