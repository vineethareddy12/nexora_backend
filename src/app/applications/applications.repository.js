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
   * Lists all applications submitted by an applicant.
   */
  async findApplicationsByApplicant(applicantId) {
    return prisma.jobApplication.findMany({
      where: { applicantId },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        submittedAt: true,
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
    });
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

