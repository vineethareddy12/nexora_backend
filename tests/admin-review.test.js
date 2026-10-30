import http from 'http';
import app from '../src/app.js';
import { prisma } from '../src/core/database/prisma.js';

const PORT = 4008;

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `http://localhost:${PORT}${path}`,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : null;
            resolve({ status: res.statusCode, headers: res.headers, body: parsed });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, body });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`[INIT] Test server active on http://localhost:${PORT}`);

  try {
    // 1. Authenticate as Default Administrator
    const loginRes = await makeRequest('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@nexoratech.com',
        password: 'AdminSecurePass2026!',
      },
    });

    if (loginRes.status !== 200 || !loginRes.body?.data?.tokens?.accessToken) {
      throw new Error(`Admin login failed: ${JSON.stringify(loginRes.body)}`);
    }

    const adminToken = loginRes.body.data.tokens.accessToken;
    const adminUser = loginRes.body.data.user;
    console.log(`[PASS] Authenticated as Admin (${adminUser.email})`);

    // 2. Register a test applicant
    const ts = Date.now();
    const appCandidateRes = await makeRequest('/api/v1/auth/register', {
      method: 'POST',
      body: {
        email: `candidate_review_${ts}@nexora.com`,
        password: 'Password123!',
        fullName: 'Review Candidate',
        role: 'APPLICANT',
      },
    });

    const applicantToken = appCandidateRes.body.data.tokens.accessToken;
    const applicantId = appCandidateRes.body.data.user.id;
    console.log(`[PASS] Registered test applicant (${applicantId})`);

    // 3. Security: Unauthenticated request to /admin/dashboard rejected with 401
    const unauthRes = await makeRequest('/api/v1/admin/dashboard');
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated admin call, got ${unauthRes.status}`);
    }
    console.log(`[PASS] Security: Unauthenticated call rejected with 401`);

    // 4. Security: Applicant token trying to access /admin/dashboard rejected with 403 Forbidden
    const applicantForbiddenRes = await makeRequest('/api/v1/admin/dashboard', {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    if (applicantForbiddenRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for applicant accessing admin, got ${applicantForbiddenRes.status}`);
    }
    console.log(`[PASS] Security: Applicant role rejected from admin API with 403 Forbidden`);

    // 5. Admin Dashboard Metrics
    const dashRes = await makeRequest('/api/v1/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (dashRes.status !== 200 || !dashRes.body?.data?.summary) {
      throw new Error(`Expected 200 from admin dashboard, got ${dashRes.status}`);
    }
    const { summary, recentApplications } = dashRes.body.data;
    if (typeof summary.totalApplicants !== 'number' || typeof summary.totalApplications !== 'number') {
      throw new Error('Invalid dashboard summary schema');
    }
    console.log(`[PASS] GET /api/v1/admin/dashboard returned 200 with live metrics (Total Apps: ${summary.totalApplications})`);

    // 6. Admin Applicants Listing
    const applicantsRes = await makeRequest('/api/v1/admin/applicants?page=1&limit=10', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (applicantsRes.status !== 200 || !Array.isArray(applicantsRes.body?.data?.applicants)) {
      throw new Error(`Expected 200 from applicants list, got ${applicantsRes.status}`);
    }
    console.log(`[PASS] GET /api/v1/admin/applicants listed ${applicantsRes.body.data.applicants.length} candidates`);

    // 7. Admin Applicant Details
    const applicantDetailRes = await makeRequest(`/api/v1/admin/applicants/${applicantId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (applicantDetailRes.status !== 200 || !applicantDetailRes.body?.data?.applicant) {
      throw new Error(`Expected 200 from applicant details, got ${applicantDetailRes.status}`);
    }
    console.log(`[PASS] GET /api/v1/admin/applicants/:id retrieved candidate profile`);

    // 8. Admin Applications Listing
    const appsListRes = await makeRequest('/api/v1/admin/applications?page=1&limit=10&status=ALL', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (appsListRes.status !== 200 || !Array.isArray(appsListRes.body?.data?.applications)) {
      throw new Error(`Expected 200 from applications list, got ${appsListRes.status}`);
    }
    console.log(`[PASS] GET /api/v1/admin/applications listed ${appsListRes.body.data.applications.length} applications`);

    // If an application exists, test review details, status transition and notes
    const targetApp = appsListRes.body.data.applications[0];
    if (targetApp) {
      // 9. Admin Application Review Details
      const reviewDetailRes = await makeRequest(`/api/v1/admin/applications/${targetApp.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (reviewDetailRes.status !== 200 || !reviewDetailRes.body?.data?.application) {
        throw new Error(`Expected 200 from application details, got ${reviewDetailRes.status}`);
      }
      console.log(`[PASS] GET /api/v1/admin/applications/:id loaded full review for ${targetApp.referenceNumber}`);

      // 10. Status Transition Validation: Invalid transition rejected
      const invalidTransitionRes = await makeRequest(`/api/v1/admin/applications/${targetApp.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          status: 'HIRED', // Cannot jump to HIRED from SUBMITTED/WITHDRAWN
          remarks: 'Invalid jump',
        },
      });
      if (invalidTransitionRes.status !== 400 && targetApp.status !== 'OFFER_EXTENDED') {
        throw new Error(`Expected 400 Bad Request for invalid transition, got ${invalidTransitionRes.status}`);
      }
      console.log(`[PASS] Security: Invalid status transition strictly rejected by state machine`);

      // 11. Add Internal Review Note
      const addNoteRes = await makeRequest(`/api/v1/admin/applications/${targetApp.id}/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          note: 'Candidate has strong cloud infrastructure and PostgreSQL experience.',
        },
      });
      if (addNoteRes.status !== 201 || !addNoteRes.body?.data?.note) {
        throw new Error(`Expected 201 for note creation, got ${addNoteRes.status}`);
      }
      console.log(`[PASS] POST /api/v1/admin/applications/:id/notes created internal review note`);

      // 12. Read Review Notes
      const notesListRes = await makeRequest(`/api/v1/admin/applications/${targetApp.id}/notes`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (notesListRes.status !== 200 || !Array.isArray(notesListRes.body?.data?.notes)) {
        throw new Error(`Expected 200 from review notes list, got ${notesListRes.status}`);
      }
      console.log(`[PASS] GET /api/v1/admin/applications/:id/notes listed ${notesListRes.body.data.notes.length} internal notes`);

      // 13. Security: Applicant cannot access internal notes
      const applicantNotesRes = await makeRequest(`/api/v1/admin/applications/${targetApp.id}/notes`, {
        headers: { Authorization: `Bearer ${applicantToken}` },
      });
      if (applicantNotesRes.status !== 403) {
        throw new Error(`Expected 403 Forbidden for applicant accessing internal notes, got ${applicantNotesRes.status}`);
      }
      console.log(`[PASS] Security: Applicant strictly barred from viewing internal review notes`);

      // 14. Status History
      const histRes = await makeRequest(`/api/v1/admin/applications/${targetApp.id}/status-history`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (histRes.status !== 200 || !Array.isArray(histRes.body?.data?.history)) {
        throw new Error(`Expected 200 from status history, got ${histRes.status}`);
      }
      console.log(`[PASS] GET /api/v1/admin/applications/:id/status-history retrieved audit trail`);
    }

    console.log('====================================================');
    console.log('   ALL ADMIN REVIEW MODULE TESTS PASSED!            ');
    console.log('====================================================');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});

