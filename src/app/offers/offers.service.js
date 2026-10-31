import { offersRepository } from './offers.repository.js';
import { prisma } from '../../core/database/prisma.js';
import { AppError } from '../../core/errors/AppError.js';
import { AuditLogService } from '../../core/audit/audit.service.js';
import { NotificationService } from '../notifications/notifications.service.js';
import { EmailService } from '../../core/email/index.js';
import { generateOfferLetterHtml } from './offers.pdf.js';
import { env } from '../../core/config/env.js';
import { storageService } from '../../core/storage/index.js';

export const offersService = {
  /**
   * Generates a unique human-friendly offer code
   */
  async generateOfferCode() {
    const year = new Date().getFullYear();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    let exists = true;

    while (exists) {
      let rand = '';
      for (let i = 0; i < 5; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code = `NX-OFR-${year}-${rand}`;
      const found = await prisma.jobOffer.findUnique({ where: { offerCode: code } });
      if (!found) exists = false;
    }

    return code;
  },

  /**
   * Admin: Get dashboard metrics
   */
  async getMetrics() {
    return offersRepository.getDashboardMetrics();
  },

  /**
   * Admin: List all offers with filters
   */
  async listOffers(params) {
    return offersRepository.findOffers(params);
  },

  parseOfferTerms(offer) {
    if (!offer) return { termsText: '', attachment: null };
    let termsText = offer.termsAndConditions || '';
    let attachment = null;

    try {
      const parsed = JSON.parse(offer.termsAndConditions);
      if (parsed && typeof parsed === 'object') {
        termsText = parsed.text || '';
        attachment = parsed.attachment || null;
      }
    } catch {
      // Plain text terms
    }

    return { termsText, attachment };
  },

  /**
   * Get single offer by ID (accessible by admin, or applicant owner)
   */
  async getOfferById(id, requestingUser) {
    const offer = await offersRepository.findById(id);
    if (!offer) {
      throw AppError.notFound('Offer not found');
    }

    // Role-based access control
    if (requestingUser.role === 'APPLICANT' && offer.applicantId !== requestingUser.id) {
      throw AppError.forbidden('You are not authorized to view this offer');
    }

    // Hide draft offers from applicant
    if (requestingUser.role === 'APPLICANT' && offer.status === 'DRAFT') {
      throw AppError.notFound('Offer not found');
    }

    const { termsText, attachment } = this.parseOfferTerms(offer);
    return {
      ...offer,
      termsText,
      attachment,
    };
  },

  /**
   * Admin: Create draft offer
   */
  async createOffer(data, adminUser, req) {
    // Validate application exists
    const application = await prisma.jobApplication.findUnique({
      where: { id: data.applicationId },
      include: { applicant: true, job: true },
    });

    if (!application) {
      throw AppError.notFound('Associated job application not found');
    }

    // Prompt Rule 8: Only candidates whose application status is SELECTED can receive an offer
    if (application.status !== 'SELECTED') {
      throw AppError.badRequest(
        `Only candidates with status 'SELECTED' are eligible to receive a job offer. Current candidate status is '${application.status}'.`
      );
    }

    // Check if an active offer already exists for this application
    const existingOffer = await prisma.jobOffer.findFirst({
      where: {
        applicationId: data.applicationId,
        status: { in: ['DRAFT', 'ISSUED', 'ACCEPTED'] },
      },
    });

    if (existingOffer) {
      throw AppError.conflict(`An active offer (${existingOffer.offerCode}) already exists for this application`);
    }

    const offerCode = await this.generateOfferCode();
    const offer = await offersRepository.createOffer(
      {
        ...data,
        applicantId: application.applicantId,
        jobId: application.jobId,
      },
      offerCode,
      adminUser.id
    );

    // Audit log
    await AuditLogService.log({
      actorId: adminUser.id,
      actorRole: adminUser.role,
      actorEmail: adminUser.email,
      actorName: adminUser.fullName,
      action: 'OFFER_CREATED',
      entityType: 'JobOffer',
      entityId: offer.id,
      description: `Created draft offer ${offerCode} for ${application.applicant.fullName}`,
      req,
    });

    return offer;
  },

  /**
   * Admin: Update draft offer
   */
  async updateOffer(id, data, adminUser, req) {
    const offer = await offersRepository.findById(id);
    if (!offer) {
      throw AppError.notFound('Offer not found');
    }

    if (offer.status !== 'DRAFT') {
      throw AppError.badRequest('Only DRAFT offers can be modified. Withdraw and recreate if necessary.');
    }

    const updated = await offersRepository.updateOffer(id, data, adminUser.id);

    await AuditLogService.log({
      actorId: adminUser.id,
      actorRole: adminUser.role,
      actorEmail: adminUser.email,
      actorName: adminUser.fullName,
      action: 'OFFER_UPDATED',
      entityType: 'JobOffer',
      entityId: id,
      description: `Updated draft offer details for ${offer.offerCode}`,
      req,
    });

    return updated;
  },

  /**
   * Admin: Issue offer to applicant
   */
  async issueOffer(id, adminUser, req) {
    const offer = await offersRepository.findById(id);
    if (!offer) {
      throw AppError.notFound('Offer not found');
    }

    if (offer.status !== 'DRAFT') {
      throw AppError.badRequest(`Cannot issue an offer with status '${offer.status}'`);
    }

    // Prompt Rule 8 & 11: Verify candidate is SELECTED
    if (offer.application?.status !== 'SELECTED') {
      throw AppError.badRequest(
        `Only candidates with application status 'SELECTED' are eligible to receive an issued offer. Current status is '${offer.application?.status}'.`
      );
    }

    // Prompt Rule 10 & 11: PDF attachment is mandatory before issuing
    const { attachment } = this.parseOfferTerms(offer);
    if (!attachment) {
      throw AppError.badRequest('A signed offer letter PDF attachment is mandatory before issuing the offer. Please upload the PDF document.');
    }

    const issued = await offersRepository.issueOffer(id, adminUser.id);

    // Update job application status to OFFER_EXTENDED if applicable
    await prisma.jobApplication.update({
      where: { id: offer.applicationId },
      data: { status: 'OFFER_EXTENDED', updatedAt: new Date() },
    });

    // Notify Applicant
    await NotificationService.notify({
      userId: offer.applicantId,
      title: 'Congratulations! Job Offer Issued',
      message: `Nexora Technologies has extended a formal employment offer for the role of ${offer.designation}. Please review and respond in your candidate portal.`,
      type: 'ACTION_REQUIRED',
      link: `/app/offers`,
      metadata: { offerId: offer.id, offerCode: offer.offerCode },
    });

    // Send Email
    if (offer.applicant?.email) {
      await EmailService.sendOfferIssuedEmail({
        recipientEmail: offer.applicant.email,
        candidateName: offer.applicant.fullName,
        jobTitle: offer.designation || offer.job?.title,
        offerCode: offer.offerCode,
        joiningDate: offer.joiningDate,
        salary: offer.salary ? `${offer.currency} ${Number(offer.salary).toLocaleString('en-IN')}` : 'As specified in offer letter',
        portalUrl: `${env.FRONTEND_URL}/app/offers`,
      });
    }

    // Audit Log
    await AuditLogService.log({
      actorId: adminUser.id,
      actorRole: adminUser.role,
      actorEmail: adminUser.email,
      actorName: adminUser.fullName,
      action: 'OFFER_ISSUED',
      entityType: 'JobOffer',
      entityId: id,
      description: `Issued offer ${offer.offerCode} to ${offer.applicant.fullName}`,
      req,
    });

    return issued;
  },

  /**
   * Admin: Withdraw offer
   */
  async withdrawOffer(id, reason, adminUser, req) {
    const offer = await offersRepository.findById(id);
    if (!offer) {
      throw AppError.notFound('Offer not found');
    }

    if (offer.status === 'WITHDRAWN' || offer.status === 'DECLINED') {
      throw AppError.badRequest(`Offer is already ${offer.status}`);
    }

    const withdrawn = await offersRepository.withdrawOffer(id, reason, adminUser.id);

    // Notify applicant if offer had been issued
    if (offer.status === 'ISSUED') {
      await NotificationService.notify({
        userId: offer.applicantId,
        title: 'Employment Offer Update',
        message: `Your employment offer (${offer.offerCode}) for ${offer.designation} has been withdrawn by the recruitment team.`,
        type: 'WARNING',
        link: `/app/offers`,
        metadata: { offerId: offer.id, offerCode: offer.offerCode },
      });
    }

    // Audit Log
    await AuditLogService.log({
      actorId: adminUser.id,
      actorRole: adminUser.role,
      actorEmail: adminUser.email,
      actorName: adminUser.fullName,
      action: 'OFFER_WITHDRAWN',
      entityType: 'JobOffer',
      entityId: id,
      description: `Withdrew offer ${offer.offerCode}. Reason: ${reason}`,
      req,
    });

    return withdrawn;
  },

  /**
   * Applicant: Respond to offer (ACCEPT / DECLINE)
   */
  async respondToOffer(id, decision, notes, applicantUser, req) {
    const offer = await offersRepository.findById(id);
    if (!offer) {
      throw AppError.notFound('Offer not found');
    }

    if (offer.applicantId !== applicantUser.id) {
      throw AppError.forbidden('You are not authorized to respond to this offer');
    }

    if (offer.status !== 'ISSUED') {
      throw AppError.badRequest(`Cannot respond to offer with status '${offer.status}'`);
    }

    // Check expiry
    if (offer.expiryDate && new Date(offer.expiryDate) < new Date()) {
      throw AppError.badRequest('This offer has expired. Please contact the recruitment team.');
    }

    const updated = await offersRepository.respondToOffer(id, decision, notes, applicantUser.id);

    // If accepted, update application status
    if (decision === 'ACCEPTED') {
      await prisma.jobApplication.update({
        where: { id: offer.applicationId },
        data: { status: 'OFFER_EXTENDED', updatedAt: new Date() },
      });
    }

    // Notify Admins
    await NotificationService.notifyAdmins({
      title: `Offer ${decision === 'ACCEPTED' ? 'Accepted' : 'Declined'}`,
      message: `${applicantUser.fullName} has ${decision.toLowerCase()} the offer (${offer.offerCode}) for ${offer.designation}.`,
      type: decision === 'ACCEPTED' ? 'SUCCESS' : 'WARNING',
      link: `/admin/offers`,
      metadata: { offerId: id, applicantId: applicantUser.id, decision },
    });

    // Notify Applicant confirmation
    await NotificationService.notify({
      userId: applicantUser.id,
      title: decision === 'ACCEPTED' ? 'Offer Acceptance Confirmed' : 'Offer Decline Recorded',
      message: decision === 'ACCEPTED'
        ? `Thank you for accepting our offer for ${offer.designation}! Our HR onboarding team will connect with you shortly.`
        : `Your decision to decline the offer for ${offer.designation} has been recorded. We wish you success in your future endeavors.`,
      type: decision === 'ACCEPTED' ? 'SUCCESS' : 'INFO',
      link: `/app/offers`,
    });

    // Email to Admins & Candidate
    if (decision === 'ACCEPTED') {
      await EmailService.sendOfferAcceptedEmail({
        recipientEmail: applicantUser.email,
        candidateName: applicantUser.fullName,
        jobTitle: offer.designation,
        offerCode: offer.offerCode,
      });
    } else {
      await EmailService.sendOfferDeclinedEmail({
        recipientEmail: applicantUser.email,
        candidateName: applicantUser.fullName,
        jobTitle: offer.designation,
        offerCode: offer.offerCode,
      });
    }

    // Audit Log
    await AuditLogService.log({
      actorId: applicantUser.id,
      actorRole: applicantUser.role,
      actorEmail: applicantUser.email,
      actorName: applicantUser.fullName,
      action: decision === 'ACCEPTED' ? 'OFFER_ACCEPTED' : 'OFFER_DECLINED',
      entityType: 'JobOffer',
      entityId: id,
      description: `Applicant ${applicantUser.fullName} ${decision.toLowerCase()} offer ${offer.offerCode}`,
      req,
    });

    return updated;
  },

  /**
   * Applicant: Get their own offers
   */
  async getApplicantOffers(applicantId, params) {
    return offersRepository.findOffers({
      ...params,
      applicantId,
      // Candidates only see non-draft offers
      status: params.status && params.status !== 'ALL' ? params.status : undefined,
    });
  },

  /**
   * Admin: Upload PDF attachment for offer letter (Mandatory before issuing)
   */
  async uploadAttachment(offerId, file, adminUser) {
    if (!file) {
      throw AppError.badRequest('Please upload an offer letter PDF file.');
    }

    const offer = await offersRepository.findById(offerId);
    if (!offer) {
      throw AppError.notFound('Offer not found');
    }

    if (offer.status !== 'DRAFT') {
      throw AppError.badRequest('Cannot replace or add attachment to an offer that has already been issued.');
    }

    // Save document securely using storageService
    const savedDoc = await storageService.saveApplicantDocument({
      userId: offer.applicantId,
      filename: file.originalname,
      buffer: file.buffer,
      mimeType: 'application/pdf',
      size: file.size,
    });

    const { termsText } = this.parseOfferTerms(offer);
    const updatedTermsPayload = JSON.stringify({
      text: termsText,
      attachment: {
        storageKey: savedDoc.storageKey,
        originalFilename: savedDoc.originalFilename,
        fileSizeBytes: savedDoc.fileSizeBytes,
        mimeType: savedDoc.mimeType,
        checksumSha256: savedDoc.checksumSha256,
        uploadedAt: new Date().toISOString(),
      },
    });

    const updated = await prisma.jobOffer.update({
      where: { id: offerId },
      data: {
        termsAndConditions: updatedTermsPayload,
        updatedAt: new Date(),
      },
      include: {
        applicant: { select: { id: true, fullName: true, email: true } },
        job: true,
        application: true,
      },
    });

    return {
      ...updated,
      ...this.parseOfferTerms(updated),
    };
  },

  /**
   * Admin & Applicant: Get secure stream or signed download URL for attached PDF
   */
  async getAttachmentDownload(offerId, user) {
    const offer = await offersRepository.findById(offerId);
    if (!offer) {
      throw AppError.notFound('Offer not found');
    }

    // Role-based access control: Admin or the specific Applicant
    if (user.role === 'APPLICANT') {
      if (offer.applicantId !== user.id) {
        throw AppError.forbidden('Access denied to this offer attachment');
      }
      if (offer.status === 'DRAFT') {
        throw AppError.notFound('Offer not found');
      }
    }

    const { attachment } = this.parseOfferTerms(offer);
    if (!attachment || !attachment.storageKey) {
      throw AppError.notFound('No PDF document has been attached to this offer.');
    }

    const download = await storageService.getDocumentDownload(attachment.storageKey);
    return {
      download,
      filename: attachment.originalFilename || `Offer_Letter_${offer.offerCode}.pdf`,
    };
  },

  /**
   * Generate preview HTML
   */
  async getOfferHtml(id, requestingUser) {
    const offer = await this.getOfferById(id, requestingUser);
    return generateOfferLetterHtml(offer);
  },
};

