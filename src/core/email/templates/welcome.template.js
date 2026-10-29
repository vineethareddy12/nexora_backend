import { renderBaseEmailTemplate } from './base.template.js';

export function renderWelcomeApplicantEmail({ userName, email, phone, portalUrl }) {
  const contentHtml = `
    <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.5px;">
      Welcome to Nexora Technologies
    </h1>

    <p style="margin: 0 0 16px 0; color: #475569; font-size: 15px;">
      Hello ${userName || 'Applicant'},
    </p>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      Thank you for creating an account on the Nexora Technologies Recruitment & Engineering Portal. Your candidate profile has been registered and is ready to use.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a; font-weight: 700;">Registered Candidate Details</h3>
      <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 14px; color: #475569;">
        <tr>
          <td width="35%" style="font-weight: 600; color: #64748b;">Full Name:</td>
          <td style="color: #0f172a; font-weight: 600;">${userName}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; color: #64748b;">Registered Email:</td>
          <td>${email}</td>
        </tr>
        ${phone ? `
        <tr>
          <td style="font-weight: 600; color: #64748b;">Contact Mobile:</td>
          <td>${phone}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${portalUrl}" class="btn-primary" style="display: inline-block;">
        Access Candidate Workspace &rarr;
      </a>
    </div>

    <p style="margin: 0; font-size: 14px; color: #64748b;">
      You can now apply for open engineering roles, upload technical resumes, track application statuses, and manage interview schedules in real time.
    </p>
  `;

  const text = `Welcome to Nexora Technologies!\n\nHello ${userName},\nYour account has been registered with email ${email}${phone ? ` and mobile ${phone}` : ''}.\n\nAccess your candidate workspace at: ${portalUrl}\n\nNexora Technologies\nHitec City, Hyderabad, India`;

  const html = renderBaseEmailTemplate({
    title: 'Welcome to Nexora Technologies',
    preheader: 'Your candidate portal account has been successfully created.',
    contentHtml,
  });

  return { html, text };
}

