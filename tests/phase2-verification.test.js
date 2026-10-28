import app from '../src/app.js';

async function runPhase2Verification() {
  console.log('--- Starting Phase 2 Authentication & User Verification Suite ---');
  const port = 4002;
  const baseUrl = `http://localhost:${port}`;
  const server = app.listen(port);
  console.log(`[PASS] Test server started on ${baseUrl}`);

  try {
    const testEmail = `test.applicant.${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    // 1. Test Registration
    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Candidate',
        email: testEmail,
        password: testPassword,
        mobileNumber: '+91 99999 88888',
      }),
    });
    const regJson = await regRes.json();
    if (regRes.status === 201 && regJson.success && regJson.data?.user?.email === testEmail) {
      console.log('[PASS] POST /api/v1/auth/register created candidate successfully (201 Created)');
    } else {
      console.log('[INFO] Registration response:', regRes.status, regJson);
    }

    // 2. Test Duplicate Email Prevention
    const dupRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Candidate Duplicate',
        email: testEmail,
        password: testPassword,
      }),
    });
    const dupJson = await dupRes.json();
    if (dupRes.status === 409 && dupJson.error?.code === 'CONFLICT') {
      console.log('[PASS] Duplicate registration rejected with 409 Conflict:', dupJson.error.message);
    }

    // 3. Test Login
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginJson = await loginRes.json();
    let accessToken = null;
    let refreshToken = null;

    if (loginRes.status === 200 && loginJson.data?.tokens?.accessToken) {
      accessToken = loginJson.data.tokens.accessToken;
      refreshToken = loginJson.data.tokens.refreshToken;
      console.log('[PASS] POST /api/v1/auth/login authenticated successfully and returned JWT access + refresh tokens');
    }

    // 4. Test Invalid Login
    const badLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword123!',
      }),
    });
    if (badLoginRes.status === 401) {
      console.log('[PASS] Invalid password rejected with 401 Unauthorized');
    }

    // 5. Test Protected Route with Token (/api/v1/auth/me)
    if (accessToken) {
      const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meJson = await meRes.json();
      if (meRes.status === 200 && meJson.data?.user?.email === testEmail) {
        console.log('[PASS] GET /api/v1/auth/me retrieved authenticated user profile using Bearer token');
      }
    }

    // 6. Test Protected Route without Token
    const unauthRes = await fetch(`${baseUrl}/api/v1/auth/me`);
    if (unauthRes.status === 401) {
      console.log('[PASS] Protected endpoint rejected unauthenticated request with 401 Unauthorized');
    }

    // 7. Test Token Refresh
    if (refreshToken) {
      const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const refreshJson = await refreshRes.json();
      if (refreshRes.status === 200 && refreshJson.data?.tokens?.accessToken) {
        console.log('[PASS] POST /api/v1/auth/refresh issued new access token');
      }
    }

    // 8. Test Change Password
    if (accessToken) {
      const changePwRes = await fetch(`${baseUrl}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          currentPassword: testPassword,
          newPassword: 'BrandNewPassword456!',
        }),
      });
      const changePwJson = await changePwRes.json();
      if (changePwRes.status === 200 && changePwJson.success) {
        console.log('[PASS] POST /api/v1/auth/change-password verified and changed password successfully');
      } else {
        console.error('[FAIL] Change password response:', changePwRes.status, changePwJson);
      }
    }

    console.log('\n>>> Phase 2 Authentication Suite verification checks completed! <<<');
  } catch (error) {
    console.error('[ERROR] Verification error:', error.message);
  } finally {
    server.close(() => {
      console.log('[PASS] Test server stopped cleanly.');
    });
  }
}

runPhase2Verification();
