/**
 * Base Responsive HTML Email Template for Nexora Technologies
 * Provides a clean, modern, light-theme layout consistent with corporate branding.
 */
export function renderBaseEmailTemplate({ title, preheader = '', contentHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #475569;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-spacing: 0;
      border-collapse: collapse;
    }
    td {
      padding: 0;
    }
    img {
      border: 0;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f8fafc;
      padding: 40px 0 60px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
    }
    .header {
      padding: 32px 40px 24px;
      background-color: #ffffff;
      border-bottom: 1px solid #f1f5f9;
      text-align: left;
    }
    .logo-badge {
      display: inline-block;
      width: 40px;
      height: 40px;
      line-height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%);
      color: #ffffff;
      text-align: center;
      font-weight: 800;
      font-size: 20px;
      vertical-align: middle;
      margin-right: 12px;
    }
    .brand-title {
      display: inline-block;
      vertical-align: middle;
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      margin-top: 2px;
    }
    .content {
      padding: 36px 40px 40px;
      color: #334155;
      font-size: 16px;
    }
    .btn-primary {
      display: inline-block;
      background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      padding: 14px 28px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      background-color: #f8fafc;
      padding: 28px 40px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
      text-align: left;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
    .security-note {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      color: #1e40af;
      margin: 20px 0;
    }
    @media only screen and (max-width: 620px) {
      .container {
        width: 100% !important;
        border-radius: 0 !important;
        border-left: none !important;
        border-right: none !important;
      }
      .header, .content, .footer {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }
    }
  </style>
</head>
<body>
  ${preheader ? `<span style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
  <div class="wrapper">
    <table class="container" width="100%" cellpadding="0" cellspacing="0" align="center">
      <!-- Header -->
      <tr>
        <td class="header">
          <div style="line-height: 1;">
            <div class="logo-badge">N</div>
            <div class="brand-title">Nexora<span style="color: #2563eb;">.</span></div>
            <div class="brand-sub">Global Technology Services</div>
          </div>
        </td>
      </tr>

      <!-- Body Content -->
      <tr>
        <td class="content">
          ${contentHtml}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td class="footer">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #0f172a;">Nexora Technologies</p>
          <p style="margin: 0 0 8px 0;">Corporate Headquarters: LVS Arcade, Jubilee Enclave, Madhapur, Hitec City, Hyderabad, Telangana 500081, India</p>
          <p style="margin: 0; color: #94a3b8;">ISO 9001:2015 Certified &bull; This is an automated transactional security communication.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

