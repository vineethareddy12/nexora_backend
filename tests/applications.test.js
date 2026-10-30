import app from '../src/app.js';
import { prisma } from '../src/core/database/prisma.js';

async function runApplicationsVerificationSuite() {
  console.log('====================================================');
  console.log('   Nexora Technologies — Applications Test Suite   ');
  console.log('====================================================');

  const port = 4006;
  const baseUrl = `http://localhost:${port}`;
  const server = app.listen(port);
  console.log(`[INIT] Test server active on ${baseUrl}`);

  try {
    const timestamp = Date.now();
    const emailA = `app.user.a.${timestamp}@example.com`;
    const emailB = `app.user.b.${timestamp}@example.com`;
    const emailIncomplete = `app.user.inc.${timestamp}@example.com`;
    const testPassword = 'Password123!';

    // Setup: Register Applicant A (Complete Profile with Phone)
    const regARes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Applicant Alice',
        email: emailA,
        password: testPassword,
        phone: '+91 98765 43210',
      }),
    });
    const regAJson = await regARes.json();
    const tokenA = regAJson.data.tokens.accessToken;
    const userAId = regAJson.data.user.id;
    console.log(`[PASS] Registered Applicant A (${userAId})`);

    // Setup: Register Applicant B (Complete Profile with Phone)
    const regBRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Applicant Bob',
        email: emailB,
        password: testPassword,
        phone: '+91 91122 33445',
      }),
    });
    const regBJson = await regBRes.json();
    const tokenB = regBJson.data.tokens.accessToken;
    const userBId = regBJson.data.user.id;
    console.log(`[PASS] Registered Applicant B (${userBId})`);

    // Setup: Register Applicant Incomplete (Missing Phone)
    const regIncRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Incomplete Candidate',
        email: emailIncomplete,
        password: testPassword,
      }),
    });
    const regIncJson = await regIncRes.json();
    const tokenInc = regIncJson.data.tokens.accessToken;
    // Explicitly nullify phone in profile
    await prisma.applicantProfile.update({
      where: { userId: regIncJson.data.user.id },
      data: { phone: null },
    });
    console.log(`[PASS] Registered Incomplete Candidate with null phone`);

    // Setup: Create Published Job 1
    const jobPublished = await prisma.job.create({
      data: {
        jobCode: `TEST-PUB-${timestamp}`,
        title: 'Senior Cloud Platform Engineer',
        department: 'Cloud Infrastructure',
        location: 'Hyderabad, India',
        employmentType: 'FULL_TIME',
        workMode: 'HYBRID',
        experienceRequired: '5+ years',
        description: 'Design and operate mission-critical cloud infrastructure.',
        responsibilities: ['Architect Kubernetes clusters', 'Automate CI/CD pipelines'],
        requiredQualifications: ["Bachelor's in Computer Science or related"],
        requiredSkills: ['AWS', 'Kubernetes', 'Terraform'],
        status: 'PUBLISHED',
        applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days ahead
      },
    });
    console.log(`[PASS] Created Published Job (${jobPublished.id})`);

    // Setup: Create Draft/Unpublished Job 2
    const jobDraft = await prisma.job.create({
      data: {
        jobCode: `TEST-DFT-${timestamp}`,
        title: 'Unpublished Internal Architect',
        department: 'Engineering',
        location: 'Remote',
        description: 'Internal draft role',
        experienceRequired: '3+ years',
        status: 'DRAFT',
      },
    });

    // Setup: Create Expired Job 3
    const jobExpired = await prisma.job.create({
      data: {
        jobCode: `TEST-EXP-${timestamp}`,
        title: 'Expired Application Job',
        department: 'Engineering',
        location: 'Remote',
        description: 'Role with expired deadline',
        experienceRequired: '2+ years',
        status: 'PUBLISHED',
        applicationDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      },
    });

    // Setup: Upload Documents for Applicant A (Resume + Certificate)
    const validPdfBuffer = Buffer.concat([
      Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Alice CV) >>\nendobj\ntrailer\n<< >>\n%%EOF'),
      Buffer.alloc(50, 0x20),
    ]);
    const validPngBuffer = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(30, 0),
    ]);

    // Upload Resume A
    const formResumeA = new FormData();
    formResumeA.append('file', new Blob([validPdfBuffer], { type: 'application/pdf' }), 'Alice_Resume.pdf');
    formResumeA.append('type', 'RESUME');
    const resumeARes = await fetch(`${baseUrl}/api/v1/me/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formResumeA,
    });
    const resumeAJson = await resumeARes.json();
    const resumeAId = resumeAJson.data.document.id;

    // Upload Certificate A
    const formCertA = new FormData();
    formCertA.append('file', new Blob([validPngBuffer], { type: 'image/png' }), 'Alice_Cert.png');
    formCertA.append('type', 'EDUCATIONAL_CERTIFICATE');
    const certARes = await fetch(`${baseUrl}/api/v1/me/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formCertA,
    });
    const certAJson = await certARes.json();
    const certAId = certAJson.data.document.id;

    // Upload Resume B (Belongs to Bob)
    const formResumeB = new FormData();
    formResumeB.append('file', new Blob([validPdfBuffer], { type: 'application/pdf' }), 'Bob_Resume.pdf');
    formResumeB.append('type', 'RESUME');
    const resumeBRes = await fetch(`${baseUrl}/api/v1/me/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: formResumeB,
    });
    const resumeBJson = await resumeBRes.json();
    const resumeBId = resumeBJson.data.document.id;

    // ── 1. Unauthenticated Submission Rejection (401) ───────────────────────────
    const unauthRes = await fetch(`${baseUrl}/api/v1/jobs/${jobPublished.id}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resumeId: resumeAId,
        privacyAcknowledged: true,
      }),
    });
    if (unauthRes.status === 401) {
      console.log('[PASS] Unauthenticated submission rejected with 401 Unauthorized');
    } else {
      throw new Error(`Unauth submission status: ${unauthRes.status}`);
    }

    // ── 2. Reject Unpublished Job Application (400) ─────────────────────────────
    const draftRes = await fetch(`${baseUrl}/api/v1/jobs/${jobDraft.id}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        resumeId: resumeAId,
        privacyAcknowledged: true,
      }),
    });
    const draftJson = await draftRes.json();
    if (draftRes.status === 400 && draftJson.error?.message?.includes('not accepting applications')) {
      console.log('[PASS] Unpublished job application rejected with 400 Bad Request');
    } else {
      throw new Error(`Draft job apply check failed: ${JSON.stringify(draftJson)}`);
    }

    // ── 3. Reject Expired Deadline Job Application (400) ────────────────────────
    const expiredRes = await fetch(`${baseUrl}/api/v1/jobs/${jobExpired.id}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        resumeId: resumeAId,
        privacyAcknowledged: true,
      }),
    });
    const expiredJson = await expiredRes.json();
    if (expiredRes.status === 400 && expiredJson.error?.message?.includes('deadline')) {
      console.log('[PASS] Expired deadline application rejected with 400 Bad Request');
    } else {
      throw new Error(`Expired job apply check failed: ${JSON.stringify(expiredJson)}`);
    }

    // ── 4. Reject Incomplete Profile Submission (Missing Phone) ─────────────────
    const incProfileRes = await fetch(`${baseUrl}/api/v1/jobs/${jobPublished.id}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInc}`,
      },
      body: JSON.stringify({
        resumeId: resumeAId,
        privacyAcknowledged: true,
      }),
    });
    const incProfileJson = await incProfileRes.json();
    if (incProfileRes.status === 400 && incProfileJson.error?.message?.includes('phone number is required')) {
      console.log('[PASS] Incomplete profile (missing phone) rejected with 400 Bad Request');
    } else {
      throw new Error(`Incomplete profile check failed: ${JSON.stringify(incProfileJson)}`);
    }

    // ── 5. Reject Resume Owned by Another Applicant (IDOR Protection) ───────────
    const idorResumeRes = await fetch(`${baseUrl}/api/v1/jobs/${jobPublished.id}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        resumeId: resumeBId, // Bob's resume passed by Alice!
        privacyAcknowledged: true,
      }),
    });
    const idorResumeJson = await idorResumeRes.json();
    if (idorResumeRes.status === 400 && idorResumeJson.error?.message?.includes('Invalid or inaccessible resume')) {
      console.log('[PASS] IDOR Protection: Using another applicant resume rejected with 400 Bad Request');
    } else {
      throw new Error(`IDOR resume check failed: ${JSON.stringify(idorResumeJson)}`);
    }

    // ── 6. Reject Missing Privacy Notice Acknowledgement (422 / 400) ────────────
    const noPrivacyRes = await fetch(`${baseUrl}/api/v1/jobs/${jobPublished.id}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        resumeId: resumeAId,
        privacyAcknowledged: false, // not acknowledged!
      }),
    });
    if (noPrivacyRes.status === 422 || noPrivacyRes.status === 400) {
      console.log('[PASS] Missing privacy acknowledgement rejected with validation error');
    } else {
      throw new Error(`Privacy acknowledgement check failed: status ${noPrivacyRes.status}`);
    }

    // ── 7. Successful 8-Step Application Submission ─────────────────────────────
    const submitRes = await fetch(`${baseUrl}/api/v1/jobs/${jobPublished.id}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        resumeId: resumeAId,
        certificateIds: [certAId],
        coverNote: 'Excited about scaling Nexora cloud infrastructure!',
        noticePeriod: 'Immediate to 30 days',
        privacyAcknowledged: true,
        privacyNoticeVersion: '1.2',
      }),
    });
    const submitJson = await submitRes.json();

    if (submitRes.status === 201 && submitJson.success && submitJson.data.application.referenceNumber) {
      const app = submitJson.data.application;
      console.log(`[PASS] Application submitted successfully (201 Created)!`);
      console.log(`       Reference Number: ${app.referenceNumber}`);
      console.log(`       Status: ${app.status} | Documents Attached: ${app.documentsAttachedCount}`);
      // Validate Reference Number pattern NX-APP-YYYY-XXXXXX
      const refRegex = /^NX-APP-\d{4}-[A-Z0-9]{6}$/;
      if (!refRegex.test(app.referenceNumber)) {
        throw new Error(`Reference number format does not match NX-APP-YYYY-XXXXXX: ${app.referenceNumber}`);
      }
    } else {
      throw new Error(`Submission failed: ${JSON.stringify(submitJson)}`);
    }

    const applicationAId = submitJson.data.application.id;

    // ── 8. Duplicate Application Prevention (409 Conflict) ──────────────────────
    const duplicateRes = await fetch(`${baseUrl}/api/v1/jobs/${jobPublished.id}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        resumeId: resumeAId,
        privacyAcknowledged: true,
      }),
    });
    const duplicateJson = await duplicateRes.json();
    if (duplicateRes.status === 409 && duplicateJson.error?.code === 'CONFLICT') {
      console.log('[PASS] Duplicate application rejected with 409 Conflict:', duplicateJson.error.message);
    } else {
      throw new Error(`Duplicate application was not rejected with 409: ${JSON.stringify(duplicateJson)}`);
    }

    // ── 9. Concurrent Duplicate Submissions Safeguard ───────────────────────────
    // Applicant B fires two submissions simultaneously to test race condition handling
    const [concurrentRes1, concurrentRes2] = await Promise.all([
      fetch(`${baseUrl}/api/v1/jobs/${jobPublished.id}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
        body: JSON.stringify({ resumeId: resumeBId, privacyAcknowledged: true }),
      }),
      fetch(`${baseUrl}/api/v1/jobs/${jobPublished.id}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
        body: JSON.stringify({ resumeId: resumeBId, privacyAcknowledged: true }),
      }),
    ]);

    const statuses = [concurrentRes1.status, concurrentRes2.status].sort();
    if (statuses[0] === 201 && statuses[1] === 409) {
      console.log('[PASS] Concurrent duplicate submissions safeguard: exactly 1 succeeded (201) and 1 failed with 409 Conflict');
    } else {
      throw new Error(`Concurrent test unexpected statuses: ${statuses.join(', ')}`);
    }

    // ── 10. List Authenticated Applicant Applications (Isolation Check) ─────────
    const listRes = await fetch(`${baseUrl}/api/v1/me/applications`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listJson = await listRes.json();
    if (listRes.status === 200 && listJson.data.applications.length === 1) {
      console.log('[PASS] GET /api/v1/me/applications listed exactly 1 application for Applicant A');
    } else {
      throw new Error(`List applications failed: ${JSON.stringify(listJson)}`);
    }

    // ── 11. IDOR Check: Applicant B attempting to view Applicant A Application ──
    const idorAppRes = await fetch(`${baseUrl}/api/v1/me/applications/${applicationAId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (idorAppRes.status === 404) {
      console.log('[PASS] IDOR Protection: GET application of another user returned 404 Not Found');
    } else {
      throw new Error(`IDOR application view failed: status ${idorAppRes.status}`);
    }

    // ── 12. View Application Details & Document Snapshots ───────────────────────
    const detailsRes = await fetch(`${baseUrl}/api/v1/me/applications/${applicationAId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const detailsJson = await detailsRes.json();
    if (detailsRes.status === 200 && detailsJson.data.application.documents.length === 2) {
      console.log('[PASS] Application details loaded with 2 frozen document snapshots (Resume + Certificate)');
    } else {
      throw new Error(`Application details verification failed: ${JSON.stringify(detailsJson)}`);
    }

    // ── 13. Document Preservation: Replacing Profile Document preserves Application Snapshot ──
    // In Phase 1, replace resumeAId with a new file
    const updatedPdfBuffer = Buffer.concat([
      Buffer.from('%PDF-1.4\n% Replaced Profile Resume\n1 0 obj\n<< >>\nendobj\ntrailer\n<< >>\n%%EOF'),
      Buffer.alloc(40, 0x30),
    ]);
    const formReplace = new FormData();
    formReplace.append('file', new Blob([updatedPdfBuffer], { type: 'application/pdf' }), 'Alice_Resume_V2.pdf');

    const replaceRes = await fetch(`${baseUrl}/api/v1/me/documents/${resumeAId}/replace`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formReplace,
    });
    const replaceJson = await replaceRes.json();
    if (replaceRes.status === 200 && replaceJson.data.document.preservedHistoricalVersion) {
      console.log('[PASS] Document replacement safely preserved historical version because applicationCount > 0');
    }

    // Check application document snapshots still refer to original Alice_Resume.pdf
    const checkSnapshots = await prisma.applicationDocumentSnapshot.findMany({
      where: { applicationId: applicationAId },
    });
    const resumeSnap = checkSnapshots.find((s) => s.isResume);
    if (resumeSnap && resumeSnap.originalFilename === 'Alice_Resume.pdf') {
      console.log('[PASS] Application snapshot permanently retained original submitted file ("Alice_Resume.pdf")');
    } else {
      throw new Error(`Application snapshot was corrupted: ${JSON.stringify(resumeSnap)}`);
    }

    // ── 14. Withdraw Application ────────────────────────────────────────────────
    const withdrawRes = await fetch(`${baseUrl}/api/v1/me/applications/${applicationAId}/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ reason: 'Accepted senior lead offer elsewhere' }),
    });
    const withdrawJson = await withdrawRes.json();
    if (withdrawRes.status === 200 && withdrawJson.data.status === 'WITHDRAWN') {
      console.log('[PASS] Application successfully withdrawn with status WITHDRAWN');
    } else {
      throw new Error(`Withdrawal failed: ${JSON.stringify(withdrawJson)}`);
    }

    // ── 15. Verify Existing System Modules Remain Operational ───────────────────
    const checkHealth = await fetch(`${baseUrl}/health`);
    if (checkHealth.status === 200) {
      console.log('[PASS] Existing /health route operating normally');
    }

    const checkJobs = await fetch(`${baseUrl}/api/v1/jobs`);
    if (checkJobs.status === 200) {
      console.log('[PASS] Existing /api/v1/jobs route operating normally');
    }

    console.log('====================================================');
    console.log('   ALL 15 APPLICATION SUITE CASES PASSED!          ');
    console.log('====================================================');
  } finally {
    server.close();
  }
}

runApplicationsVerificationSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test suite failed with error:', err);
    process.exit(1);
  });

