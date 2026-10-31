import { getTransporter } from './transporter.js';
import { renderPasswordResetEmail } from './templates/passwordReset.template.js';
import { renderWelcomeApplicantEmail } from './templates/welcome.template.js';
import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';

// Canonical frontend base URL — used for all email CTAs
// In production this resolves to FRONTEND_URL (e.g. https://nexora-mu-two.vercel.app)
const PORTAL_BASE = env.FRONTEND_URL;

function getEmailFrame({ title, headline, bodyContent, ctaText = null, ctaUrl = null }) {
  const ctaButton = ctaText && ctaUrl ? `
    <div style="margin: 28px 0; text-align: center;">
      <a href="${ctaUrl}" style="background: #2563EB; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">
        ${ctaText}
      </a>
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #0F172A;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <tr>
                <td style="padding: 28px 32px; background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%); color: #FFFFFF;">
                  <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">Nexora<span style="color: #60A5FA;">.</span> Technologies</div>
                  <div style="font-size: 12px; color: #DBEAFE; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">Recruitment & Talent Operations</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px;">
                  <h1 style="font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 16px 0;">${headline}</h1>
                  <div style="font-size: 15px; line-height: 1.6; color: #334155;">
                    ${bodyContent}
                  </div>
                  ${ctaButton}
                  <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #F1F5F9; font-size: 13px; color: #64748B; line-height: 1.5;">
                    Best regards,<br>
                    <strong>Nexora Technologies Recruitment Team</strong><br>
                    <a href="https://nexoratech.com" style="color: #2563EB; text-decoration: none;">www.nexoratech.com</a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 16px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #94A3B8;">
                  This is an automated communication from Nexora Technologies Recruitment Portal. Please do not reply directly to this email.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return html;
}

export class EmailService {
  /**
   * Helper to safely dispatch email and record email_logs
   */
  static async sendAndLog({ to, subject, html, text, templateType, relatedEntityType = null, relatedEntityId = null }) {
    let deliveryStatus = 'SENT';
    let providerMessageId = null;
    let failureReason = null;

    try {
      const transporter = getTransporter();
      const fromAddress = env.MAIL_FROM || `Nexora Technologies <${env.SMTP_USER || 'no-reply@nexoratech.com'}>`;

      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text,
        html,
      });

      providerMessageId = info.messageId || 'preview-mode';
      console.log(`[Email] ${templateType} sent to ${to} (MessageId: ${providerMessageId})`);
    } catch (err) {
      deliveryStatus = 'FAILED';
      failureReason = err.message;
      console.error(`[Email Error] ${templateType} to ${to} failed:`, err.message);
    }

    try {
      await prisma.emailLog.create({
        data: {
          recipientEmail: to,
          subject,
          templateType,
          relatedEntityType,
          relatedEntityId: relatedEntityId ? String(relatedEntityId) : null,
          deliveryStatus,
          providerMessageId,
          failureReason,
        },
      });
    } catch (logErr) {
      console.error('[EmailLog Error] Failed to write email log:', logErr.message);
    }

    return {
      success: deliveryStatus === 'SENT',
      messageId: providerMessageId,
      error: failureReason,
    };
  }

  static async sendPasswordReset({ to, userName, resetUrl, expiresInMinutes = 15 }) {
    const { html, text } = renderPasswordResetEmail({ userName, resetUrl, expiresInMinutes });
    return this.sendAndLog({
      to,
      subject: 'Reset Your Nexora Technologies Password',
      html,
      text,
      templateType: 'PASSWORD_RESET',
    });
  }

  static async sendWelcomeApplicant({ to, userName, phone, portalUrl }) {
    const { html, text } = renderWelcomeApplicantEmail({ userName, email: to, phone, portalUrl });
    return this.sendAndLog({
      to,
      subject: 'Welcome to Nexora Technologies — Applicant Workspace Ready',
      html,
      text,
      templateType: 'WELCOME_APPLICANT',
    });
  }

  static async sendApplicationSubmitted({ to, candidateName, jobTitle, referenceNumber, portalUrl }) {
    const bodyContent = `
      <p>Dear ${candidateName},</p>
      <p>Thank you for applying for the <strong>${jobTitle}</strong> position at Nexora Technologies.</p>
      <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
        <div style="font-size: 13px; color: #1E40AF; text-transform: uppercase; font-weight: 700;">Submission Reference</div>
        <div style="font-size: 18px; font-weight: 800; color: #2563EB; font-family: monospace; margin-top: 4px;">${referenceNumber}</div>
      </div>
      <p>Our recruitment team is reviewing your profile and credentials. You can monitor the real-time status of your application from your candidate portal.</p>
    `;
    const html = getEmailFrame({
      title: `Application Received — ${referenceNumber}`,
      headline: 'Your Application Has Been Submitted',
      bodyContent,
      ctaText: 'View Application Status',
      ctaUrl: portalUrl || `${PORTAL_BASE}/app/applications`,
    });
    const text = `Dear ${candidateName},\n\nYour application for ${jobTitle} (Ref: ${referenceNumber}) has been received.\n\nTrack progress on your portal: ${portalUrl || `${PORTAL_BASE}/app/applications`}`;

    return this.sendAndLog({
      to,
      subject: `Application Submitted: ${jobTitle} [${referenceNumber}]`,
      html,
      text,
      templateType: 'APPLICATION_SUBMITTED',
      relatedEntityType: 'JobApplication',
      relatedEntityId: referenceNumber,
    });
  }

  static async sendApplicationStatusUpdate({ to, candidateName, jobTitle, referenceNumber, newStatus, remarks, portalUrl }) {
    const bodyContent = `
      <p>Dear ${candidateName},</p>
      <p>Your application for <strong>${jobTitle}</strong> (Reference: <code>${referenceNumber}</code>) has transitioned to <strong>${newStatus.replace(/_/g, ' ')}</strong>.</p>
      ${remarks ? `<div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-style: italic; color: #475569;">"${remarks}"</div>` : ''}
      <p>Please log in to your applicant dashboard to view complete timeline details and next steps.</p>
    `;
    const html = getEmailFrame({
      title: `Application Status Updated — ${referenceNumber}`,
      headline: 'Application Status Update',
      bodyContent,
      ctaText: 'Check Candidate Portal',
      ctaUrl: portalUrl || `${PORTAL_BASE}/app/applications`,
    });
    const text = `Dear ${candidateName},\n\nYour application for ${jobTitle} (${referenceNumber}) status updated to ${newStatus}.\n\nVisit: ${portalUrl || `${PORTAL_BASE}/app/applications`}`;

    return this.sendAndLog({
      to,
      subject: `Status Update: ${jobTitle} [${referenceNumber}]`,
      html,
      text,
      templateType: 'APPLICATION_STATUS_UPDATE',
      relatedEntityType: 'JobApplication',
      relatedEntityId: referenceNumber,
    });
  }

  static async sendApplicationShortlisted({ to, candidateName, jobTitle, referenceNumber, firstRound, portalUrl }) {
    const bodyContent = `
      <p>Dear ${candidateName},</p>
      <p>Great news! Your application for the <strong>${jobTitle}</strong> position (Reference: <code>${referenceNumber}</code>) has been <strong>SHORTLISTED</strong> by our recruitment committee.</p>
      <div style="background: #ECFEFF; border: 1px solid #A5F3FC; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
        <div style="font-size: 13px; color: #0E7490; text-transform: uppercase; font-weight: 700;">Interview Pipeline Initialized</div>
        <div style="font-size: 16px; font-weight: 700; color: #0891B2; margin-top: 4px;">Next Stage: ${firstRound || 'Stage 1 Evaluation'} (Eligible)</div>
      </div>
      <p>Our talent acquisition team will schedule your interview coordinates shortly. You can track your interview rounds and access meeting coordinates directly in your candidate workspace.</p>
    `;
    const html = getEmailFrame({
      title: `Application Shortlisted — ${jobTitle}`,
      headline: 'Congratulations! You Have Been Shortlisted',
      bodyContent,
      ctaText: 'View Interview Schedules',
      ctaUrl: portalUrl || `${PORTAL_BASE}/app/interviews`,
    });
    const text = `Dear ${candidateName},\n\nYou have been shortlisted for ${jobTitle} (Ref: ${referenceNumber}). Track your interview schedule at: ${portalUrl || `${PORTAL_BASE}/app/interviews`}`;

    return this.sendAndLog({
      to,
      subject: `Shortlisted: ${jobTitle} [${referenceNumber}]`,
      html,
      text,
      templateType: 'APPLICATION_SHORTLISTED',
      relatedEntityType: 'JobApplication',
      relatedEntityId: referenceNumber,
    });
  }

  static async sendInterviewScheduled({ to, candidateName, jobTitle, round, interviewDate, startTime, endTime, mode, meetingLinkOrLocation, instructions, portalUrl }) {
    const formattedDate = new Date(interviewDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const bodyContent = `
      <p>Dear ${candidateName},</p>
      <p>We are pleased to invite you for an interview for the <strong>${jobTitle}</strong> position.</p>
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px; margin: 18px 0;">
        <table width="100%" cellpadding="4" style="font-size: 14px; color: #334155;">
          <tr><td width="35%"><strong>Interview Round:</strong></td><td>${round}</td></tr>
          <tr><td><strong>Date:</strong></td><td>${formattedDate}</td></tr>
          <tr><td><strong>Time:</strong></td><td>${startTime} – ${endTime}</td></tr>
          <tr><td><strong>Format:</strong></td><td>${mode}</td></tr>
          <tr><td><strong>Link / Location:</strong></td><td><a href="${meetingLinkOrLocation}" target="_blank" style="color: #2563EB;">${meetingLinkOrLocation}</a></td></tr>
        </table>
      </div>
      ${instructions ? `<p><strong>Instructions:</strong><br>${instructions}</p>` : ''}
    `;
    const html = getEmailFrame({
      title: `Interview Scheduled — ${round}`,
      headline: `Interview Invitation: ${round}`,
      bodyContent,
      ctaText: 'View Interview Details',
      ctaUrl: portalUrl || `${PORTAL_BASE}/app/interviews`,
    });
    const text = `Dear ${candidateName},\n\nYou have an interview scheduled for ${jobTitle} (${round}) on ${formattedDate} at ${startTime}.\nDetails: ${meetingLinkOrLocation}`;

    return this.sendAndLog({
      to,
      subject: `Interview Scheduled: ${round} — ${jobTitle}`,
      html,
      text,
      templateType: 'INTERVIEW_SCHEDULED',
      relatedEntityType: 'Interview',
    });
  }

  static async sendInterviewRescheduled({ to, candidateName, jobTitle, round, newDate, newStartTime, newEndTime, reason, meetingLinkOrLocation, portalUrl }) {
    const formattedDate = new Date(newDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const formatTime12 = (t) => {
      if (!t) return '';
      const str = String(t).trim();
      if (str.toLowerCase().includes('am') || str.toLowerCase().includes('pm')) return str;
      const [h, m] = str.split(':').map(Number);
      if (isNaN(h)) return str;
      const period = h >= 12 ? 'PM' : 'AM';
      const hours12 = h % 12 || 12;
      return `${hours12}:${String(m || 0).padStart(2, '0')} ${period}`;
    };

    const timeWindow = `${formatTime12(newStartTime)} – ${formatTime12(newEndTime)}`;
    const isUrl = meetingLinkOrLocation && (meetingLinkOrLocation.startsWith('http://') || meetingLinkOrLocation.startsWith('https://'));

    const bodyContent = `
      <p>Dear ${candidateName},</p>
      <p>Please note that your upcoming interview for <strong>${jobTitle}</strong> (${round}) has been updated and rescheduled.</p>
      <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 20px; margin: 18px 0;">
        <table width="100%" cellpadding="6" style="font-size: 14px; color: #1E3A8A;">
          <tr><td width="35%"><strong>Updated Date:</strong></td><td><strong style="color: #1E40AF;">${formattedDate}</strong></td></tr>
          <tr><td><strong>Updated Time (AM/PM):</strong></td><td><strong style="color: #2563EB;">${timeWindow}</strong></td></tr>
          <tr>
            <td><strong>Meeting Access:</strong></td>
            <td>
              ${isUrl ? `<a href="${meetingLinkOrLocation}" style="color: #2563EB; font-weight: 700; text-decoration: underline;" target="_blank">Open Video Meeting Room</a>` : meetingLinkOrLocation}
            </td>
          </tr>
          ${reason ? `<tr><td><strong>Reason for Update:</strong></td><td><em>${reason}</em></td></tr>` : ''}
        </table>
      </div>
      <p style="font-size: 13px; color: #64748B;">Please ensure you are available in a quiet environment with your camera and microphone tested 5-10 minutes prior to the start time.</p>
    `;

    const html = getEmailFrame({
      title: `Interview Rescheduled — ${round}`,
      headline: 'Notice of Interview Reschedule',
      bodyContent,
      ctaText: 'View Interview in Applicant Hub',
      ctaUrl: portalUrl || `${PORTAL_BASE}/app/interviews`,
    });
    const text = `Dear ${candidateName},\n\nYour interview for ${jobTitle} (${round}) has been rescheduled to ${formattedDate} at ${timeWindow}.\nAccess: ${meetingLinkOrLocation}\nReason: ${reason || 'Schedule update'}`;

    return this.sendAndLog({
      to,
      subject: `[Updated Schedule] ${round} — ${jobTitle}`,
      html,
      text,
      templateType: 'INTERVIEW_RESCHEDULED',
      relatedEntityType: 'Interview',
    });
  }

  static async sendInterviewCancelled({ to, candidateName, jobTitle, round, reason, portalUrl }) {
    const bodyContent = `
      <p>Dear ${candidateName},</p>
      <p>We are writing to inform you that your scheduled interview for <strong>${jobTitle}</strong> (${round}) has been cancelled.</p>
      ${reason ? `<div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px 16px; margin: 16px 0; color: #991B1B;">Reason: "${reason}"</div>` : ''}
      <p>Our recruitment team will reach out to you regarding future steps.</p>
    `;
    const html = getEmailFrame({
      title: `Interview Cancelled — ${round}`,
      headline: 'Interview Cancellation Notice',
      bodyContent,
      ctaText: 'Visit Applicant Portal',
      ctaUrl: portalUrl || `${PORTAL_BASE}/app/interviews`,
    });
    const text = `Dear ${candidateName},\n\nYour interview for ${jobTitle} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`;

    return this.sendAndLog({
      to,
      subject: `Cancelled: ${round} — ${jobTitle}`,
      html,
      text,
      templateType: 'INTERVIEW_CANCELLED',
      relatedEntityType: 'Interview',
    });
  }

  static async sendOfferIssued({ to, candidateName, jobTitle, designation, offerCode, salary, joiningDate, expiryDate, portalUrl }) {
    const formattedExpiry = expiryDate ? new Date(expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Standard 7-day review window';
    const formattedJoining = joiningDate ? new Date(joiningDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : null;
    const bodyContent = `
      <p>Dear ${candidateName},</p>
      <p>Congratulations! Following your evaluation, <strong>Nexora Technologies</strong> is delighted to extend you an official offer of employment for the position of <strong>${designation || jobTitle}</strong>.</p>
      
      <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <div style="font-size: 13px; font-weight: 700; color: #047857; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">Offer Summary</div>
        <table width="100%" cellpadding="6" style="font-size: 14px; color: #065F46; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #D1FAE5;"><td width="38%"><strong>Offer Reference:</strong></td><td><code style="background: #D1FAE5; color: #065F46; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-family: monospace;">${offerCode}</code></td></tr>
          <tr style="border-bottom: 1px solid #D1FAE5;"><td><strong>Designation:</strong></td><td><strong>${designation || jobTitle}</strong></td></tr>
          ${salary ? `<tr style="border-bottom: 1px solid #D1FAE5;"><td><strong>Annual Compensation:</strong></td><td><strong style="color: #047857;">${salary} / annum</strong></td></tr>` : ''}
          ${formattedJoining ? `<tr style="border-bottom: 1px solid #D1FAE5;"><td><strong>Anticipated Joining Date:</strong></td><td><strong>${formattedJoining}</strong></td></tr>` : ''}
          <tr><td><strong>Offer Valid Until:</strong></td><td>${formattedExpiry}</td></tr>
        </table>
      </div>

      <p style="color: #334155; line-height: 1.6;">
        Your formal offer letter containing detailed compensation schedules, probation guidelines, and benefit entitlements has been uploaded to your candidate portal. Please review and record your decision online before the expiry date.
      </p>
    `;
    const html = getEmailFrame({
      title: `Official Offer of Employment — ${offerCode}`,
      headline: 'Employment Offer Extended',
      bodyContent,
      ctaText: 'Review Official Offer Letter',
      ctaUrl: portalUrl || `${PORTAL_BASE}/app/offers`,
    });
    const text = `Dear ${candidateName},\n\nCongratulations! You have received an employment offer from Nexora Technologies for ${designation || jobTitle} (Offer Ref: ${offerCode}).${salary ? `\nAnnual Compensation: ${salary}` : ''}${formattedJoining ? `\nJoining Date: ${formattedJoining}` : ''}\nOffer Valid Until: ${formattedExpiry}\n\nReview & accept at: ${portalUrl || `${PORTAL_BASE}/app/offers`}`;

    return this.sendAndLog({
      to,
      subject: `Official Offer of Employment: ${designation || jobTitle} [${offerCode}]`,
      html,
      text,
      templateType: 'OFFER_ISSUED',
      relatedEntityType: 'JobOffer',
      relatedEntityId: offerCode,
    });
  }

  static async sendOfferAccepted({ to, candidateName, jobTitle, offerCode }) {
    const bodyContent = `
      <p>Dear ${candidateName},</p>
      <p>Thank you for accepting the offer of employment for <strong>${jobTitle}</strong> (Offer Ref: <code>${offerCode}</code>).</p>
      <p>We are thrilled to welcome you to the Nexora Technologies team. Our HR onboarding team will contact you shortly with joining documentation.</p>
    `;
    const html = getEmailFrame({
      title: `Offer Accepted — ${offerCode}`,
      headline: 'Welcome to Nexora Technologies!',
      bodyContent,
    });
    const text = `Dear ${candidateName},\n\nThank you for accepting your offer for ${jobTitle} (${offerCode}). Welcome to Nexora Technologies!`;

    return this.sendAndLog({
      to,
      subject: `Offer Acceptance Confirmed: ${jobTitle} [${offerCode}]`,
      html,
      text,
      templateType: 'OFFER_ACCEPTED',
      relatedEntityType: 'JobOffer',
      relatedEntityId: offerCode,
    });
  }

  static async sendOfferDeclined({ to, candidateName, jobTitle, offerCode, reason }) {
    const bodyContent = `
      <p>Dear ${candidateName},</p>
      <p>We have received your decision to decline the employment offer for <strong>${jobTitle}</strong> (Offer Ref: <code>${offerCode}</code>).</p>
      ${reason ? `<p>Your stated reason: <em>"${reason}"</em></p>` : ''}
      <p>We wish you the very best in your professional endeavors.</p>
    `;
    const html = getEmailFrame({
      title: `Offer Declined — ${offerCode}`,
      headline: 'Offer Decision Recorded',
      bodyContent,
    });
    const text = `Dear ${candidateName},\n\nYour decline of the offer for ${jobTitle} (${offerCode}) has been recorded.`;

    return this.sendAndLog({
      to,
      subject: `Offer Decision Recorded: ${jobTitle} [${offerCode}]`,
      html,
      text,
      templateType: 'OFFER_DECLINED',
      relatedEntityType: 'JobOffer',
      relatedEntityId: offerCode,
    });
  }

  static async sendOfferIssuedEmail(args) {
    return this.sendOfferIssued({
      to: args.to || args.recipientEmail,
      candidateName: args.candidateName,
      jobTitle: args.jobTitle,
      designation: args.designation || args.jobTitle,
      offerCode: args.offerCode,
      salary: args.salary,
      joiningDate: args.joiningDate,
      expiryDate: args.expiryDate,
      portalUrl: args.portalUrl,
    });
  }

  static async sendOfferAcceptedEmail(args) {
    return this.sendOfferAccepted({
      to: args.to || args.recipientEmail,
      candidateName: args.candidateName,
      jobTitle: args.jobTitle,
      offerCode: args.offerCode,
    });
  }

  static async sendOfferDeclinedEmail(args) {
    return this.sendOfferDeclined({
      to: args.to || args.recipientEmail,
      candidateName: args.candidateName,
      jobTitle: args.jobTitle,
      offerCode: args.offerCode,
      reason: args.reason,
    });
  }
}
