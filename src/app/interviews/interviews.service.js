import { interviewsRepository } from './interviews.repository.js';
import { prisma } from '../../core/database/prisma.js';
import { AppError } from '../../core/errors/AppError.js';
import { EmailService } from '../../core/email/index.js';
import { NotificationService } from '../notifications/notifications.service.js';
import { AuditLogService } from '../../core/audit/audit.service.js';

export const interviewsService = {
  async getDashboardMetrics() {
    return interviewsRepository.getDashboardMetrics();
  },

  async getInterviews(query, user) {
    const isApplicant = user.role === 'APPLICANT';
    return interviewsRepository.findInterviews({
      ...query,
      applicantId: isApplicant ? user.id : undefined,
    });
  },

  async getInterviewDetails(id, user) {
    const interview = await interviewsRepository.findById(id);
    if (!interview) {
      throw AppError.notFound('Interview not found');
    }

    // Role check: Applicant can only view their own interview
    if (user.role === 'APPLICANT' && interview.applicantId !== user.id) {
      throw AppError.forbidden('Access denied to this interview');
    }

    // If applicant, strip confidential internal feedback
    if (user.role === 'APPLICANT') {
      return {
        ...interview,
        feedbacks: [], // Strict privacy safeguard
      };
    }

    return interview;
  },

  async scheduleInterview(payload, adminUser) {
    // 1. Verify application exists and is eligible
    const application = await prisma.jobApplication.findUnique({
      where: { id: payload.applicationId },
      include: {
        applicant: { select: { id: true, fullName: true, email: true } },
        job: { select: { id: true, title: true } },
      },
    });

    if (!application) {
      throw AppError.notFound('Application not found');
    }

    if (['REJECTED', 'WITHDRAWN', 'HIRED'].includes(application.status)) {
      throw AppError.badRequest(`Cannot schedule interview for application in status "${application.status}".`);
    }

    // 2. Schedule interview
    const interview = await interviewsRepository.createInterview(
      {
        ...payload,
        applicantId: application.applicantId,
        jobId: application.jobId,
      },
      adminUser.id
    );

    // 3. Notifications & Email (Asynchronous / Non-blocking)
    NotificationService.notify({
      recipientId: application.applicantId,
      title: 'Interview Scheduled',
      message: `You have an interview scheduled for ${application.job.title} (${payload.round}) on ${new Date(payload.interviewDate).toLocaleDateString()}.`,
      notificationType: 'ACTION_REQUIRED',
      relatedEntityType: 'Interview',
      relatedEntityId: interview.id,
    });

    NotificationService.notifyAdmins({
      title: 'Interview Scheduled',
      message: `${adminUser.fullName || 'Admin'} scheduled an interview with ${application.applicant.fullName} for ${application.job.title}.`,
      notificationType: 'INFO',
      relatedEntityType: 'Interview',
      relatedEntityId: interview.id,
    });

    // Fire email asynchronously in background so client response is not delayed or hung by SMTP
    EmailService.sendInterviewScheduled({
      to: application.applicant.email,
      candidateName: application.applicant.fullName,
      jobTitle: application.job.title,
      round: payload.round,
      interviewDate: payload.interviewDate,
      startTime: payload.startTime,
      endTime: payload.endTime,
      mode: payload.mode,
      meetingLinkOrLocation: payload.meetingLinkOrLocation,
      instructions: payload.instructions,
    }).catch((mailErr) => {
      console.error('[Email Error] Failed to send interview scheduled email:', mailErr.message);
    });

    // 4. Audit Log
    AuditLogService.log({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      actorRole: adminUser.role,
      action: 'INTERVIEW_SCHEDULED',
      entityType: 'Interview',
      entityId: interview.id,
      description: `Scheduled interview round "${payload.round}" for ${application.applicant.fullName} (${application.referenceNumber}).`,
    });

    return interview;
  },

  async rescheduleInterview(id, payload, adminUser) {
    const existing = await interviewsRepository.findById(id);
    if (!existing) {
      throw AppError.notFound('Interview not found');
    }

    if (existing.status === 'CANCELLED') {
      throw AppError.badRequest('Cannot reschedule a cancelled interview.');
    }

    const updated = await interviewsRepository.rescheduleInterview(id, payload, adminUser.id);

    // Notify candidate
    NotificationService.notify({
      recipientId: existing.applicantId,
      title: 'Interview Rescheduled',
      message: `Your interview for ${existing.job.title} (${existing.round}) has been rescheduled to ${new Date(payload.interviewDate).toLocaleDateString()} at ${payload.startTime}.`,
      notificationType: 'WARNING',
      relatedEntityType: 'Interview',
      relatedEntityId: id,
    });

    // Fire email asynchronously so response is instant
    EmailService.sendInterviewRescheduled({
      to: existing.applicant.email,
      candidateName: existing.applicant.fullName,
      jobTitle: existing.job.title,
      round: existing.round,
      newDate: payload.interviewDate,
      newStartTime: payload.startTime,
      newEndTime: payload.endTime,
      reason: payload.reason,
      meetingLinkOrLocation: payload.meetingLinkOrLocation || existing.meetingLinkOrLocation,
    }).catch((mailErr) => {
      console.error('[Email Error] Failed to send interview rescheduled email:', mailErr.message);
    });

    AuditLogService.log({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      actorRole: adminUser.role,
      action: 'INTERVIEW_RESCHEDULED',
      entityType: 'Interview',
      entityId: id,
      description: `Rescheduled interview "${existing.round}" for candidate ${existing.applicant.fullName}. Reason: ${payload.reason}`,
    });

    return updated;
  },

  async cancelInterview(id, payload, adminUser) {
    const existing = await interviewsRepository.findById(id);
    if (!existing) {
      throw AppError.notFound('Interview not found');
    }

    if (existing.status === 'CANCELLED') {
      throw AppError.badRequest('Interview is already cancelled.');
    }

    const cancelled = await interviewsRepository.cancelInterview(id, payload.reason, adminUser.id);

    NotificationService.notify({
      recipientId: existing.applicantId,
      title: 'Interview Cancelled',
      message: `Your interview for ${existing.job.title} (${existing.round}) has been cancelled. Reason: ${payload.reason}`,
      notificationType: 'WARNING',
      relatedEntityType: 'Interview',
      relatedEntityId: id,
    });

    EmailService.sendInterviewCancelled({
      to: existing.applicant.email,
      candidateName: existing.applicant.fullName,
      jobTitle: existing.job.title,
      round: existing.round,
      reason: payload.reason,
    });

    AuditLogService.log({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      actorRole: adminUser.role,
      action: 'INTERVIEW_CANCELLED',
      entityType: 'Interview',
      entityId: id,
      description: `Cancelled interview "${existing.round}" for candidate ${existing.applicant.fullName}. Reason: ${payload.reason}`,
    });

    return cancelled;
  },

  async addFeedback(id, payload, adminUser) {
    const existing = await interviewsRepository.findById(id);
    if (!existing) {
      throw AppError.notFound('Interview not found');
    }

    const feedback = await interviewsRepository.addFeedback(id, payload, adminUser.id);

    AuditLogService.log({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      actorRole: adminUser.role,
      action: 'INTERVIEW_FEEDBACK_SUBMITTED',
      entityType: 'Interview',
      entityId: id,
      description: `Submitted interview feedback for ${existing.applicant.fullName} (${existing.round}) with recommendation "${payload.recommendation}".`,
    });

    return feedback;
  },
};

