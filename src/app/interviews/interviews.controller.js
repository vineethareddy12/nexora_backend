import { interviewsService } from './interviews.service.js';
import {
  scheduleInterviewSchema,
  rescheduleInterviewSchema,
  cancelInterviewSchema,
  interviewFeedbackSchema,
} from './interviews.schemas.js';

export class InterviewsController {
  async getDashboardMetrics(req, res, next) {
    try {
      const metrics = await interviewsService.getDashboardMetrics();
      res.status(200).json({ success: true, data: metrics });
    } catch (err) {
      next(err);
    }
  }

  async getInterviews(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '10', 10);
      const result = await interviewsService.getInterviews(
        {
          page,
          limit,
          search: req.query.search,
          status: req.query.status,
          mode: req.query.mode,
          fromDate: req.query.fromDate,
          toDate: req.query.toDate,
          sortBy: req.query.sortBy,
          sortOrder: req.query.sortOrder,
        },
        req.user
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getInterviewDetails(req, res, next) {
    try {
      const interview = await interviewsService.getInterviewDetails(req.params.interviewId, req.user);
      res.status(200).json({ success: true, data: { interview } });
    } catch (err) {
      next(err);
    }
  }

  async scheduleInterview(req, res, next) {
    try {
      const validated = scheduleInterviewSchema.parse(req.body);
      const interview = await interviewsService.scheduleInterview(validated, req.user);
      res.status(201).json({
        success: true,
        message: 'Interview scheduled successfully.',
        data: { interview },
      });
    } catch (err) {
      next(err);
    }
  }

  async rescheduleInterview(req, res, next) {
    try {
      const validated = rescheduleInterviewSchema.parse(req.body);
      const interview = await interviewsService.rescheduleInterview(req.params.interviewId, validated, req.user);
      res.status(200).json({
        success: true,
        message: 'Interview rescheduled successfully.',
        data: { interview },
      });
    } catch (err) {
      next(err);
    }
  }

  async cancelInterview(req, res, next) {
    try {
      const validated = cancelInterviewSchema.parse(req.body);
      const interview = await interviewsService.cancelInterview(req.params.interviewId, validated, req.user);
      res.status(200).json({
        success: true,
        message: 'Interview cancelled successfully.',
        data: { interview },
      });
    } catch (err) {
      next(err);
    }
  }

  async addFeedback(req, res, next) {
    try {
      const validated = interviewFeedbackSchema.parse(req.body);
      const feedback = await interviewsService.addFeedback(req.params.interviewId, validated, req.user);
      res.status(201).json({
        success: true,
        message: 'Interview feedback recorded successfully.',
        data: { feedback },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const interviewsController = new InterviewsController();

