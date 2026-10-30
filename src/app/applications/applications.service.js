import crypto from 'crypto';
import { prisma } from '../../core/database/prisma.js';
import { applicationsRepository } from './applications.repository.js';
import { AppError } from '../../core/errors/AppError.js';

// Collision-safe characters avoiding visually ambiguous chars (0, O, 1, I, L)
const REFERENCE_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const applicationsService = {
  /**
   * Generates a collision-safe, unique application reference number.
   * Format: NX-APP-YYYY-XXXXXX (e.g. NX-APP-2026-F8K3M9)
   */
  async generateReferenceNumber(year = new Date().getFullYear()) {
    for (let attempt = 0; attempt < 5; attempt++) {
      let code = '';
      const randomBytes = crypto.randomBytes(6);
      for (let i = 0; i < 6; i++) {
        code += REFERENCE_CHARSET[randomBytes[i] % REFERENCE_CHARSET.length];
      }

      const referenceNumber = `NX-APP-${year}-${code}`;
      const existing = await applicationsRepository.findByReferenceNumber(referenceNumber);
      if (!existing) {
        return referenceNumber;
      }
    }
    // Fallback if 5 collisions occur (virtually impossible)
    return `NX-APP-${year}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  },

  /**
   * Complete 8-Step Application Submission Workflow
   */
  async submitApplication(jobId, applicantId, payload) {
    const {
      resumeId,
      certificateIds = [],
      coverNote,
      noticePeriod,
      privacyAcknowledged,
      privacyNoticeVersion = '1.2',
    } = payload;

    // 1. Verify Applicant Account & Profile Completeness
    const user = await prisma.user.findUnique({
      where: { id: applicantId },
      include: { profile: true },
    });

    if (!user) {
      throw AppError.unauthorized('Applicant account not found');
    }

    if (user.status !== 'ACTIVE') {
      throw AppError.forbidden('Applicant account is inactive. Please contact support.');
    }

    if (!user.profile || !user.profile.phone || user.profile.phone.trim() === '') {
      throw AppError.badRequest(
        'Incomplete applicant profile: A valid contact phone number is required to submit job applications. Please update your profile.'
      );
    }

    // 2. Load & Validate Job Post Status and Deadline
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw AppError.notFound('Job posting not found');
    }

    if (job.status !== 'PUBLISHED') {
      throw AppError.badRequest('This job posting is not accepting applications (Not Published).');
    }

    if (job.applicationDeadline) {
      const now = new Date();
      const deadline = new Date(job.applicationDeadline);
      if (now > deadline) {
        throw AppError.badRequest(
          `The application deadline for this job posting has passed (${deadline.toLocaleDateString('en-US')}).`
        );
      }
    }

    // 3. Duplicate Application Safeguard (Application Level)
    const existingApp = await applicationsRepository.findApplicationByApplicantAndJob(applicantId, jobId);
    if (existingApp) {
      throw AppError.conflict(
        `You have already submitted an application for "${job.title}" under reference ${existingApp.referenceNumber}.`
      );
    }

    // 4. Validate Selected Resume (Ownership, Type, Active Status)
    const resume = await prisma.applicantDocument.findFirst({
      where: {
        id: resumeId,
        userId: applicantId,
        deletedAt: null,
      },
    });

    if (!resume || resume.type !== 'RESUME') {
      throw AppError.badRequest(
        'Invalid or inaccessible resume selected. Please select an active resume from your documents vault.'
      );
    }

    // 5. Validate Attached Certificates (Ownership & Active Status)
    const uniqueCertIds = [...new Set(certificateIds.filter(Boolean))];
    const attachedCertificates = [];

    if (uniqueCertIds.length > 0) {
      const foundCerts = await prisma.applicantDocument.findMany({
        where: {
          id: { in: uniqueCertIds },
          userId: applicantId,
          deletedAt: null,
        },
      });

      if (foundCerts.length !== uniqueCertIds.length) {
        throw AppError.badRequest('One or more selected certificate documents could not be found or verified.');
      }

      attachedCertificates.push(...foundCerts);
    }

    // 6. Generate Collision-Safe Reference Number
    const referenceNumber = await this.generateReferenceNumber();

    // 7. Prepare Applicant Profile Snapshot
    const applicantSnapshot = {
      applicantId: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.profile.phone,
      currentLocation: user.profile.currentLocation || null,
      highestQualification: user.profile.highestQualification || null,
      collegeUniversity: user.profile.collegeUniversity || null,
      graduationYear: user.profile.graduationYear || null,
      technicalSkills: user.profile.technicalSkills || [],
      totalExperienceYears: user.profile.totalExperienceYears ? Number(user.profile.totalExperienceYears) : null,
      currentOrPreviousEmployer: user.profile.currentOrPreviousEmployer || null,
      linkedinUrl: user.profile.linkedinUrl || null,
      githubUrl: user.profile.githubUrl || null,
      portfolioUrl: user.profile.portfolioUrl || null,
    };

    // 8. Prepare Document Snapshots for Historical Preservation
    const documentSnapshots = [
      {
        documentId: resume.id,
        documentType: resume.type,
        originalFilename: resume.originalFilename,
        storageKey: resume.storageKey,
        mimeType: resume.mimeType,
        fileSizeBytes: resume.fileSizeBytes,
        checksumSha256: resume.checksumSha256,
        isResume: true,
      },
      ...attachedCertificates.map((cert) => ({
        documentId: cert.id,
        documentType: cert.type,
        originalFilename: cert.originalFilename,
        storageKey: cert.storageKey,
        mimeType: cert.mimeType,
        fileSizeBytes: cert.fileSizeBytes,
        checksumSha256: cert.checksumSha256,
        isResume: false,
      })),
    ];

    const documentIdsToIncrement = [resume.id, ...attachedCertificates.map((c) => c.id)];

    const applicationData = {
      referenceNumber,
      applicantId,
      jobId,
      status: 'SUBMITTED',
      resumeId: resume.id,
      coverNote: coverNote?.trim() || null,
      noticePeriod: noticePeriod?.trim() || null,
      privacyAcknowledgedAt: new Date(),
      privacyNoticeVersion,
      applicantSnapshot,
    };

    // 9. Atomic Transaction Execution
    try {
      const application = await applicationsRepository.createApplicationWithSnapshots({
        applicationData,
        documentSnapshots,
        documentIdsToIncrement,
      });

      return {
        id: application.id,
        referenceNumber: application.referenceNumber,
        status: application.status,
        jobTitle: job.title,
        jobCode: job.jobCode,
        department: job.department,
        submittedAt: application.submittedAt,
        documentsAttachedCount: documentSnapshots.length,
      };
    } catch (err) {
      // Prisma P2002: Unique constraint failed
      if (err.code === 'P2002') {
        throw AppError.conflict(
          `You have already submitted an application for "${job.title}". Duplicate applications are not permitted.`
        );
      }
      throw err;
    }
  },

  /**
   * Retrieves applications submitted by the authenticated applicant with filtering & pagination.
   */
  async getMyApplications(applicantId, options = {}) {
    return applicationsRepository.findApplicationsByApplicant(applicantId, options);
  },

  /**
   * Retrieves dashboard summary metrics and 5 latest applications.
   */
  async getApplicantDashboard(applicantId) {
    const user = await prisma.user.findUnique({
      where: { id: applicantId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw AppError.unauthorized('Applicant account not found');
    }

    const { summary, recentApplications } = await applicationsRepository.getApplicantDashboardMetrics(applicantId);

    const technicalSkillsCount = Array.isArray(user.profile?.technicalSkills)
      ? user.profile.technicalSkills.length
      : 0;

    const isProfileConfigured = Boolean(user.profile?.phone && user.profile?.highestQualification);

    return {
      applicant: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.profile?.phone || null,
        skillsCount: technicalSkillsCount,
        isProfileConfigured,
      },
      summary,
      recentApplications: recentApplications.map((app) => ({
        id: app.id,
        referenceNumber: app.referenceNumber,
        jobTitle: app.job?.title || 'Unknown Role',
        location: app.job?.location || 'Remote',
        department: app.job?.department || null,
        employmentType: app.job?.employmentType || null,
        workMode: app.job?.workMode || null,
        status: app.status,
        submittedAt: app.submittedAt,
        updatedAt: app.updatedAt,
      })),
    };
  },

  /**
   * Retrieves full details for a specific application submitted by the applicant.
   */
  async getMyApplicationDetails(id, applicantId) {
    const application = await applicationsRepository.findApplicantApplicationDetails(id, applicantId);
    if (!application) {
      throw AppError.notFound('Application not found or access denied');
    }
    return application;
  },

  /**
   * Retrieves authorized document snapshots attached to an applicant's application.
   */
  async getMyApplicationDocuments(id, applicantId) {
    const application = await applicationsRepository.findApplicantApplicationDetails(id, applicantId);
    if (!application) {
      throw AppError.notFound('Application not found or access denied');
    }
    return application.documents || [];
  },

  /**
   * Allows an applicant to withdraw their submitted application.
   */
  async withdrawApplication(id, applicantId, reason) {
    const application = await applicationsRepository.findApplicantApplicationDetails(id, applicantId);
    if (!application) {
      throw AppError.notFound('Application not found or access denied');
    }

    if (application.status === 'WITHDRAWN') {
      throw AppError.badRequest('This application has already been withdrawn.');
    }

    if (['REJECTED', 'OFFER_EXTENDED', 'HIRED'].includes(application.status)) {
      throw AppError.badRequest(`Cannot withdraw application in status "${application.status}".`);
    }

    const updated = await applicationsRepository.updateStatus(id, {
      status: 'WITHDRAWN',
      withdrawnAt: new Date(),
      withdrawalReason: reason?.trim() || 'Withdrawn by candidate',
    });

    return {
      id: updated.id,
      referenceNumber: updated.referenceNumber,
      status: updated.status,
      withdrawnAt: updated.withdrawnAt,
      message: 'Application withdrawn successfully.',
    };
  },
};

