import { enquiriesService } from './enquiries.service.js';

export class EnquiriesController {
  async submitEnquiry(req, res, next) {
    try {
      const result = await enquiriesService.submitEnquiry(req.body);
      res.status(201).json({
        success: true,
        message: result.message,
        data: { enquiryId: result.id },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAdminEnquiries(req, res, next) {
    try {
      const result = await enquiriesService.getAdminEnquiries(req.query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEnquiryById(req, res, next) {
    try {
      const enquiry = await enquiriesService.getEnquiryById(req.params.id);
      res.status(200).json({
        success: true,
        data: { enquiry },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateEnquiryStatus(req, res, next) {
    try {
      const enquiry = await enquiriesService.updateEnquiryStatus(
        req.params.id,
        req.body.status,
        req.body.adminNotes
      );
      res.status(200).json({
        success: true,
        message: `Enquiry status updated to ${enquiry.status}.`,
        data: { enquiry },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateEnquiryNotes(req, res, next) {
    try {
      const enquiry = await enquiriesService.updateEnquiryNotes(req.params.id, req.body.adminNotes);
      res.status(200).json({
        success: true,
        message: 'Internal notes updated successfully.',
        data: { enquiry },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteEnquiry(req, res, next) {
    try {
      await enquiriesService.deleteEnquiry(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Enquiry removed successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const enquiriesController = new EnquiriesController();
