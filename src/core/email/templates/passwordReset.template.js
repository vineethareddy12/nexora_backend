import { renderBaseEmailTemplate } from './base.template.js';

export function renderPasswordResetEmail({ userName, resetUrl, expiresInMinutes = 15 }) {
  const contentHtml = `
    <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.5px;">
      Password Reset Request
    </h1>

    <p style="margin: 0 0 16px 0; color: #475569; font-size: 15px;">
      Hello ${userName || 'Valued User'},
    </p>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      We received a request to reset the password for your Nexora Technologies account. Click the secure button below to choose a new password:
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${resetUrl}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" stroke="f" fillcolor="#2563eb">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Reset Password</center>
      </v:roundrect>
      <![endif]-->
      <a href="${resetUrl}" class="btn-primary" style="display: inline-block;">
        Reset My Password &rarr;
      </a>
    </div>

    <div class="security-note">
      <strong>Security Notice:</strong> This link will expire in <strong>${expiresInMinutes} minutes</strong>. If you did not make this request, you can safely ignore this email; your existing password will remain unchanged.
    </div>

    <p style="margin: 24px 0 8px 0; font-size: 13px; color: #64748b;">
      Having trouble with the button? Copy and paste this link into your web browser:
    </p>
    <p style="margin: 0; font-size: 12px; color: #2563eb; word-break: break-all;">
      <a href="${resetUrl}" style="color: #2563eb; text-decoration: underline;">${resetUrl}</a>
    </p>
  `;

  const text = `Hello ${userName || 'User'},\n\nWe received a request to reset your password for Nexora Technologies.\n\nPlease visit the following link to choose a new password (valid for ${expiresInMinutes} minutes):\n${resetUrl}\n\nIf you did not request this, please ignore this email.\n\nNexora Technologies\nHitec City, Hyderabad, India`;

  const html = renderBaseEmailTemplate({
    title: 'Reset Your Nexora Password',
    preheader: 'Complete your password reset request for Nexora Technologies.',
    contentHtml,
  });

  return { html, text };
}

