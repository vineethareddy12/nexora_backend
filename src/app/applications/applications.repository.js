import { prisma } from '../../core/database/prisma.js';

export const applicationsRepository = {
  /**
   * Finds an existing application by applicant and job ID (duplicate check).
   */
  async findApplicationByApplicantAndJob(applicantId, jobId) {
    return prisma.jobApplication.findUnique({
      where: {
        applicantId_jobId: {
          applicantId,
          jobId,
        },
      },
    });
  },

  /**
   * Finds an application by its unique reference number.
   */
  async findByReferenceNumber(referenceNumber) {
    return prisma.jobApplication.findUnique({
      where: { referenceNumber },
    });
  },

  /**
   * Lists applications submitted by an applicant with search, filtering, sorting and pagination.
   */
  async findApplicationsByApplicant(applicantId, options = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      status = 'ALL',
      fromDate,
      toDate,
      sortBy = 'submittedAt',
      sortOrder = 'desc',
    } = options;

    const where = { applicantId };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      where.OR = [
        { referenceNumber: { contains: term, mode: 'insensitive' } },
        { job: { title: { contains: term, mode: 'insensitive' } } },
      ];
    }

    if (fromDate || toDate) {
      where.submittedAt = {};
      if (fromDate) where.submittedAt.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        if (toDate.length === 10) {
          end.setHours(23, 59, 59, 999);
        }
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
          withdrawnAt: true,
          noticePeriod: true,
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
          documents: {
            select: {
              id: true,
              isResume: true,
              documentType: true,
              originalFilename: true,
              fileSizeBytes: true,
            },
          },
        },
      }),
      prisma.jobApplication.count({ where }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return {
      applications,
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
   * Aggregates live application counts grouped by status for an applicant.
   */
  async getApplicantDashboardMetrics(applicantId) {
    const [statusCounts, recentApplications] = await Promise.all([
      prisma.jobApplication.groupBy({
        by: ['status'],
        where: { applicantId },
        _count: {
          id: true,
        },
      }),
      prisma.jobApplication.findMany({
        where: { applicantId },
        take: 5,
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
              title: true,
              location: true,
              department: true,
              employmentType: true,
              workMode: true,
            },
          },
        },
      }),
    ]);

    const summary = {
      totalApplications: 0,
      submitted: 0,
      underReview: 0,
      shortlisted: 0,
      interview: 0,
      offered: 0,
      rejected: 0,
      withdrawn: 0,
    };

    for (const item of statusCounts) {
      const count = item._count.id;
      summary.totalApplications += count;

      switch (item.status) {
        case 'SUBMITTED':
          summary.submitted = count;
          break;
        case 'UNDER_REVIEW':
          summary.underReview = count;
          break;
        case 'SHORTLISTED':
          summary.shortlisted = count;
          break;
        case 'INTERVIEW_SCHEDULED':
          summary.interview = count;
          break;
        case 'OFFER_EXTENDED':
        case 'HIRED':
          summary.offered += count;
          break;
        case 'REJECTED':
          summary.rejected = count;
          break;
        case 'WITHDRAWN':
          summary.withdrawn = count;
          break;
        default:
          break;
      }
    }

    return {
      summary,
      recentApplications,
    };
  },

  /**
   * Finds a specific application owned by an applicant with full details.
   */
  async findApplicantApplicationDetails(id, applicantId) {
    return prisma.jobApplication.findFirst({
      where: {
        id,
        applicantId,
      },
      include: {
        job: true,
        documents: true,
      },
    });
  },

  /**
   * Finds an application by ID (for admin or authorized review).
   */
  async findById(id) {
    return prisma.jobApplication.findUnique({
      where: { id },
      include: {
        job: true,
        applicant: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profile: true,
          },
        },
        documents: true,
      },
    });
  },

  /**
   * Atomically creates the job application, snapshots all documents,
   * and increments document applicationCounts inside a database transaction.
   */
  async createApplicationWithSnapshots({
    applicationData,
    documentSnapshots,
    documentIdsToIncrement,
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Create the application
      const application = await tx.jobApplication.create({
        data: applicationData,
      });

      // 2. Create document snapshots
      if (documentSnapshots && documentSnapshots.length > 0) {
        await tx.applicationDocumentSnapshot.createMany({
          data: documentSnapshots.map((snap) => ({
            ...snap,
            applicationId: application.id,
          })),
        });
      }

      // 3. Increment application count on the original documents
      if (documentIdsToIncrement && documentIdsToIncrement.length > 0) {
        await tx.applicantDocument.updateMany({
          where: {
            id: { in: documentIdsToIncrement },
          },
          data: {
            applicationCount: {
              increment: 1,
            },
          },
        });
      }

      // Return application with documents loaded
      return tx.jobApplication.findUnique({
        where: { id: application.id },
        include: {
          job: {
            select: {
              id: true,
              jobCode: true,
              title: true,
              department: true,
            },
          },
          documents: true,
        },
      });
    });
  },

  /**
   * Updates application status (e.g. WITHDRAWN).
   */
  async updateStatus(id, { status, withdrawnAt, withdrawalReason }) {
    return prisma.jobApplication.update({
      where: { id },
      data: {
        status,
        withdrawnAt,
        withdrawalReason,
      },
    });
  },
};

