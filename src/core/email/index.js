import { getTransporter } from './transporter.js';
import { renderPasswordResetEmail } from './templates/passwordReset.template.js';
import { renderWelcomeApplicantEmail } from './templates/welcome.template.js';
import { env } from '../config/env.js';

export class EmailService {
  /**
   * Send Password Reset Link to user
   */
  static async sendPasswordReset({ to, userName, resetUrl, expiresInMinutes = 15 }) {
    try {
      const transporter = getTransporter();
      const { html, text } = renderPasswordResetEmail({
        userName,
        resetUrl,
        expiresInMinutes,
      });

      const fromAddress = env.MAIL_FROM || `Nexora Technologies <${env.SMTP_USER || 'no-reply@nexoratech.com'}>`;

      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject: 'Reset Your Nexora Technologies Password',
        text,
        html,
      });

      console.log(`[Email] Password reset dispatched to ${to} (MessageId: ${info.messageId || 'preview'})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Email Error] Failed to send password reset email to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send Welcome Email to newly registered applicant
   */
  static async sendWelcomeApplicant({ to, userName, phone, portalUrl }) {
    try {
      const transporter = getTransporter();
      const { html, text } = renderWelcomeApplicantEmail({
        userName,
        email: to,
        phone,
        portalUrl,
      });

      const fromAddress = env.MAIL_FROM || `Nexora Technologies <${env.SMTP_USER || 'no-reply@nexoratech.com'}>`;

      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject: 'Welcome to Nexora Technologies — Applicant Workspace Ready',
        text,
        html,
      });

      console.log(`[Email] Welcome email dispatched to ${to} (MessageId: ${info.messageId || 'preview'})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Email Error] Failed to send welcome email to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  }
}

