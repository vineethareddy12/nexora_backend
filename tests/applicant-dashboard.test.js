import http from 'http';
import app from '../src/app.js';
import { prisma } from '../src/core/database/prisma.js';

const PORT = 4007;

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
    // 1. Register candidate user
    const ts = Date.now();
    const candidateEmail = `test_candidate_${ts}@nexora.com`;
    const regRes = await makeRequest('/api/v1/auth/register', {
      method: 'POST',
      body: {
        email: candidateEmail,
        password: 'Password123!',
        fullName: 'Jane Candidate',
        role: 'APPLICANT',
      },
    });

    const token = regRes.body.data.tokens.accessToken;
    const userId = regRes.body.data.user.id;
    console.log(`[PASS] Registered test candidate (${userId})`);

    // 2. GET /api/v1/me/dashboard for newly registered candidate
    const dashRes = await makeRequest('/api/v1/me/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (dashRes.status !== 200) {
      throw new Error(`Expected 200 from /me/dashboard, got ${dashRes.status}`);
    }

    const { applicant, summary, recentApplications } = dashRes.body.data;
    if (applicant.email !== candidateEmail) {
      throw new Error(`Expected email ${candidateEmail}, got ${applicant.email}`);
    }
    if (summary.totalApplications !== 0) {
      throw new Error(`Expected 0 applications, got ${summary.totalApplications}`);
    }
    if (!Array.isArray(recentApplications) || recentApplications.length !== 0) {
      throw new Error(`Expected empty recent applications, got ${recentApplications.length}`);
    }
    console.log(`[PASS] GET /api/v1/me/dashboard returned 200 with zero metrics for fresh candidate`);

    // 3. GET /api/v1/me/applications with pagination and filters
    const appsRes = await makeRequest('/api/v1/me/applications?page=1&limit=5&status=ALL', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (appsRes.status !== 200) {
      throw new Error(`Expected 200 from /me/applications, got ${appsRes.status}`);
    }
    if (!appsRes.body.data.applications || appsRes.body.data.applications.length !== 0) {
      throw new Error(`Expected 0 applications in list`);
    }
    if (appsRes.body.data.pagination.total !== 0 || appsRes.body.data.pagination.page !== 1) {
      throw new Error(`Pagination metadata mismatch`);
    }
    console.log(`[PASS] GET /api/v1/me/applications returned 200 with valid pagination schema`);

    // 4. Test every KPI card status filter endpoint
    const kpiStatuses = [
      'ALL',
      'SUBMITTED',
      'UNDER_REVIEW',
      'SHORTLISTED',
      'INTERVIEW_SCHEDULED',
      'OFFER_EXTENDED',
      'REJECTED',
      'WITHDRAWN',
    ];

    for (const status of kpiStatuses) {
      const kpiRes = await makeRequest(`/api/v1/me/applications?page=1&limit=10&status=${status}&sortBy=createdAt&sortOrder=desc`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (kpiRes.status !== 200) {
        throw new Error(`Expected 200 for KPI status ${status}, got ${kpiRes.status}: ${JSON.stringify(kpiRes.body)}`);
      }
      if (!Array.isArray(kpiRes.body.data.applications)) {
        throw new Error(`Expected applications array for KPI status ${status}`);
      }
      console.log(`[PASS] KPI card status "${status}" returned 200 OK with applications list`);
    }

    // 5. Verify unauthenticated call is rejected
    const unauthRes = await makeRequest('/api/v1/me/dashboard');
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${unauthRes.status}`);
    }
    console.log(`[PASS] Unauthenticated /api/v1/me/dashboard rejected with 401`);

    console.log('====================================================');
    console.log('   ALL APPLICANT DASHBOARD TESTS PASSED!            ');
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

