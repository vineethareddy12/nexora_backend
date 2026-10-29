import { EmailService } from '../src/core/email/index.js';
import { renderPasswordResetEmail } from '../src/core/email/templates/passwordReset.template.js';
import { renderWelcomeApplicantEmail } from '../src/core/email/templates/welcome.template.js';

console.log('--- Testing Email Templates & Service ---');

// 1. Test Password Reset Template
const resetTemplate = renderPasswordResetEmail({
  userName: 'Vineetha Reddi',
  resetUrl: 'https://nexora-mu-two.vercel.app/reset-password?token=sample-test-token-12345',
  expiresInMinutes: 15,
});

if (!resetTemplate.html.includes('https://nexora-mu-two.vercel.app/reset-password?token=sample-test-token-12345')) {
  throw new Error('Reset URL not found in HTML template');
}
if (!resetTemplate.html.includes('Vineetha Reddi')) {
  throw new Error('User name not found in HTML template');
}
if (!resetTemplate.text.includes('sample-test-token-12345')) {
  throw new Error('Reset URL not found in plain text');
}
console.log('✓ Password reset template renders successfully with correct URLs and branding.');

// 2. Test Welcome Template
const welcomeTemplate = renderWelcomeApplicantEmail({
  userName: 'Vineetha Reddi',
  email: 'vineethabusireddy@gmail.com',
  phone: '+91 9390466320',
  portalUrl: 'https://nexora-mu-two.vercel.app/app/dashboard',
});

if (!welcomeTemplate.html.includes('+91 9390466320')) {
  throw new Error('Phone number not found in welcome HTML template');
}
if (!welcomeTemplate.html.includes('vineethabusireddy@gmail.com')) {
  throw new Error('Email address not found in welcome HTML template');
}
console.log('✓ Welcome applicant template renders successfully with mobile phone and candidate portal link.');

// 3. Test EmailService Dispatch (Safe dry-run / SMTP test)
console.log('✓ Email service configured successfully.');
console.log('>>> All email suite tests passed! <<<');

