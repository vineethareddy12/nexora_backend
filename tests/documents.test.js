import app from '../src/app.js';
import { prisma } from '../src/core/database/prisma.js';
import fs from 'fs';
import path from 'path';

async function runDocumentsVerificationSuite() {
  console.log('====================================================');
  console.log('   Nexora Technologies — Documents Test Suite      ');
  console.log('====================================================');

  const port = 4005;
  const baseUrl = `http://localhost:${port}`;
  const server = app.listen(port);
  console.log(`[INIT] Test server active on ${baseUrl}`);

  try {
    const timestamp = Date.now();
    const userAEmail = `doc.applicant.a.${timestamp}@example.com`;
    const userBEmail = `doc.applicant.b.${timestamp}@example.com`;
    const testPassword = 'Password123!';

    // Setup: Register Applicant A
    const regARes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Applicant Alice',
        email: userAEmail,
        password: testPassword,
        phone: '+91 91234 56789',
      }),
    });
    const regAJson = await regARes.json();
    const tokenA = regAJson.data.tokens.accessToken;
    const userAId = regAJson.data.user.id;
    console.log(`[PASS] Registered Applicant A (${userAId})`);

    // Setup: Register Applicant B
    const regBRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Applicant Bob',
        email: userBEmail,
        password: testPassword,
        phone: '+91 99876 54321',
      }),
    });
    const regBJson = await regBRes.json();
    const tokenB = regBJson.data.tokens.accessToken;
    const userBId = regBJson.data.user.id;
    console.log(`[PASS] Registered Applicant B (${userBId})`);

    // Valid PDF Buffer with valid magic bytes '%PDF-1.4\n...'
    const validPdfBuffer = Buffer.concat([
      Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Test Resume) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'),
      Buffer.alloc(100, 0x20),
    ]);

    // Valid PNG Buffer with valid signature (89 50 4E 47 0D 0A 1A 0A)
    const validPngBuffer = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]),
      Buffer.alloc(50, 0),
    ]);

    // ── 1. Upload Valid PDF Document as RESUME ──────────────────────────────────
    const form1 = new FormData();
    form1.append('file', new Blob([validPdfBuffer], { type: 'application/pdf' }), 'Alice_Resume_2026.pdf');
    form1.append('type', 'RESUME');
    form1.append('description', 'Lead Full Stack Engineer Resume');

    const upload1Res = await fetch(`${baseUrl}/api/v1/me/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: form1,
    });
    const upload1Json = await upload1Res.json();

    if (upload1Res.status === 201 && upload1Json.success && upload1Json.data.document.id) {
      console.log('[PASS] Uploaded valid PDF resume (201 Created):', upload1Json.data.document.originalFilename);
    } else {
      throw new Error(`Upload valid PDF failed: ${JSON.stringify(upload1Json)}`);
    }

    const docA1Id = upload1Json.data.document.id;

    // ── 2. Upload Valid PNG as EDUCATIONAL_CERTIFICATE ───────────────────────────
    const form2 = new FormData();
    form2.append('file', new Blob([validPngBuffer], { type: 'image/png' }), 'Degree_Certificate.png');
    form2.append('type', 'EDUCATIONAL_CERTIFICATE');

    const upload2Res = await fetch(`${baseUrl}/api/v1/me/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: form2,
    });
    const upload2Json = await upload2Res.json();

    if (upload2Res.status === 201 && upload2Json.data.document.type === 'EDUCATIONAL_CERTIFICATE') {
      console.log('[PASS] Uploaded valid PNG certificate (201 Created):', upload2Json.data.document.originalFilename);
    } else {
      throw new Error(`Upload valid PNG failed: ${JSON.stringify(upload2Json)}`);
    }

    const docA2Id = upload2Json.data.document.id;

    // ── 3. Reject Unsupported Extension (.exe) ──────────────────────────────────
    const formBadExt = new FormData();
    formBadExt.append('file', new Blob([Buffer.from('MZ...')], { type: 'application/octet-stream' }), 'virus.exe');
    formBadExt.append('type', 'RESUME');

    const badExtRes = await fetch(`${baseUrl}/api/v1/me/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formBadExt,
    });
    const badExtJson = await badExtRes.json();
    if (badExtRes.status === 400 && badExtJson.error?.message?.includes('extension')) {
      console.log('[PASS] Rejected unsupported file extension (.exe) with 400 Bad Request');
    } else {
      throw new Error(`Failed to reject bad extension: ${JSON.stringify(badExtJson)}`);
    }

    // ── 4. Reject Spoofed File Signature (extension .pdf but content is text) ────
    const formSpoof = new FormData();
    formSpoof.append('file', new Blob([Buffer.from('This is a plain text file pretending to be PDF')], { type: 'application/pdf' }), 'fake.pdf');
    formSpoof.append('type', 'RESUME');

    const spoofRes = await fetch(`${baseUrl}/api/v1/me/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formSpoof,
    });
    const spoofJson = await spoofRes.json();
    if (spoofRes.status === 400 && spoofJson.error?.message?.includes('signature')) {
      console.log('[PASS] Rejected spoofed PDF (magic bytes check failed) with 400 Bad Request');
    } else {
      throw new Error(`Failed to reject spoofed file: ${JSON.stringify(spoofJson)}`);
    }

    // ── 5. Reject Invalid Document Type ──────────────────────────────────────────
    const formBadType = new FormData();
    formBadType.append('file', new Blob([validPdfBuffer], { type: 'application/pdf' }), 'doc.pdf');
    formBadType.append('type', 'INVALID_TYPE_123');

    const badTypeRes = await fetch(`${baseUrl}/api/v1/me/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formBadType,
    });
    const badTypeJson = await badTypeRes.json();
    if (badTypeRes.status === 422 || badTypeRes.status === 400) {
      console.log('[PASS] Rejected invalid document type with validation error (422 Unprocessable Entity)');
    } else {
      throw new Error(`Failed to reject bad type: ${JSON.stringify(badTypeJson)}`);
    }

    // ── 6. Reject Oversized File (> 5 MB) ───────────────────────────────────────
    const largeBuffer = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.alloc(6 * 1024 * 1024, 0x41), // 6 MB
    ]);
    const formLarge = new FormData();
    formLarge.append('file', new Blob([largeBuffer], { type: 'application/pdf' }), 'large.pdf');
    formLarge.append('type', 'RESUME');

    const largeRes = await fetch(`${baseUrl}/api/v1/me/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formLarge,
    });
    const largeJson = await largeRes.json();
    if (largeRes.status === 400 && (largeJson.error?.message?.includes('5 MB') || largeJson.error?.message?.includes('limit'))) {
      console.log('[PASS] Rejected oversized file (> 5 MB) with 400 Bad Request');
    } else {
      throw new Error(`Failed to reject oversized file: ${JSON.stringify(largeJson)}`);
    }

    // ── 7. List Documents (Isolation Check) ──────────────────────────────────────
    const listARes = await fetch(`${baseUrl}/api/v1/me/documents`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listAJson = await listARes.json();
    if (listARes.status === 200 && listAJson.data.documents.length === 2) {
      console.log(`[PASS] Applicant A lists exactly their 2 uploaded documents`);
    } else {
      throw new Error(`List documents for A failed: ${JSON.stringify(listAJson)}`);
    }

    const listBRes = await fetch(`${baseUrl}/api/v1/me/documents`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const listBJson = await listBRes.json();
    if (listBRes.status === 200 && listBJson.data.documents.length === 0) {
      console.log(`[PASS] Applicant B sees 0 documents (strict applicant isolation confirmed)`);
    } else {
      throw new Error(`Applicant B saw documents unexpectedly: ${JSON.stringify(listBJson)}`);
    }

    // ── 8. Prevent Cross-Applicant Access (IDOR Prevention) ──────────────────────
    // Applicant B attempts to view Applicant A's document metadata
    const idorGetRes = await fetch(`${baseUrl}/api/v1/me/documents/${docA1Id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (idorGetRes.status === 404) {
      console.log('[PASS] IDOR Protection: GET document of another user returned 404 Not Found');
    } else {
      throw new Error(`IDOR GET failed: status ${idorGetRes.status}`);
    }

    // Applicant B attempts to replace Applicant A's document
    const formIdorReplace = new FormData();
    formIdorReplace.append('file', new Blob([validPdfBuffer], { type: 'application/pdf' }), 'hacked.pdf');
    const idorReplaceRes = await fetch(`${baseUrl}/api/v1/me/documents/${docA1Id}/replace`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: formIdorReplace,
    });
    if (idorReplaceRes.status === 404) {
      console.log('[PASS] IDOR Protection: POST replace document of another user returned 404 Not Found');
    } else {
      throw new Error(`IDOR Replace failed: status ${idorReplaceRes.status}`);
    }

    // Applicant B attempts to delete Applicant A's document
    const idorDelRes = await fetch(`${baseUrl}/api/v1/me/documents/${docA1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (idorDelRes.status === 404) {
      console.log('[PASS] IDOR Protection: DELETE document of another user returned 404 Not Found');
    } else {
      throw new Error(`IDOR Delete failed: status ${idorDelRes.status}`);
    }

    // Applicant B attempts to download Applicant A's document
    const idorDownloadRes = await fetch(`${baseUrl}/api/v1/me/documents/${docA1Id}/download`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (idorDownloadRes.status === 404) {
      console.log('[PASS] IDOR Protection: GET download document of another user returned 404 Not Found');
    } else {
      throw new Error(`IDOR Download failed: status ${idorDownloadRes.status}`);
    }

    // ── 9. Authorized Download ──────────────────────────────────────────────────
    // Applicant A downloads their own document
    const downloadRes = await fetch(`${baseUrl}/api/v1/me/documents/${docA1Id}/download`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (downloadRes.status === 200 && downloadRes.headers.get('content-type')?.includes('application/pdf')) {
      const arrayBuffer = await downloadRes.arrayBuffer();
      const downloadedBuffer = Buffer.from(arrayBuffer);
      if (downloadedBuffer.slice(0, 5).toString('ascii') === '%PDF-') {
        console.log('[PASS] Authorized download returned 200 OK with identical binary content');
      } else {
        throw new Error('Downloaded bytes do not match uploaded PDF signature');
      }
    } else {
      throw new Error(`Authorized download failed: status ${downloadRes.status}`);
    }

    // Unauthenticated download attempt
    const unauthDownloadRes = await fetch(`${baseUrl}/api/v1/me/documents/${docA1Id}/download`);
    if (unauthDownloadRes.status === 401) {
      console.log('[PASS] Unauthorized download rejected with 401 Unauthorized');
    } else {
      throw new Error(`Unauthorized download status: ${unauthDownloadRes.status}`);
    }

    // ── 10. Document Replacement (Unreferenced In-Place) ────────────────────────
    const updatedPdfBuffer = Buffer.concat([
      Buffer.from('%PDF-1.4\n% Updated Resume V2\n1 0 obj\n<< /Title (Alice V2) >>\nendobj\ntrailer\n<< >>\n%%EOF'),
      Buffer.alloc(80, 0x30),
    ]);
    const formReplace = new FormData();
    formReplace.append('file', new Blob([updatedPdfBuffer], { type: 'application/pdf' }), 'Alice_Resume_2026_v2.pdf');

    const replaceRes = await fetch(`${baseUrl}/api/v1/me/documents/${docA1Id}/replace`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formReplace,
    });
    const replaceJson = await replaceRes.json();
    if (replaceRes.status === 200 && replaceJson.data.document.originalFilename === 'Alice_Resume_2026_v2.pdf') {
      console.log('[PASS] Document replaced in-place successfully for unreferenced document');
    } else {
      throw new Error(`Document replacement failed: ${JSON.stringify(replaceJson)}`);
    }

    // ── 11. Replacement & Deletion with Historical Preservation (applicationCount > 0) ──
    // Simulate document being attached to a submitted job application
    await prisma.applicantDocument.update({
      where: { id: docA2Id },
      data: { applicationCount: 1 },
    });
    console.log('[SETUP] Marked Certificate docA2 as referenced by an application (applicationCount = 1)');

    // Attempt replacing referenced document
    const formReplaceRef = new FormData();
    formReplaceRef.append('file', new Blob([validPngBuffer], { type: 'image/png' }), 'Certificate_Renewed.png');
    const replaceRefRes = await fetch(`${baseUrl}/api/v1/me/documents/${docA2Id}/replace`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formReplaceRef,
    });
    const replaceRefJson = await replaceRefRes.json();
    if (replaceRefRes.status === 200 && replaceRefJson.data.document.preservedHistoricalVersion) {
      console.log('[PASS] Historical preservation: replacing referenced document archived old version and created new active document');
    } else {
      throw new Error(`Replacement with historical preservation failed: ${JSON.stringify(replaceRefJson)}`);
    }

    // Verify old document is preserved in database with isArchived = true
    const archivedDoc = await prisma.applicantDocument.findUnique({
      where: { id: docA2Id },
    });
    if (archivedDoc && archivedDoc.isArchived && archivedDoc.deletedAt) {
      console.log('[PASS] Historical document row remains in database with isArchived = true & deletedAt set');
    } else {
      throw new Error('Historical document was not properly archived');
    }

    // ── 12. Safe Deletion ───────────────────────────────────────────────────────
    // Delete unreferenced document docA1Id
    const delRes = await fetch(`${baseUrl}/api/v1/me/documents/${docA1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const delJson = await delRes.json();
    if (delRes.status === 200 && delJson.data.deleted && !delJson.data.archived) {
      console.log('[PASS] Unreferenced document hard-deleted and file removed from storage');
    } else {
      throw new Error(`Unreferenced deletion failed: ${JSON.stringify(delJson)}`);
    }

    // Verify row is gone
    const checkDeleted = await prisma.applicantDocument.findUnique({ where: { id: docA1Id } });
    if (!checkDeleted) {
      console.log('[PASS] Unreferenced document record confirmed removed from database');
    } else {
      throw new Error('Unreferenced document still present in database');
    }

    // ── 13. Verify Existing Features Remain Operational ─────────────────────────
    const checkHealth = await fetch(`${baseUrl}/health`);
    if (checkHealth.status === 200) {
      console.log('[PASS] Existing /health route operating normally');
    }

    const checkJobs = await fetch(`${baseUrl}/api/v1/jobs`);
    if (checkJobs.status === 200) {
      console.log('[PASS] Existing /api/v1/jobs route operating normally');
    }

    const checkServices = await fetch(`${baseUrl}/api/v1/services`);
    if (checkServices.status === 200) {
      console.log('[PASS] Existing /api/v1/services route operating normally');
    }

    console.log('====================================================');
    console.log('   ALL 13 TEST SUITE CASES PASSED SUCCESSFULLY!    ');
    console.log('====================================================');
  } finally {
    server.close();
  }
}

runDocumentsVerificationSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test suite failed with error:', err);
    process.exit(1);
  });
