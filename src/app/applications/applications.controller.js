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
      const applications = await applicationsService.getMyApplications(req.user.id);
      res.status(200).json({
        success: true,
        data: { applications },
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
