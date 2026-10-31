import { prisma } from '../../core/database/prisma.js';

const toDateSafe = (val) => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'string' && /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(val.trim())) {
    const [d, m, y] = val.trim().split(/[-/]/);
    return new Date(`${y}-${m}-${d}`);
  }
  return new Date(val);
};

export const interviewsRepository = {
  /**
   * Retrieves aggregated interview metrics for Admin dashboard
   */
  async getDashboardMetrics() {
    const now = new Date();
    const [statusCounts, upcomingCount, requiringFeedbackCount] = await Promise.all([
      prisma.interview.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.interview.count({
        where: {
          status: 'SCHEDULED',
          interviewDate: { gte: now },
        },
      }),
      prisma.interview.count({
        where: {
          status: 'SCHEDULED',
          interviewDate: { lt: now },
          feedbacks: { none: {} },
        },
      }),
    ]);

    const summary = {
      total: 0,
      scheduled: 0,
      upcoming: upcomingCount,
      completed: 0,
      cancelled: 0,
      rescheduled: 0,
      requiringFeedback: requiringFeedbackCount,
    };

    for (const item of statusCounts) {
      const count = item._count.id;
      summary.total += count;
      if (item.status === 'SCHEDULED') summary.scheduled += count;
      if (item.status === 'COMPLETED') summary.completed += count;
      if (item.status === 'CANCELLED') summary.cancelled += count;
      if (item.status === 'RESCHEDULED') summary.rescheduled += count;
    }

    return summary;
  },

  /**
   * Lists interviews with search, status, mode, and pagination
   */
  async findInterviews({
    page = 1,
    limit = 10,
    search,
    status,
    mode,
    fromDate,
    toDate,
    applicantId,
    sortBy = 'interviewDate',
    sortOrder = 'desc',
  }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (applicantId) {
      where.applicantId = applicantId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (mode && mode !== 'ALL') {
      where.mode = mode;
    }

    if (fromDate || toDate) {
      where.interviewDate = {};
      if (fromDate) where.interviewDate.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        if (toDate.length === 10) end.setHours(23, 59, 59, 999);
        where.interviewDate.lte = end;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { round: { contains: term, mode: 'insensitive' } },
        { interviewerName: { contains: term, mode: 'insensitive' } },
        { applicant: { fullName: { contains: term, mode: 'insensitive' } } },
        { applicant: { email: { contains: term, mode: 'insensitive' } } },
        { job: { title: { contains: term, mode: 'insensitive' } } },
        { application: { referenceNumber: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [interviews, total] = await Promise.all([
      prisma.interview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          applicant: {
            select: { id: true, fullName: true, email: true, profile: { select: { phone: true } } },
          },
          job: {
            select: { id: true, title: true, department: true, location: true },
          },
          application: {
            select: { id: true, referenceNumber: true, status: true },
          },
          scheduleHistories: {
            include: { changedBy: { select: { id: true, fullName: true, email: true } } },
            orderBy: { createdAt: 'desc' },
          },
          feedbacks: {
            select: { id: true, recommendation: true, overallFeedback: true, createdAt: true },
          },
          _count: {
            select: { feedbacks: true, scheduleHistories: true },
          },
        },
      }),
      prisma.interview.count({ where }),
    ]);

    const mappedInterviews = interviews.map((item) => ({
      ...item,
      meetingLink: item.meetingLinkOrLocation,
      location: item.meetingLinkOrLocation,
    }));

    return {
      interviews: mappedInterviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Retrieves interview by ID with full details
   */
  async findById(id) {
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        applicant: {
          select: { id: true, fullName: true, email: true, profile: true },
        },
        job: true,
        application: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        feedbacks: {
          include: {
            submittedBy: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        scheduleHistories: {
          include: {
            changedBy: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!interview) return null;

    return {
      ...interview,
      meetingLink: interview.meetingLinkOrLocation,
      location: interview.meetingLinkOrLocation,
    };
  },

  /**
   * Generates a unique human-friendly interview code
   */
  async generateInterviewCode() {
    const year = new Date().getFullYear();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 5; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `NX-INT-${year}-${rand}`;
  },

  /**
   * Creates an interview inside a transaction and updates application status to INTERVIEW_SCHEDULED
   */
  async createInterview(data, adminId) {
    const interviewCode = data.interviewCode || await this.generateInterviewCode();
    return prisma.$transaction(async (tx) => {
      const interview = await tx.interview.create({
        data: {
          interviewCode,
          applicationId: data.applicationId,
          applicantId: data.applicantId,
          jobId: data.jobId,
          createdById: adminId,
          round: data.round,
          interviewDate: toDateSafe(data.interviewDate),
          startTime: data.startTime,
          endTime: data.endTime,
          mode: data.mode || 'ONLINE',
          meetingLinkOrLocation: data.meetingLinkOrLocation,
          interviewerName: data.interviewerName || null,
          interviewerEmail: data.interviewerEmail || null,
          instructions: data.instructions || null,
          status: 'SCHEDULED',
        },
        include: {
          applicant: { select: { id: true, fullName: true, email: true } },
          job: { select: { id: true, title: true } },
          application: { select: { id: true, referenceNumber: true, status: true } },
        },
      });

      // Update application status to INTERVIEW_SCHEDULED if not already
      const currentApp = await tx.jobApplication.findUnique({
        where: { id: data.applicationId },
      });

      if (currentApp && currentApp.status !== 'INTERVIEW_SCHEDULED') {
        await tx.jobApplication.update({
          where: { id: data.applicationId },
          data: { status: 'INTERVIEW_SCHEDULED', updatedAt: new Date() },
        });

        await tx.applicationStatusHistory.create({
          data: {
            applicationId: data.applicationId,
            previousStatus: currentApp.status,
            newStatus: 'INTERVIEW_SCHEDULED',
            changedById: adminId,
            applicantVisibleRemarks: `Interview scheduled for round: ${data.round}`,
          },
        });
      }

      return interview;
    });
  },

  /**
   * Reschedules an interview and preserves schedule history
   */
  async rescheduleInterview(id, data, adminId) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.interview.findUnique({ where: { id } });
      if (!existing) return null;

      await tx.interviewScheduleHistory.create({
        data: {
          interviewId: id,
          changedById: adminId,
          previousDate: existing.interviewDate,
          previousStartTime: existing.startTime,
          previousEndTime: existing.endTime,
          previousMode: existing.mode,
          previousLocation: existing.meetingLinkOrLocation,
          newDate: toDateSafe(data.interviewDate),
          newStartTime: data.startTime,
          newEndTime: data.endTime,
          newMode: data.mode || existing.mode,
          newLocation: data.meetingLinkOrLocation || existing.meetingLinkOrLocation,
          reason: data.reason,
        },
      });

      const updated = await tx.interview.update({
        where: { id },
        data: {
          interviewDate: toDateSafe(data.interviewDate),
          startTime: data.startTime,
          endTime: data.endTime,
          meetingLinkOrLocation: data.meetingLinkOrLocation || existing.meetingLinkOrLocation,
          status: 'SCHEDULED',
          updatedAt: new Date(),
        },
        include: {
          applicant: { select: { id: true, fullName: true, email: true } },
          job: { select: { id: true, title: true } },
        },
      });

      return updated;
    });
  },

  /**
   * Cancels an interview and logs history
   */
  async cancelInterview(id, reason, adminId) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.interview.findUnique({ where: { id } });
      if (!existing) return null;

      await tx.interviewScheduleHistory.create({
        data: {
          interviewId: id,
          changedById: adminId,
          previousDate: existing.interviewDate,
          previousStartTime: existing.startTime,
          previousEndTime: existing.endTime,
          previousMode: existing.mode,
          previousLocation: existing.meetingLinkOrLocation,
          newDate: existing.interviewDate,
          newStartTime: existing.startTime,
          newEndTime: existing.endTime,
          newMode: existing.mode,
          newLocation: existing.meetingLinkOrLocation,
          reason,
        },
      });

      const updated = await tx.interview.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason,
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          applicant: { select: { id: true, fullName: true, email: true } },
          job: { select: { id: true, title: true } },
        },
      });

      return updated;
    });
  },

  /**
   * Submits interview feedback
   */
  async addFeedback(interviewId, data, adminId) {
    return prisma.$transaction(async (tx) => {
      const feedback = await tx.interviewFeedback.create({
        data: {
          interviewId,
          submittedById: adminId,
          technicalRating: data.technicalRating || null,
          communicationRating: data.communicationRating || null,
          problemSolvingRating: data.problemSolvingRating || null,
          strengths: data.strengths || null,
          areasForImprovement: data.areasForImprovement || null,
          overallFeedback: data.overallFeedback,
          recommendation: data.recommendation,
        },
      });

      await tx.interview.update({
        where: { id: interviewId },
        data: { status: 'COMPLETED', updatedAt: new Date() },
      });

      // Synchronize parent application status based on evaluation recommendation
      const interviewRecord = await tx.interview.findUnique({
        where: { id: interviewId },
        select: { applicationId: true, round: true },
      });

      if (interviewRecord?.applicationId) {
        const app = await tx.jobApplication.findUnique({
          where: { id: interviewRecord.applicationId },
          select: { status: true },
        });

        if (app && ['INTERVIEW_SCHEDULED', 'UNDER_REVIEW', 'SHORTLISTED'].includes(app.status)) {
          let targetStatus = null;
          let remarks = null;

          if (data.recommendation === 'STRONG_HIRE') {
            targetStatus = 'SELECTED';
            remarks = `Candidate cleared ${interviewRecord.round} round with Strong Hire recommendation. Eligible for official offer.`;
          } else if (data.recommendation === 'NOT_RECOMMENDED') {
            targetStatus = 'REJECTED';
            remarks = `Candidate did not clear ${interviewRecord.round} evaluation. Reason: ${data.overallFeedback || 'Evaluation criteria not met'}.`;
          } else if (data.recommendation === 'RECOMMENDED') {
            // Cleared round, ready for next round
            targetStatus = 'INTERVIEW_SCHEDULED';
            remarks = `Candidate cleared ${interviewRecord.round} round. Eligible for next evaluation round.`;
          }

          if (targetStatus && targetStatus !== app.status) {
            await tx.jobApplication.update({
              where: { id: interviewRecord.applicationId },
              data: { status: targetStatus, updatedAt: new Date() },
            });

            await tx.applicationStatusHistory.create({
              data: {
                applicationId: interviewRecord.applicationId,
                previousStatus: app.status,
                newStatus: targetStatus,
                changedById: adminId,
                applicantVisibleRemarks: remarks,
              },
            });
          }
        }
      }

      return feedback;
    });
  },
};
