import { prisma } from '../../core/database/prisma.js';

export const adminReviewRepository = {
  /**
   * Retrieves live metrics across applicants, applications, statuses and recent submissions.
   */
  async getAdminDashboardMetrics() {
    const now = new Date();
    const [
      totalApplicants,
      totalApplications,
      submitted,
      underReview,
      shortlisted,
      interview,
      selected,
      hired,
      rejected,
      withdrawn,
      totalJobs,
      openJobs,
      closedJobs,
      offersIssued,
      offersAccepted,
      totalInterviews,
      upcomingInterviews,
      recentApplications,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'APPLICANT' } }),
      prisma.jobApplication.count(),
      prisma.jobApplication.count({ where: { status: 'SUBMITTED' } }),
      prisma.jobApplication.count({ where: { status: 'UNDER_REVIEW' } }),
      prisma.jobApplication.count({ where: { status: 'SHORTLISTED' } }),
      prisma.jobApplication.count({ where: { status: 'INTERVIEW_SCHEDULED' } }),
      prisma.jobApplication.count({ where: { OR: [{ status: 'SELECTED' }, { status: 'OFFER_EXTENDED' }] } }),
      prisma.jobApplication.count({ where: { status: 'HIRED' } }),
      prisma.jobApplication.count({ where: { status: 'REJECTED' } }),
      prisma.jobApplication.count({ where: { status: 'WITHDRAWN' } }),
      prisma.job.count(),
      prisma.job.count({
        where: {
          status: 'PUBLISHED',
          OR: [{ applicationDeadline: null }, { applicationDeadline: { gte: now } }],
        },
      }),
      prisma.job.count({
        where: {
          OR: [
            { status: 'CLOSED' },
            { status: 'PUBLISHED', applicationDeadline: { lt: now } },
          ],
        },
      }),
      prisma.jobOffer.count({ where: { status: 'ISSUED' } }),
      prisma.jobOffer.count({ where: { status: 'ACCEPTED' } }),
      prisma.interview.count(),
      prisma.interview.count({ where: { status: 'SCHEDULED' } }),
      prisma.jobApplication.findMany({
        take: 5,
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          referenceNumber: true,
          status: true,
          submittedAt: true,
          applicant: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          job: {
            select: {
              id: true,
              jobCode: true,
              title: true,
              department: true,
              location: true,
            },
          },
        },
      }),
    ]);

    return {
      summary: {
        totalApplicants,
        totalApplications,
        submitted,
        underReview,
        shortlisted,
        interview,
        selected,
        offered: selected, // backward compatibility
        hired,
        rejected,
        withdrawn,
        totalJobs,
        openJobs,
        closedJobs,
        openVacancies: openJobs, // backward compatibility
        offersIssued,
        offersAccepted,
        totalInterviews,
        upcomingInterviews,
      },
      recentApplications: recentApplications.map((app) => ({
        id: app.id,
        referenceNumber: app.referenceNumber,
        status: app.status,
        submittedAt: app.submittedAt,
        candidateName: app.applicant.fullName,
        candidateEmail: app.applicant.email,
        jobTitle: app.job.title,
        jobDepartment: app.job.department,
        jobLocation: app.job.location,
      })),
    };
  },

  /**
   * Retrieves paginated registered applicants with search, profile state and application counts.
   */
  async findApplicants(options = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      hasProfile = 'ALL',
      status = 'ALL',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const where = { role: 'APPLICANT' };

    if (status && status !== 'ALL') {
      if (status === 'SELECTED' || status === 'OFFER_EXTENDED') {
        where.status = { in: ['SELECTED', 'OFFER_EXTENDED'] };
      } else {
        where.status = status;
      }
    }

    if (hasProfile === 'YES') {
      where.profile = { isNot: null };
    } else if (hasProfile === 'NO') {
      where.profile = { is: null };
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      where.OR = [
        { fullName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { profile: { phone: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const [users, totalRecords] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          profile: {
            select: {
              phone: true,
              highestQualification: true,
              collegeUniversity: true,
              totalExperienceYears: true,
              currentLocation: true,
              technicalSkills: true,
            },
          },
          _count: {
            select: {
              applications: true,
              documents: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return {
      applicants: users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        status: u.status,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        phone: u.profile?.phone || null,
        highestQualification: u.profile?.highestQualification || null,
        collegeUniversity: u.profile?.collegeUniversity || null,
        totalExperienceYears: u.profile?.totalExperienceYears ? Number(u.profile.totalExperienceYears) : 0,
        currentLocation: u.profile?.currentLocation || null,
        technicalSkills: u.profile?.technicalSkills || [],
        applicationsCount: u._count.applications,
        documentsCount: u._count.documents,
        hasProfile: Boolean(u.profile),
      })),
      pagination: {
        page,
        limit,
        total: totalRecords,
        totalRecords,
        totalPages,
      },
    };
  },

  /**
   * Retrieves full details for a registered applicant.
   */
  async findApplicantDetails(id) {
    return prisma.user.findFirst({
      where: { id, role: 'APPLICANT' },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        profile: true,
        documents: {
          select: {
            id: true,
            type: true,
            originalFilename: true,
            mimeType: true,
            fileSizeBytes: true,
            createdAt: true,
          },
        },
        applications: {
          orderBy: { submittedAt: 'desc' },
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            submittedAt: true,
            updatedAt: true,
            job: {
              select: {
                id: true,
                jobCode: true,
                title: true,
                department: true,
                location: true,
                status: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Retrieves paginated candidate applications with search, status filters and date ranges.
   */
  async findApplications(options = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      status = 'ALL',
      jobId,
      fromDate,
      toDate,
      sortBy = 'submittedAt',
      sortOrder = 'desc',
    } = options;

    const where = {};

    if (status && status !== 'ALL') {
      if (status === 'SELECTED' || status === 'OFFER_EXTENDED') {
        where.status = { in: ['SELECTED', 'OFFER_EXTENDED'] };
      } else {
        where.status = status;
      }
    }

    if (jobId) {
      where.jobId = jobId;
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      where.OR = [
        { referenceNumber: { contains: term, mode: 'insensitive' } },
        { applicant: { fullName: { contains: term, mode: 'insensitive' } } },
        { applicant: { email: { contains: term, mode: 'insensitive' } } },
        { job: { title: { contains: term, mode: 'insensitive' } } },
      ];
    }

    if (fromDate || toDate) {
      where.submittedAt = {};
      if (fromDate) where.submittedAt.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        if (toDate.length === 10) end.setHours(23, 59, 59, 999);
        where.submittedAt.lte = end;
      }
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const [applications, totalRecords] = await Promise.all([
      prisma.jobApplication.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          referenceNumber: true,
          status: true,
          submittedAt: true,
          updatedAt: true,
          noticePeriod: true,
          applicant: {
            select: {
              id: true,
              fullName: true,
              email: true,
              profile: {
                select: {
                  phone: true,
                  currentLocation: true,
                  highestQualification: true,
                  totalExperienceYears: true,
                },
              },
            },
          },
          job: {
            select: {
              id: true,
              jobCode: true,
              title: true,
              department: true,
              location: true,
              employmentType: true,
              workMode: true,
              status: true,
            },
          },
          _count: {
            select: {
              documents: true,
              statusHistory: true,
              reviewNotes: true,
            },
          },
        },
      }),
      prisma.jobApplication.count({ where }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return {
      applications: applications.map((app) => ({
        id: app.id,
        referenceNumber: app.referenceNumber,
        status: app.status,
        submittedAt: app.submittedAt,
        updatedAt: app.updatedAt,
        noticePeriod: app.noticePeriod,
        applicant: {
          id: app.applicant.id,
          fullName: app.applicant.fullName,
          email: app.applicant.email,
          phone: app.applicant.profile?.phone || null,
          location: app.applicant.profile?.currentLocation || null,
          qualification: app.applicant.profile?.highestQualification || null,
          experience: app.applicant.profile?.totalExperienceYears
            ? Number(app.applicant.profile.totalExperienceYears)
            : 0,
        },
        job: app.job,
        documentsCount: app._count.documents,
        notesCount: app._count.reviewNotes,
        historyCount: app._count.statusHistory,
      })),
      pagination: {
        page,
        limit,
        total: totalRecords,
        totalRecords,
        totalPages,
      },
    };
  },

  /**
   * Retrieves complete application details, frozen document snapshots, status history and internal notes.
   */
  async findApplicationById(id) {
    return prisma.jobApplication.findUnique({
      where: { id },
      include: {
        applicant: {
          select: {
            id: true,
            fullName: true,
            email: true,
            createdAt: true,
            profile: true,
          },
        },
        job: true,
        documents: {
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
              },
            },
          },
        },
        reviewNotes: {
          orderBy: { createdAt: 'desc' },
          include: {
            admin: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Updates application status and writes an immutable audit record in status history within a transaction.
   */
  async updateStatusWithHistory(applicationId, newStatus, previousStatus, adminId, remarks, internalRemarks) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.jobApplication.update({
        where: { id: applicationId },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      });

      const history = await tx.applicationStatusHistory.create({
        data: {
          applicationId,
          previousStatus,
          newStatus,
          changedById: adminId,
          applicantVisibleRemarks: remarks || null,
          internalRemarks: internalRemarks || null,
        },
        include: {
          changedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      return { application: updated, history };
    });
  },

  /**
   * Records an internal recruitment review note visible exclusively to authorized administrators.
   */
  async addReviewNote(applicationId, adminId, note) {
    return prisma.applicationReviewNote.create({
      data: {
        applicationId,
        adminId,
        note,
      },
      include: {
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  },

  /**
   * Retrieves internal notes for an application.
   */
  async getReviewNotes(applicationId) {
    return prisma.applicationReviewNote.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  },

  /**
   * Retrieves status history for an application.
   */
  async getStatusHistory(applicationId) {
    return prisma.applicationStatusHistory.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
      include: {
        changedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  },

  /**
   * Finds a document snapshot belonging to an application.
   */
  async findApplicationDocument(applicationId, documentId) {
    return prisma.applicationDocumentSnapshot.findFirst({
      where: {
        id: documentId,
        applicationId,
      },
    });
  },
};
