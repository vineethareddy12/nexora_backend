import { interviewsRepository } from './interviews.repository.js';
import { prisma } from '../../core/database/prisma.js';
import { AppError } from '../../core/errors/AppError.js';
import { EmailService } from '../../core/email/index.js';
import { NotificationService } from '../notifications/notifications.service.js';
import { AuditLogService } from '../../core/audit/audit.service.js';
import { getJobInterviewRounds, computePipelineProgression, normalizeRoundName } from './rounds.config.js';

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

    // 2. Strict Round Progression Validation
    const existingInterviews = await prisma.interview.findMany({
      where: { applicationId: payload.applicationId },
      include: { feedbacks: true },
      orderBy: { createdAt: 'asc' },
    });

    const configuredRounds = getJobInterviewRounds(application.job);
    const progression = computePipelineProgression(configuredRounds, existingInterviews);

    const targetNorm = normalizeRoundName(payload.round);
    const roundState = progression.find((r) => normalizeRoundName(r.round) === targetNorm);

    if (roundState) {
      if (roundState.status === 'REJECTED') {
        throw AppError.badRequest('Cannot schedule interview. Candidate was marked NOT_RECOMMENDED in this round.');
      }
      if (roundState.status === 'LOCKED') {
        throw AppError.badRequest(
          `Cannot schedule "${payload.round}". Candidate must first clear preceding interview rounds.`
        );
      }
      if (roundState.status === 'CLEARED') {
        throw AppError.badRequest(
          `Candidate has already cleared "${payload.round}". Please proceed to the next round.`
        );
      }
    }

    // 3. Schedule interview
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

  /**
   * Retrieves complete round progression & pipeline state for an application.
   */
  async getCandidatePipeline(applicationId, user) {
    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        applicant: { select: { id: true, fullName: true, email: true } },
        job: true,
      },
    });

    if (!application) {
      throw AppError.notFound('Application not found');
    }

    if (user.role === 'APPLICANT' && application.applicantId !== user.id) {
      throw AppError.forbidden('Access denied to this application pipeline');
    }

    const interviews = await prisma.interview.findMany({
      where: { applicationId },
      include: {
        feedbacks: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { interviewDate: 'asc' },
    });

    const configuredRounds = getJobInterviewRounds(application.job);
    const progression = computePipelineProgression(configuredRounds, interviews);

    // Check if candidate is ready for final selection (all rounds CLEARED)
    const isAllRoundsCleared = progression.length > 0 && progression.every((r) => r.status === 'CLEARED');
    const isRejected = progression.some((r) => r.status === 'REJECTED');

    // If applicant is viewing, sanitize sensitive internal feedback
    const sanitizedProgression = progression.map((r) => {
      if (user.role === 'APPLICANT') {
        return {
          round: r.round,
          order: r.order,
          name: r.name,
          description: r.description,
          status: r.status === 'FEEDBACK_PENDING' ? 'COMPLETED' : r.status,
          interview: r.interview ? {
            id: r.interview.id,
            interviewDate: r.interview.interviewDate,
            startTime: r.interview.startTime,
            endTime: r.interview.endTime,
            mode: r.interview.mode,
            meetingLinkOrLocation: r.interview.meetingLinkOrLocation,
            instructions: r.interview.instructions,
            status: r.interview.status,
          } : null,
        };
      }
      return r;
    });

    return {
      applicationId: application.id,
      candidate: application.applicant,
      job: {
        id: application.job.id,
        title: application.job.title,
        department: application.job.department,
      },
      applicationStatus: application.status,
      rounds: sanitizedProgression,
      isAllRoundsCleared,
      isRejected,
      isFinalSelectionPending: isAllRoundsCleared && application.status !== 'SELECTED' && application.status !== 'OFFER_EXTENDED',
    };
  },

  /**
   * Final decision: Admin marks applicant as SELECTED or REJECTED after interview rounds.
   */
  async makeFinalDecision(applicationId, { decision, rejectionReason, remarks }, adminUser) {
    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        applicant: { select: { id: true, fullName: true, email: true } },
        job: { select: { id: true, title: true } },
      },
    });

    if (!application) {
      throw AppError.notFound('Application not found');
    }

    const previousStatus = application.status;
    const targetStatus = decision === 'SELECTED' ? 'SELECTED' : 'REJECTED';
    const auditRemarks = remarks || (decision === 'SELECTED' 
      ? 'Candidate successfully cleared all interview evaluation stages and has been officially selected for an offer.' 
      : rejectionReason || 'Candidate evaluation not met.');

    await prisma.$transaction([
      prisma.jobApplication.update({
        where: { id: applicationId },
        data: { status: targetStatus, updatedAt: new Date() },
      }),
      prisma.applicationStatusHistory.create({
        data: {
          applicationId,
          previousStatus,
          newStatus: targetStatus,
          changedById: adminUser.id,
          applicantVisibleRemarks: auditRemarks,
        },
      }),
    ]);

    // Notifications & Email
    NotificationService.notify({
      recipientId: application.applicantId,
      title: decision === 'SELECTED' ? 'Congratulations! You Have Been Selected' : 'Application Status Update',
      message: decision === 'SELECTED'
        ? `You have cleared all interview rounds for ${application.job.title} and have been officially selected! Our recruitment team will issue an employment offer letter shortly.`
        : `Thank you for taking the time to interview for ${application.job.title}. We regret to inform you that we will not be moving forward at this time.`,
      notificationType: decision === 'SELECTED' ? 'SUCCESS' : 'INFO',
      relatedEntityType: 'JobApplication',
      relatedEntityId: applicationId,
    });

    if (application.applicant?.email) {
      EmailService.sendApplicationStatusUpdate({
        to: application.applicant.email,
        candidateName: application.applicant.fullName,
        jobTitle: application.job.title,
        referenceNumber: application.referenceNumber,
        newStatus: targetStatus,
        remarks: auditRemarks,
      }).catch((err) => console.error('[Email Error] Final decision email failed:', err.message));
    }

    AuditLogService.log({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      actorRole: adminUser.role,
      action: 'FINAL_SELECTION_DECISION',
      entityType: 'JobApplication',
      entityId: applicationId,
      description: `Admin made final selection decision: ${targetStatus} for candidate ${application.applicant.fullName}. Remarks: ${auditRemarks}`,
    });

    return {
      applicationId,
      status: targetStatus,
      message: `Final selection decision applied successfully: ${targetStatus}`,
    };
  },
};

