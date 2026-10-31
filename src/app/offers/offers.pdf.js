/**
 * Offer Letter HTML Generator for Preview & Print/PDF
 */
export function generateOfferLetterHtml(offer) {
  const applicantName = offer.applicant?.fullName || 'Applicant';
  const applicantEmail = offer.applicant?.email || '';
  const designation = offer.designation || offer.job?.title || 'Team Member';
  const department = offer.job?.department || 'Engineering';
  const location = offer.job?.location || 'Hyderabad, India';
  const employmentType = (offer.employmentType || 'FULL_TIME').replace('_', ' ');
  const salary = offer.salary ? `${offer.currency || 'INR'} ${Number(offer.salary).toLocaleString('en-IN')}` : 'As agreed';
  const joiningDate = offer.joiningDate ? new Date(offer.joiningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'To be confirmed';
  const expiryDate = offer.expiryDate ? new Date(offer.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '7 days from issuance';
  const offerCode = offer.offerCode || 'NX-OFFER-PENDING';
  const issueDate = offer.issuedAt ? new Date(offer.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Offer Letter - ${offerCode} - ${applicantName}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      line-height: 1.6;
      background: #f8fafc;
      margin: 0;
      padding: 24px;
    }
    .page-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 48px;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
    }
    @media print {
      body {
        background: transparent;
        padding: 0;
      }
      .page-container {
        box-shadow: none;
        border: none;
        padding: 0;
        max-width: 100%;
      }
      .no-print {
        display: none !important;
      }
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }
    .logo-icon {
      width: 44px;
      height: 44px;
      background: #2563eb;
      color: white;
      font-weight: 800;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
    }
    .company-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .company-subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .doc-meta {
      text-align: right;
      font-size: 13px;
      color: #475569;
    }
    .doc-code {
      font-weight: 700;
      color: #2563eb;
      font-size: 14px;
    }
    .recipient-info {
      margin-bottom: 24px;
      font-size: 14px;
      color: #334155;
    }
    .subject {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 24px 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    .content p {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #334155;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      font-size: 14px;
    }
    .details-table th, .details-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .details-table th {
      background-color: #f8fafc;
      font-weight: 600;
      color: #475569;
      width: 35%;
    }
    .details-table td {
      color: #0f172a;
      font-weight: 500;
    }
    .terms-box {
      background: #f1f5f9;
      border-left: 4px solid #2563eb;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin: 24px 0;
      font-size: 13px;
      color: #475569;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-ISSUED { background: #dbeafe; color: #1e40af; }
    .status-ACCEPTED { background: #dcfce7; color: #166534; }
    .status-DECLINED { background: #fee2e2; color: #991b1b; }
    .status-DRAFT { background: #fef3c7; color: #92400e; }
    .status-WITHDRAWN { background: #f1f5f9; color: #475569; }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }
    .sign-block {
      width: 45%;
    }
    .sign-line {
      height: 48px;
      border-bottom: 1px solid #94a3b8;
      margin-bottom: 8px;
    }
    .sign-name {
      font-weight: 600;
      font-size: 14px;
      color: #0f172a;
    }
    .sign-title {
      font-size: 12px;
      color: #64748b;
    }
    .print-bar {
      margin-bottom: 20px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid transparent;
    }
    .btn-primary {
      background: #2563eb;
      color: white;
    }
    .btn-secondary {
      background: white;
      color: #334155;
      border-color: #cbd5e1;
    }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <button class="btn btn-primary" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="page-container">
    <div class="header">
      <div class="logo-badge">
        <div class="logo-icon">N</div>
        <div>
          <h1 class="company-title">Nexora Technologies</h1>
          <p class="company-subtitle">Enterprise Engineering & Cloud Solutions</p>
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-code">${offerCode}</div>
        <div>Date: ${issueDate}</div>
        <div style="margin-top: 6px;">
          <span class="status-badge status-${offer.status}">${offer.status}</span>
        </div>
      </div>
    </div>

    <div class="recipient-info">
      <div><strong>To:</strong></div>
      <div style="font-size: 16px; font-weight: 600; color: #0f172a;">${applicantName}</div>
      <div>${applicantEmail}</div>
    </div>

    <div class="subject">
      Formal Offer of Employment: ${designation}
    </div>

    <div class="content">
      <p>Dear ${applicantName},</p>
      <p>
        On behalf of Nexora Technologies, we are pleased to offer you the position of <strong>${designation}</strong> in our <strong>${department}</strong> team. We were highly impressed with your qualifications, professional experience, and technical achievements during our interview process.
      </p>
      <p>
        This formal offer outlines the primary terms and conditions of your anticipated employment with Nexora Technologies:
      </p>

      <table class="details-table">
        <tbody>
          <tr>
            <th>Position / Title</th>
            <td>${designation}</td>
          </tr>
          <tr>
            <th>Department</th>
            <td>${department}</td>
          </tr>
          <tr>
            <th>Work Location</th>
            <td>${location}</td>
          </tr>
          <tr>
            <th>Employment Basis</th>
            <td>${employmentType}</td>
          </tr>
          <tr>
            <th>Compensation Package (CTC)</th>
            <td style="font-weight: 700; color: #0f172a;">${salary} per annum</td>
          </tr>
          <tr>
            <th>Anticipated Joining Date</th>
            <td>${joiningDate}</td>
          </tr>
          <tr>
            <th>Offer Validity Expiration</th>
            <td>${expiryDate}</td>
          </tr>
        </tbody>
      </table>

      <div class="terms-box">
        <strong>Terms and Conditions:</strong>
        <p style="margin: 6px 0 0 0;">
          ${offer.termsAndConditions || 'This employment offer is contingent upon successful reference validation, submission of standard academic/experience credentials, and execution of the Nexora Non-Disclosure and Confidentiality Agreement on or prior to your joining date.'}
        </p>
      </div>

      <p>
        To accept this offer, please submit your response via the Nexora Applicant Portal before <strong>${expiryDate}</strong>. If you require any clarification regarding this offer, please contact our talent acquisition department.
      </p>
      <p>
        We look forward to welcoming you to Nexora Technologies and partnering with you in driving high-performance technology solutions.
      </p>
    </div>

    <div class="signatures">
      <div class="sign-block">
        <div class="sign-line"></div>
        <div class="sign-name">Nexora Talent Acquisition</div>
        <div class="sign-title">Nexora Technologies Enterprise HR</div>
      </div>
      <div class="sign-block">
        <div class="sign-line"></div>
        <div class="sign-name">${applicantName}</div>
        <div class="sign-title">Candidate Signature & Date</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

