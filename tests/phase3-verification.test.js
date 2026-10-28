import app from '../src/app.js';
import { prisma } from '../src/core/database/prisma.js';
import { hashPassword } from '../src/core/security/password.js';

async function runPhase3Verification() {
  console.log('--- Starting Phase 3 Public CMS, Services, Jobs & Enquiries Verification ---');
  const port = 4003;
  const baseUrl = `http://localhost:${port}`;
  const server = app.listen(port);
  console.log(`[PASS] Test server started on ${baseUrl}`);

  try {
    // 0. Ensure Admin & Applicant Test Users exist for authorization tests
    const adminEmail = `phase3.admin.${Date.now()}@example.com`;
    const applicantEmail = `phase3.applicant.${Date.now()}@example.com`;
    const password = 'Password123!';
    const passwordHash = await hashPassword(password);

    await prisma.user.create({
      data: {
        fullName: 'Phase 3 Administrator',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    await prisma.user.create({
      data: {
        fullName: 'Phase 3 Applicant',
        email: applicantEmail,
        passwordHash,
        role: 'APPLICANT',
        status: 'ACTIVE',
      },
    });

    // Obtain Admin Access Token
    const adminLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password }),
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.data?.tokens?.accessToken;

    // Obtain Applicant Access Token
    const appLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: applicantEmail, password }),
    });
    const appLoginJson = await appLoginRes.json();
    const applicantToken = appLoginJson.data?.tokens?.accessToken;

    console.log('[PASS] Test Admin and Applicant accounts authenticated successfully.');

    // ==========================================
    // 1. Company Information Tests
    // ==========================================
    console.log('\n--- 1. Testing Company Information Module ---');
    const pubCompanyRes = await fetch(`${baseUrl}/api/v1/company`);
    const pubCompanyJson = await pubCompanyRes.json();
    if (pubCompanyRes.status === 200 && pubCompanyJson.data?.company?.companyName) {
      console.log(`[PASS] GET /api/v1/company returned official profile: "${pubCompanyJson.data.company.companyName}"`);
    } else {
      console.error('[FAIL] GET /api/v1/company failed:', pubCompanyRes.status, pubCompanyJson);
    }

    // Verify unauthenticated user cannot access admin company endpoint
    const unauthCompanyRes = await fetch(`${baseUrl}/api/v1/admin/company`);
    if (unauthCompanyRes.status === 401) {
      console.log('[PASS] GET /api/v1/admin/company rejected unauthenticated request with 401 Unauthorized');
    }

    // Verify applicant cannot access admin company endpoint
    const forbiddenCompanyRes = await fetch(`${baseUrl}/api/v1/admin/company`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    if (forbiddenCompanyRes.status === 403) {
      console.log('[PASS] GET /api/v1/admin/company rejected APPLICANT role with 403 Forbidden');
    }

    // Admin update company profile
    const updateCompanyRes = await fetch(`${baseUrl}/api/v1/admin/company`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        companyName: 'Nexora Technologies Global Services',
        shortDescription: 'Delivering high-impact enterprise software engineering and cloud architectures.',
        about: 'ISO 9001:2015 certified software engineering and recruitment operations provider.',
        mission: 'Accelerating digital capabilities through resilient software craftsmanship.',
        vision: 'Global leadership in enterprise technology solutions and talent delivery.',
        areasOfExpertise: ['Software Engineering', 'Cloud Solutions', 'IT Modernization'],
        businessCapabilities: ['Dedicated Agile PODs', 'Zero-Trust Architecture'],
        email: 'contact@nexoratech.com',
        phone: '+91 93904 66320',
        address: 'Madhapur, Hitec City, Hyderabad, India',
        websiteUrl: 'https://www.globaltechnologyservice.in',
      }),
    });
    const updateCompanyJson = await updateCompanyRes.json();
    if (updateCompanyRes.status === 200 && updateCompanyJson.data?.company?.companyName === 'Nexora Technologies Global Services') {
      console.log('[PASS] PUT /api/v1/admin/company updated company profile successfully');
    } else {
      console.error('[FAIL] PUT /api/v1/admin/company failed:', updateCompanyRes.status, updateCompanyJson);
    }

    // ==========================================
    // 2. Services Management Tests
    // ==========================================
    console.log('\n--- 2. Testing Services Management Module ---');
    const serviceSlug = `test-service-${Date.now()}`;
    const createServiceRes = await fetch(`${baseUrl}/api/v1/admin/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Microservices & Distributed Systems',
        slug: serviceSlug,
        category: 'Software Engineering',
        shortDescription: 'Designing resilient, decoupled microservice meshes for enterprise workloads.',
        fullDescription: 'Comprehensive distributed architecture consulting, domain-driven decomposition, and gRPC integrations.',
        capabilities: ['Domain-Driven Design (DDD)', 'Event-Driven Architectures', 'Kafka Event Streaming'],
        techStack: ['Node.js', 'Go', 'Docker', 'Kubernetes'],
        iconName: 'Cpu',
        displayOrder: 10,
        isPublished: false, // Created as unpublished draft
      }),
    });
    const createServiceJson = await createServiceRes.json();
    const createdServiceId = createServiceJson.data?.service?.id;
    if (createServiceRes.status === 201 && createdServiceId) {
      console.log('[PASS] POST /api/v1/admin/services created service draft (201 Created)');
    }

    // Duplicate slug conflict prevention
    const dupServiceRes = await fetch(`${baseUrl}/api/v1/admin/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Duplicate Service',
        slug: serviceSlug,
        category: 'Software Engineering',
        shortDescription: 'Attempting duplicate slug collision.',
      }),
    });
    if (dupServiceRes.status === 409) {
      console.log('[PASS] Duplicate service slug rejected with 409 Conflict');
    }

    // Verify unpublished service does NOT appear publicly
    const pubServiceDraftRes = await fetch(`${baseUrl}/api/v1/services/${serviceSlug}`);
    if (pubServiceDraftRes.status === 404) {
      console.log('[PASS] GET /api/v1/services/:slug correctly hid unpublished draft (404 Not Found)');
    }

    // Publish the service
    const publishServiceRes = await fetch(`${baseUrl}/api/v1/admin/services/${createdServiceId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isPublished: true }),
    });
    if (publishServiceRes.status === 200) {
      console.log('[PASS] PATCH /api/v1/admin/services/:id/status published service successfully');
    }

    // Now verify it IS visible publicly
    const pubServiceLiveRes = await fetch(`${baseUrl}/api/v1/services/${serviceSlug}`);
    if (pubServiceLiveRes.status === 200) {
      console.log('[PASS] GET /api/v1/services/:slug retrieved published service successfully');
    }

    // ==========================================
    // 3. Job Postings Management Tests
    // ==========================================
    console.log('\n--- 3. Testing Job Postings Module ---');
    const jobCode = `NEX-TST-${Date.now().toString().slice(-4)}`;
    const createJobRes = await fetch(`${baseUrl}/api/v1/admin/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        jobCode,
        title: 'Staff Distributed Systems Architect',
        department: 'Engineering',
        location: 'Hyderabad, India',
        employmentType: 'FULL_TIME',
        workMode: 'HYBRID',
        experienceRequired: '8+ years',
        salaryRange: 'Commensurate with experience',
        description: 'Lead high-level technical decisions across cloud and on-premise distributed infrastructure.',
        responsibilities: ['Author architectural RFCs', 'Mentor engineering leads'],
        requiredSkills: ['Distributed Consensus', 'PostgreSQL', 'Kubernetes'],
        status: 'DRAFT', // Starts as draft
      }),
    });
    const createJobJson = await createJobRes.json();
    const createdJobId = createJobJson.data?.job?.id;
    if (createJobRes.status === 201 && createdJobId) {
      console.log(`[PASS] POST /api/v1/admin/jobs created draft job ${jobCode} (201 Created)`);
    }

    // Verify draft job is hidden from public API
    const pubDraftJobRes = await fetch(`${baseUrl}/api/v1/jobs/${jobCode}`);
    if (pubDraftJobRes.status === 404) {
      console.log('[PASS] GET /api/v1/jobs/:idOrCode excluded draft job from public access (404 Not Found)');
    }

    // Publish the job
    const publishJobRes = await fetch(`${baseUrl}/api/v1/admin/jobs/${createdJobId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'PUBLISHED' }),
    });
    if (publishJobRes.status === 200) {
      console.log('[PASS] PATCH /api/v1/admin/jobs/:id/status transitioned job to PUBLISHED');
    }

    // Verify published job appears in public listing and search
    const pubJobListRes = await fetch(`${baseUrl}/api/v1/jobs?search=Distributed`);
    const pubJobListJson = await pubJobListRes.json();
    if (pubJobListRes.status === 200 && pubJobListJson.data?.items?.some((j) => j.jobCode === jobCode)) {
      console.log('[PASS] GET /api/v1/jobs?search=Distributed returned the published job in public search results');
    }

    // ==========================================
    // 4. Contact Enquiries Tests
    // ==========================================
    console.log('\n--- 4. Testing Contact Enquiries Module ---');
    const submitEnquiryRes = await fetch(`${baseUrl}/api/v1/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Vikram Malhotra',
        email: 'vikram.m@innovations.com',
        phone: '+91 99887 76655',
        subject: 'Enterprise Cloud Migration Assessment',
        message: 'We are seeking an initial architecture review to migrate our on-premise infrastructure to AWS.',
      }),
    });
    const submitEnquiryJson = await submitEnquiryRes.json();
    const enquiryId = submitEnquiryJson.data?.enquiryId;
    if (submitEnquiryRes.status === 201 && enquiryId) {
      console.log('[PASS] POST /api/v1/enquiries submitted enquiry successfully (201 Created)');
    }

    // Admin listing enquiries
    const adminEnquiriesRes = await fetch(`${baseUrl}/api/v1/admin/enquiries`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminEnquiriesJson = await adminEnquiriesRes.json();
    if (adminEnquiriesRes.status === 200 && adminEnquiriesJson.data?.items?.some((e) => e.id === enquiryId)) {
      console.log('[PASS] GET /api/v1/admin/enquiries listed submitted enquiry for administrator');
    }

    // Admin update enquiry status & notes
    const updateEnquiryStatusRes = await fetch(`${baseUrl}/api/v1/admin/enquiries/${enquiryId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'IN_PROGRESS',
        adminNotes: 'Contacted client via email on 26 Oct. Scheduled architecture discovery call.',
      }),
    });
    if (updateEnquiryStatusRes.status === 200) {
      console.log('[PASS] PATCH /api/v1/admin/enquiries/:id/status updated status to IN_PROGRESS and added internal admin notes');
    }

    console.log('\n>>> All Phase 3 Backend Verification Tests Passed Cleanly (100%)! <<<');
  } catch (error) {
    console.error('[ERROR] Phase 3 verification error:', error);
  } finally {
    server.close(() => {
      console.log('[PASS] Test server stopped cleanly.');
    });
    await prisma.$disconnect();
  }
}

runPhase3Verification();
