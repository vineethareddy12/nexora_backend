import { jobsService } from './jobs.service.js';

export class JobsController {
  async getPublishedJobs(req, res, next) {
    try {
      const result = await jobsService.getPublishedJobs(req.query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPublishedJobDetails(req, res, next) {
    try {
      const job = await jobsService.getPublishedJobDetails(req.params.idOrCode);
      res.status(200).json({
        success: true,
        data: { job },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAdminJobs(req, res, next) {
    try {
      const result = await jobsService.getAdminJobs(req.query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getJobById(req, res, next) {
    try {
      const job = await jobsService.getJobById(req.params.id);
      res.status(200).json({
        success: true,
        data: { job },
      });
    } catch (error) {
      next(error);
    }
  }

  async createJob(req, res, next) {
    try {
      const job = await jobsService.createJob(req.body);
      res.status(201).json({
        success: true,
        message: 'Job posting created successfully.',
        data: { job },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateJob(req, res, next) {
    try {
      const job = await jobsService.updateJob(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Job posting updated successfully.',
        data: { job },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateJobStatus(req, res, next) {
    try {
      const job = await jobsService.updateJobStatus(req.params.id, req.body.status);
      res.status(200).json({
        success: true,
        message: `Job status updated to ${job.status}.`,
        data: { job },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteJob(req, res, next) {
    try {
      await jobsService.deleteJob(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Job posting removed successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const jobsController = new JobsController();
