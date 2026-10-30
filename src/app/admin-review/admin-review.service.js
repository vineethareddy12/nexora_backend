import { adminReviewRepository } from './admin-review.repository.js';
import { storageService } from '../../core/storage/index.js';
import { AppError } from '../../core/errors/AppError.js';

export const PERMITTED_STATUS_TRANSITIONS = {
  SUBMITTED: ['UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
  UNDER_REVIEW: ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'REJECTED', 'WITHDRAWN'],
  SHORTLISTED: ['INTERVIEW_SCHEDULED', 'SELECTED', 'UNDER_REVIEW', 'REJECTED', 'WITHDRAWN'],
  INTERVIEW_SCHEDULED: ['SELECTED', 'OFFER_EXTENDED', 'REJECTED', 'SHORTLISTED', 'WITHDRAWN'],
  SELECTED: ['HIRED', 'REJECTED', 'WITHDRAWN', 'UNDER_REVIEW'],
  OFFER_EXTENDED: ['HIRED', 'SELECTED', 'REJECTED', 'WITHDRAWN'],
  REJECTED: ['UNDER_REVIEW', 'SHORTLISTED'], // Admin reconsideration
  WITHDRAWN: [],
  HIRED: [],
};

export const adminReviewService = {
  /**
   * Retrieves aggregated dashboard metrics for administrator overview.
   */
  async getDashboardMetrics() {
    return adminReviewRepository.getAdminDashboardMetrics();
  },

  /**
   * Lists applicants with search, profile state and pagination.
   */
  async getApplicants(query) {
    return adminReviewRepository.findApplicants(query);
  },

  /**
   * Retrieves detailed applicant profile and application history.
   */
  async getApplicantDetails(id) {
    const applicant = await adminReviewRepository.findApplicantDetails(id);
    if (!applicant) {
      throw AppError.notFound('Registered applicant not found');
    }
    return applicant;
  },

  /**
   * Lists submitted job applications with search, status and date filters.
   */
  async getApplications(query) {
    return adminReviewRepository.findApplications(query);
  },

  /**
   * Retrieves comprehensive application review details, document snapshots, history and internal notes.
   */
  async getApplicationDetails(id) {
    const application = await adminReviewRepository.findApplicationById(id);
    if (!application) {
      throw AppError.notFound('Job application not found');
    }
    return application;
  },

  /**
   * Updates application status after strictly enforcing state-machine transition rules.
   */
  async updateApplicationStatus(id, { status: newStatus, remarks, internalRemarks }, adminUser) {
    const application = await adminReviewRepository.findApplicationById(id);
    if (!application) {
      throw AppError.notFound('Job application not found');
    }

    const currentStatus = application.status;

    if (currentStatus === newStatus) {
      return { application, message: `Application is already in ${newStatus} status.` };
    }

    const allowedNext = PERMITTED_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(newStatus)) {
      throw AppError.badRequest(
        `Cannot transition application status from ${currentStatus} to ${newStatus}. Permitted next transitions: [${allowedNext.join(', ') || 'None'}]`
      );
    }

    const result = await adminReviewRepository.updateStatusWithHistory(
      id,
      newStatus,
      currentStatus,
      adminUser.id,
      remarks,
      internalRemarks
    );

    return result;
  },

  /**
   * Adds an internal review note visible only to administrators.
   */
  async addReviewNote(id, { note }, adminUser) {
    const application = await adminReviewRepository.findApplicationById(id);
    if (!application) {
      throw AppError.notFound('Job application not found');
    }

    return adminReviewRepository.addReviewNote(id, adminUser.id, note.trim());
  },

  /**
   * Retrieves internal review notes for an application.
   */
  async getReviewNotes(id) {
    const application = await adminReviewRepository.findApplicationById(id);
    if (!application) {
      throw AppError.notFound('Job application not found');
    }

    return adminReviewRepository.getReviewNotes(id);
  },

  /**
   * Retrieves chronological status transition history.
   */
  async getStatusHistory(id) {
    const application = await adminReviewRepository.findApplicationById(id);
    if (!application) {
      throw AppError.notFound('Job application not found');
    }

    return adminReviewRepository.getStatusHistory(id);
  },

  /**
   * Securely streams or returns download stream for an application document snapshot.
   */
  async getApplicationDocumentDownload(applicationId, documentId) {
    const document = await adminReviewRepository.findApplicationDocument(applicationId, documentId);
    if (!document) {
      throw AppError.notFound('Application document snapshot not found');
    }

    const download = await storageService.getDocumentDownload(document.storageKey);

    return {
      document,
      download,
    };
  },
};

