/**
 * server/src/app/enquiries/enquiries.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Contact Enquiries Module Integration Test
 * Verifies:
 *   1. Public POST /api/v1/enquiries submits an inbound enquiry
 *   2. Direct PostgreSQL verification in table "contact_enquiries"
 *   3. Admin GET /api/v1/admin/enquiries retrieves the enquiry
 *   4. Admin PATCH /api/v1/admin/enquiries/:id/status updates status to IN_PROGRESS
 *   5. Admin PATCH /api/v1/admin/enquiries/:id/notes stores internal triage notes
 *   6. Cleanup of test record
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createTestClient } from '../../core/utils/test-helper.js';

async function runTest() {
  console.log('\n======================================================');
  console.log('  TEST: Contact Enquiries Module');
  console.log('======================================================\n');

  const client = await createTestClient();
  const { baseUrl, adminToken, prisma } = client;
  let createdEnquiryId = null;

  try {
    // 1. Public Submit Enquiry
    const testEnquiry = {
      fullName: 'Rohan Verma',
      email: `rohan.verma.${Date.now()}@enterpriseclient.com`,
      phone: '+91 98765 43210',
      subject: 'Enterprise Cloud Migration RFP',
      message: 'We are looking to migrate our on-premise infrastructure to AWS Kubernetes. Please share consultation availability.',
    };

    const submitRes = await fetch(`${baseUrl}/api/v1/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEnquiry),
    });
    const submitData = await submitRes.json();
    console.log(`[PASS] POST /api/v1/enquiries -> Status: ${submitRes.status} (Success: ${submitData.success})`);
    if (submitRes.status !== 201 || !submitData.success) {
      throw new Error(`Failed to submit enquiry: ${JSON.stringify(submitData.error)}`);
    }

    createdEnquiryId = submitData.data.enquiry.id;
    console.log(`       Created Enquiry ID: ${createdEnquiryId}`);

    // 2. PostgreSQL Database Verification
    const dbEnquiry = await prisma.contactEnquiry.findUnique({
      where: { id: createdEnquiryId },
    });
    if (!dbEnquiry) throw new Error('Enquiry record not found in PostgreSQL "contact_enquiries" table');
    if (dbEnquiry.fullName !== testEnquiry.fullName) throw new Error('DB full_name mismatch');
    if (dbEnquiry.status !== 'NEW') throw new Error('DB status expected to be NEW');

    console.log('[PASS] Database reflection verified in table "contact_enquiries":');
    console.log(`       full_name:  "${dbEnquiry.fullName}"`);
    console.log(`       email:      "${dbEnquiry.email}"`);
    console.log(`       status:     ${dbEnquiry.status}`);
    console.log(`       subject:    "${dbEnquiry.subject}"`);
    console.log(`       created_at: ${dbEnquiry.createdAt.toISOString()}`);

    // 3. Admin GET Enquiries List
    const listRes = await fetch(`${baseUrl}/api/v1/admin/enquiries`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listData = await listRes.json();
    console.log(`[PASS] GET /api/v1/admin/enquiries -> Status: ${listRes.status} (Total: ${listData.data?.pagination?.totalItems ?? 0})`);
    const foundInAdmin = listData.data.items?.some((e) => e.id === createdEnquiryId);
    if (!foundInAdmin) throw new Error('Enquiry not visible in admin list');

    // 4. Admin Update Status
    const statusRes = await fetch(`${baseUrl}/api/v1/admin/enquiries/${createdEnquiryId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    const statusData = await statusRes.json();
    console.log(`[PASS] PATCH /api/v1/admin/enquiries/:id/status -> Status: ${statusRes.status} (New Status: ${statusData.data?.enquiry?.status})`);

    // 5. Admin Update Notes
    const notesRes = await fetch(`${baseUrl}/api/v1/admin/enquiries/${createdEnquiryId}/notes`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ notes: 'Scheduled technical scoping call for Thursday 3 PM.' }),
    });
    const notesData = await notesRes.json();
    console.log(`[PASS] PATCH /api/v1/admin/enquiries/:id/notes -> Status: ${notesRes.status}`);

    // Verify DB reflects updated status and notes
    const updatedDb = await prisma.contactEnquiry.findUnique({ where: { id: createdEnquiryId } });
    if (updatedDb.status !== 'IN_PROGRESS') throw new Error('DB status update failed');
    if (!updatedDb.adminNotes?.includes('Thursday 3 PM')) throw new Error('DB admin notes update failed');
    console.log(`[PASS] Database updated status: "${updatedDb.status}", notes: "${updatedDb.adminNotes}"`);

    console.log('\n[RESULT] Enquiries module test passed completely ✅\n');
  } finally {
    // 6. Cleanup test enquiry
    if (createdEnquiryId) {
      await prisma.contactEnquiry.deleteMany({ where: { id: createdEnquiryId } });
      console.log(`[CLEANUP] Removed test enquiry record ID: ${createdEnquiryId}`);
    }
    await client.close();
  }
}

runTest().catch((err) => {
  console.error('\n[FAIL] Enquiries module test error:', err.message);
  process.exit(1);
});
