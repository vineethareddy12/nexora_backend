import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporterInstance = null;

export function getTransporter() {
  if (transporterInstance) {
    return transporterInstance;
  }

  // 1. Resend HTTP API (Recommended for Render, Vercel, Cloud — uses HTTPS port 443, never blocked)
  if (env.RESEND_API_KEY) {
    transporterInstance = {
      async sendMail({ from, to, subject, html, text }) {
        const fromAddress = from || env.MAIL_FROM || 'Nexora Technologies <onboarding@resend.dev>';
        const recipients = Array.isArray(to) ? to : [to];

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: recipients,
            subject,
            html,
            text,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || data.error?.message || 'Failed to send email via Resend API');
        }
        return { messageId: data.id || `resend-${Date.now()}` };
      },
    };
    console.log('[Email] Configured Resend HTTP API transporter (HTTPS port 443 — firewall immune)');
    return transporterInstance;
  }

  // 2. Brevo HTTP API (Uses HTTPS port 443 — free 300 emails/day, firewall immune)
  if (env.BREVO_API_KEY) {
    transporterInstance = {
      async sendMail({ from, to, subject, html, text }) {
        const senderEmail = env.SMTP_USER || 'vineethabusireddy52@gmail.com';
        const senderName = 'Nexora Technologies';
        const recipients = (Array.isArray(to) ? to : [to]).map((addr) => ({ email: addr }));

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': env.BREVO_API_KEY.trim(),
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            to: recipients,
            subject,
            htmlContent: html,
            textContent: text,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to send email via Brevo API');
        }
        return { messageId: data.messageId || `brevo-${Date.now()}` };
      },
    };
    console.log('[Email] Configured Brevo HTTP API transporter (HTTPS port 443 — firewall immune)');
    return transporterInstance;
  }

  // 3. SMTP Transporters (Gmail or Custom)
  const isGmail = (env.SMTP_HOST && env.SMTP_HOST.includes('gmail')) ||
                  (env.SMTP_USER && env.SMTP_USER.includes('@gmail.com'));

  if (isGmail && env.SMTP_USER && env.SMTP_PASS) {
    // Explicit Gmail SMTP configuration with IPv4 enforcement (prevents Linux IPv6 DNS hang on cloud)
    const port = env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : 587;
    const isSecure = port === 465;

    transporterInstance = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port,
      secure: isSecure,
      auth: {
        user: env.SMTP_USER.trim(),
        pass: env.SMTP_PASS.replace(/\s+/g, ''), // Strip spaces from Google App Password
      },
      tls: {
        rejectUnauthorized: false,
      },
      family: 4, // CRITICAL: Force IPv4 on cloud hosts like Render to avoid IPv6 timeouts
      connectionTimeout: 25000,
      greetingTimeout: 20000,
      socketTimeout: 30000,
    });
    console.log(`[Email] Configured Nodemailer Gmail SMTP (smtp.gmail.com:${port}, secure: ${isSecure}, IPv4 forced) for: ${env.SMTP_USER}`);
  } else if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    // Standard SMTP transporter (Brevo on 2525, SendGrid, Mailgun)
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
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
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

