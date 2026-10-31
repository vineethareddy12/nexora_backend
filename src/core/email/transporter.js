import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporterInstance = null;

export function getTransporter() {
  if (transporterInstance) {
    return transporterInstance;
  }

  const isGmail = (env.SMTP_HOST && env.SMTP_HOST.includes('gmail')) ||
                  (env.SMTP_USER && env.SMTP_USER.includes('@gmail.com'));

  if (isGmail && env.SMTP_USER && env.SMTP_PASS) {
    // Specialized configuration for Gmail with App Password (uses standard TLS port 587 to prevent cloud timeouts)
    transporterInstance = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS.replace(/\s+/g, ''), // Strip spaces from Google App Password
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
    console.log(`[Email] Configured Gmail SMTP transporter (service: gmail) for: ${env.SMTP_USER}`);
  } else if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    // Standard SMTP transporter (SendGrid, Mailgun, Brevo, custom server)
    const port = env.SMTP_PORT || 587;
    const isSecure = port === 465;

    transporterInstance = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure: isSecure,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
    console.log(`[Email] Configured custom SMTP transporter (${env.SMTP_HOST}:${port})`);
  } else {
    // Console fallback / dry-run when SMTP is not yet configured
    transporterInstance = {
      isDryRun: true,
      async sendMail(mailOptions) {
        console.log('\n======================================================');
        console.log('[Email - DRY RUN / PREVIEW MODE]');
        console.log(`To:      ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`From:    ${mailOptions.from}`);
        if (mailOptions.text) {
          console.log('\n--- Plain Text Message ---');
          console.log(mailOptions.text);
        }
        console.log('======================================================\n');
        return { messageId: `dry-run-${Date.now()}` };
      },
    };
    console.log('[Email] No SMTP credentials configured. Running in preview/log mode.');
  }

  return transporterInstance;
}

