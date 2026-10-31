import http from 'http';
import app from '../src/app.js';
import { prisma } from '../src/core/database/prisma.js';

const PORT = 4015;

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
  console.log(`[TEST-SUITE] Full Recruitment Flow test server active on http://localhost:${PORT}`);

  try {
    const timestamp = Date.now();
    const candidateEmail = `recruitment.candidate.${timestamp}@example.com`;
    const candidatePassword = 'CandidateSecurePass2026!';

    // =========================================================================
    // STEP 1: AUTHENTICATION (ADMIN & APPLICANT)
    // =========================================================================
    console.log('\n--- STEP 1: AUTHENTICATION ---');
    const adminLoginRes = await makeRequest('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@nexoratech.com',
        password: 'AdminSecurePass2026!',
      },
    });

    if (adminLoginRes.status !== 200 || !adminLoginRes.body?.data?.tokens?.accessToken) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes.body)}`);
    }
    const adminToken = adminLoginRes.body.data.tokens.accessToken;
    console.log('✓ Admin authenticated successfully');

    // Register Candidate
    const candidateRegRes = await makeRequest('/api/v1/auth/register', {
      method: 'POST',
      body: {
        fullName: 'E2E Test Candidate',
        email: candidateEmail,
        password: candidatePassword,
      },
    });

    if (candidateRegRes.status !== 201) {
      throw new Error(`Candidate registration failed: ${JSON.stringify(candidateRegRes.body)}`);
    }
    const candidateToken = candidateRegRes.body.data.tokens.accessToken;
    const candidateUser = candidateRegRes.body.data.user;
    console.log(`✓ Candidate registered & authenticated (${candidateEmail})`);

    // Ensure candidate profile has required phone number
    await prisma.applicantProfile.upsert({
      where: { userId: candidateUser.id },
      create: {
        userId: candidateUser.id,
        phone: '+91 98765 43210',
        currentLocation: 'Hyderabad, India',
        totalExperienceYears: 7,
      },
      update: {
        phone: '+91 98765 43210',
        currentLocation: 'Hyderabad, India',
        totalExperienceYears: 7,
      },
    });

    // =========================================================================
    // STEP 2: JOB APPLICATION SUBMISSION
    // =========================================================================
    console.log('\n--- STEP 2: APPLICATION SUBMISSION ---');
    // Find active job
    let job = await prisma.job.findFirst({ where: { status: 'PUBLISHED' } });
    if (!job) {
      job = await prisma.job.create({
        data: {
          jobCode: `NX-TEST-${timestamp.toString().slice(-4)}`,
          title: 'Senior Cloud Platform Architect',
          department: 'Cloud Infrastructure',
          location: 'Hyderabad, India',
          employmentType: 'FULL_TIME',
          experienceLevel: 'LEAD',
          description: 'Responsible for core cloud systems and microservices.',
          requirements: ['Node.js', 'PostgreSQL', 'Docker'],
          status: 'PUBLISHED',
        },
      });
    }

    // Create candidate resume document in database for realistic submission
    const resumeDoc = await prisma.applicantDocument.create({
      data: {
        userId: candidateUser.id,
        type: 'RESUME',
        originalFilename: 'resume.pdf',
        fileSizeBytes: 120400,
        mimeType: 'application/pdf',
        storageKey: `resumes/${candidateUser.id}/test_resume_${timestamp}.pdf`,
      },
    });

    const applyRes = await makeRequest(`/api/v1/jobs/${job.id}/applications`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        resumeId: resumeDoc.id,
        coverNote: 'I am excited to apply for this lead role.',
        privacyAcknowledged: true,
        privacyNoticeVersion: '1.2',
      },
    });

    const application = applyRes.body.data?.application || applyRes.body.data;
    if (applyRes.status !== 201 || !application?.id) {
      throw new Error(`Application creation failed: ${JSON.stringify(applyRes.body)}`);
    }
    const applicationId = application.id;
    const refNum = application.referenceNumber;
    console.log(`✓ Application submitted successfully (Ref: ${refNum})`);

    // =========================================================================
    // STEP 3: ADMIN STAGE PROGRESSION -> SHORTLISTED
    // =========================================================================
    console.log('\n--- STEP 3: STAGE PROGRESSION ---');
    const shortlistRes = await makeRequest(`/api/v1/admin/applications/${applicationId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        status: 'SHORTLISTED',
        remarks: 'Candidate profile and credentials strongly aligned with requirements.',
      },
    });

    if (shortlistRes.status !== 200) {
      throw new Error(`Shortlisting failed: ${JSON.stringify(shortlistRes.body)}`);
    }
    console.log(`✓ Application moved to SHORTLISTED`);

    // =========================================================================
    // STEP 4: MODULE 2 - INTERVIEW MANAGEMENT
    // =========================================================================
    console.log('\n--- STEP 4: MODULE 2 - INTERVIEWS ---');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const interviewDateStr = tomorrow.toISOString().split('T')[0];

    // 4.1 Schedule Interview
    const scheduleRes = await makeRequest('/api/v1/admin/interviews', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        applicationId,
        round: 'TECHNICAL',
        mode: 'ONLINE',
        interviewDate: interviewDateStr,
        startTime: '11:00',
        endTime: '12:00',
        meetingLinkOrLocation: 'https://meet.google.com/abc-defg-hij',
        interviewerName: 'Lead Architect Arun',
        instructions: 'Have code editor ready for architecture discussion.',
      },
    });

    const interview = scheduleRes.body?.data?.interview || scheduleRes.body?.data;
    if (scheduleRes.status !== 201 || !interview?.id) {
      throw new Error(`Interview scheduling failed: ${JSON.stringify(scheduleRes.body)}`);
    }
    const interviewId = interview.id;
    console.log(`✓ Interview scheduled (ID: ${interviewId}, Round: TECHNICAL)`);

    // 4.2 Verify candidate sees interview in /me/interviews
    const candidateInterviewsRes = await makeRequest('/api/v1/me/interviews', {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    const candidateInterviews = candidateInterviewsRes.body?.data?.interviews || candidateInterviewsRes.body?.data || [];
    if (candidateInterviewsRes.status !== 200 || candidateInterviews.length === 0) {
      throw new Error(`Candidate cannot see scheduled interview: ${JSON.stringify(candidateInterviewsRes.body)}`);
    }
    console.log(`✓ Candidate fetched interview list successfully (${candidateInterviews.length} interviews)`);

    // 4.3 Reschedule Interview
    const rescheduleRes = await makeRequest(`/api/v1/admin/interviews/${interviewId}/reschedule`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        interviewDate: interviewDateStr,
        startTime: '14:30',
        endTime: '15:30',
        reason: 'Interviewer scheduling conflict with client release.',
      },
    });
    if (rescheduleRes.status !== 200) {
      throw new Error(`Interview reschedule failed: ${JSON.stringify(rescheduleRes.body)}`);
    }
    console.log(`✓ Interview rescheduled successfully to 14:30`);

    // 4.4 Submit Interview Feedback & Recommendation
    const feedbackRes = await makeRequest(`/api/v1/admin/interviews/${interviewId}/feedback`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        technicalRating: 5,
        communicationRating: 5,
        problemSolvingRating: 5,
        overallFeedback: 'Unanimous hire recommendation. Exceptional domain depth and architecture acumen.',
        recommendation: 'STRONG_HIRE',
        strengths: 'Deep domain expertise, distributed systems architecture, excellent communication.',
        areasForImprovement: 'Minor: can deepen experience with Kubernetes custom operators.',
      },
    });
    if (feedbackRes.status !== 201) {
      throw new Error(`Feedback submission failed: ${JSON.stringify(feedbackRes.body)}`);
    }
    console.log(`✓ Interview feedback and HIRE recommendation recorded`);

    // =========================================================================
    // STEP 5: MODULE 3 - OFFER LETTER MANAGEMENT
    // =========================================================================
    console.log('\n--- STEP 5: MODULE 3 - OFFERS ---');
    const joiningDate = new Date();
    joiningDate.setDate(joiningDate.getDate() + 14);

    // 5.1 Admin Creates Draft Offer
    const createOfferRes = await makeRequest('/api/v1/admin/offers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        applicationId,
        designation: 'Senior Cloud Platform Architect',
        employmentType: 'FULL_TIME',
        salary: 2400000,
        currency: 'INR',
        joiningDate: joiningDate.toISOString().split('T')[0],
        termsAndConditions: 'Standard 3-month probation period applies.',
      },
    });

    if (createOfferRes.status !== 201 || !createOfferRes.body?.data?.id) {
      throw new Error(`Offer creation failed: ${JSON.stringify(createOfferRes.body)}`);
    }
    const offerId = createOfferRes.body.data.id;
    const offerCode = createOfferRes.body.data.offerCode;
    console.log(`✓ Draft offer created (${offerCode})`);

    // 5.2 Admin Issues Offer to Candidate
    const issueOfferRes = await makeRequest(`/api/v1/admin/offers/${offerId}/issue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (issueOfferRes.status !== 200) {
      throw new Error(`Offer issuance failed: ${JSON.stringify(issueOfferRes.body)}`);
    }
    console.log(`✓ Offer officially issued to candidate`);

    // 5.3 Candidate views offer in /me/offers
    const candidateOffersRes = await makeRequest('/api/v1/me/offers', {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    const candidateOffers = candidateOffersRes.body?.data?.offers || candidateOffersRes.body?.data || [];
    if (candidateOffersRes.status !== 200 || candidateOffers.length === 0) {
      throw new Error(`Candidate cannot view issued offer: ${JSON.stringify(candidateOffersRes.body)}`);
    }
    console.log(`✓ Candidate retrieved issued offer list (${candidateOffers.length} offers)`);

    // 5.4 Candidate previews Offer Letter HTML
    const previewOfferRes = await makeRequest(`/api/v1/me/offers/${offerId}/preview`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    if (previewOfferRes.status !== 200 || !previewOfferRes.body.includes(offerCode)) {
      throw new Error(`Offer letter HTML preview generation failed`);
    }
    console.log(`✓ Offer Letter branded HTML document rendered successfully`);

    // 5.5 Candidate Accepts Offer
    const acceptOfferRes = await makeRequest(`/api/v1/me/offers/${offerId}/respond`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        decision: 'ACCEPTED',
        notes: 'Thrilled to accept the offer and join Nexora Technologies!',
      },
    });
    if (acceptOfferRes.status !== 200) {
      throw new Error(`Offer acceptance failed: ${JSON.stringify(acceptOfferRes.body)}`);
    }
    console.log(`✓ Candidate accepted offer successfully`);

    // =========================================================================
    // STEP 6: MODULE 4 - DASHBOARD METRICS & REAL AGGREGATIONS
    // =========================================================================
    console.log('\n--- STEP 6: MODULE 4 - DASHBOARD ANALYTICS ---');
    const dashboardRes = await makeRequest('/api/v1/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (dashboardRes.status !== 200 || !dashboardRes.body?.data?.summary) {
      throw new Error(`Admin dashboard query failed: ${JSON.stringify(dashboardRes.body)}`);
    }
    const summary = dashboardRes.body.data.summary;
    console.log(`✓ Live Admin Dashboard aggregations:`, {
      totalApplications: summary.totalApplications,
      totalApplicants: summary.totalApplicants,
      totalJobs: summary.totalJobs,
      offersIssued: summary.offersIssued,
      offersAccepted: summary.offersAccepted,
      totalInterviews: summary.totalInterviews,
    });

    if (summary.offersAccepted < 1) {
      throw new Error(`Expected at least 1 accepted offer in dashboard aggregations`);
    }

    // =========================================================================
    // STEP 7: MODULE 5 - NOTIFICATIONS & EMAIL LOGS
    // =========================================================================
    console.log('\n--- STEP 7: MODULE 5 - NOTIFICATIONS & EMAILS ---');
    // Check candidate notifications
    const notifsRes = await makeRequest('/api/v1/me/notifications', {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    if (notifsRes.status !== 200 || !notifsRes.body?.data?.notifications) {
      throw new Error(`Candidate notifications retrieval failed: ${JSON.stringify(notifsRes.body)}`);
    }
    const notifs = notifsRes.body.data.notifications;
    console.log(`✓ Candidate received ${notifs.length} in-app notifications`);

    // Mark single notification read
    if (notifs.length > 0) {
      const markRes = await makeRequest(`/api/v1/me/notifications/${notifs[0].id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${candidateToken}` },
      });
      if (markRes.status !== 200) {
        throw new Error(`Mark notification read failed: ${JSON.stringify(markRes.body)}`);
      }
      console.log(`✓ Marked notification as read`);
    }

    // Check email audit logs
    const emailLogsRes = await makeRequest('/api/v1/admin/notifications/email-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (emailLogsRes.status !== 200 || !emailLogsRes.body?.data) {
      throw new Error(`Admin email logs retrieval failed: ${JSON.stringify(emailLogsRes.body)}`);
    }
    console.log(`✓ Admin email logs recorded ${emailLogsRes.body.data.length} dispatched emails`);

    // =========================================================================
    // STEP 8: MODULE 6 - AUDIT LOGS
    // =========================================================================
    console.log('\n--- STEP 8: MODULE 6 - AUDIT LOGS ---');
    const auditRes = await makeRequest('/api/v1/admin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (auditRes.status !== 200 || !auditRes.body?.data) {
      throw new Error(`Audit logs retrieval failed: ${JSON.stringify(auditRes.body)}`);
    }
    console.log(`✓ System recorded ${auditRes.body.data.length} immutable audit logs`);

    console.log('\n======================================================');
    console.log('🎉 ALL RECRUITMENT MODULES (2 TO 6) VERIFIED 100% PASS');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
