import { applicationsService } from './applications.service.js';

export class ApplicationsController {
  async submitApplication(req, res, next) {
    try {
      const application = await applicationsService.submitApplication(
        req.params.jobId,
        req.user.id,
        req.body
      );
      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        data: { application },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyApplications(req, res, next) {
    try {
      const result = await applicationsService.getMyApplications(req.user.id, req.query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getApplicantDashboard(req, res, next) {
    try {
      const data = await applicationsService.getApplicantDashboard(req.user.id);
      res.status(200).json({
        success: true,
        message: 'Applicant dashboard retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyApplicationDetails(req, res, next) {
    try {
      const application = await applicationsService.getMyApplicationDetails(
        req.params.id,
        req.user.id
      );
      res.status(200).json({
        success: true,
        data: { application },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyApplicationDocuments(req, res, next) {
    try {
      const documents = await applicationsService.getMyApplicationDocuments(
        req.params.id,
        req.user.id
      );
      res.status(200).json({
        success: true,
        data: { documents },
      });
    } catch (error) {
      next(error);
    }
  }

  async withdrawApplication(req, res, next) {
    try {
      const result = await applicationsService.withdrawApplication(
        req.params.id,
        req.user.id,
        req.body.reason
      );
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const applicationsController = new ApplicationsController();

