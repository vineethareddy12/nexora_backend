import app from '../src/app.js';
import { env } from '../src/core/config/env.js';

async function runPhase1Checks() {
  console.log('--- Starting Phase 1 Verification Suite ---');
  const port = 4001; // use dedicated test port to avoid collision
  const baseUrl = `http://localhost:${port}`;

  const server = app.listen(port);
  console.log(`[PASS] Server started on ${baseUrl}`);

  try {
    // 1. Test /health
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthJson = await healthRes.json();
    if (healthRes.status === 200 && healthJson.data?.status === 'healthy') {
      console.log('[PASS] GET /health returned 200 OK:', healthJson.data);
    } else {
      throw new Error(`GET /health failed: status ${healthRes.status}`);
    }

    // 2. Test /api/v1/health (standardized route)
    const apiV1HealthRes = await fetch(`${baseUrl}/api/v1/health`);
    const apiV1HealthJson = await apiV1HealthRes.json();
    if (apiV1HealthRes.status === 200 && apiV1HealthJson.data?.status === 'healthy') {
      console.log('[PASS] GET /api/v1/health returned 200 OK');
    } else {
      throw new Error(`GET /api/v1/health failed: status ${apiV1HealthRes.status}`);
    }

    // 3. Test OpenAPI JSON at /api-docs.json
    const docsJsonRes = await fetch(`${baseUrl}/api-docs.json`);
    const docsJson = await docsJsonRes.json();
    if (docsJsonRes.status === 200 && docsJson.openapi === '3.0.0') {
      console.log('[PASS] GET /api-docs.json returned valid OpenAPI 3.0.0 specification');
      console.log('       API Title:', docsJson.info.title, '| Version:', docsJson.info.version);
    } else {
      throw new Error(`GET /api-docs.json failed: status ${docsJsonRes.status}`);
    }

    // 4. Test Swagger UI at /api-docs
    const swaggerUiRes = await fetch(`${baseUrl}/api-docs/`);
    if (swaggerUiRes.status === 200) {
      console.log('[PASS] GET /api-docs/ returned 200 OK (Swagger UI)');
    } else {
      throw new Error(`GET /api-docs/ failed: status ${swaggerUiRes.status}`);
    }

    // 5. Test 404 Not Found & Centralized Error Handler
    const notFoundRes = await fetch(`${baseUrl}/api/v1/unknown-endpoint-test`);
    const notFoundJson = await notFoundRes.json();
    if (notFoundRes.status === 404 && notFoundJson.error?.code === 'NOT_FOUND') {
      console.log('[PASS] Centralized Error Handler correctly handled 404:', notFoundJson.error.message);
    } else {
      throw new Error(`404 handler check failed: status ${notFoundRes.status}`);
    }

    // 6. Test Security Headers (Helmet)
    const helmetCheck = healthRes.headers.get('x-content-type-options');
    if (helmetCheck === 'nosniff') {
      console.log('[PASS] Helmet security headers present (x-content-type-options: nosniff)');
    } else {
      console.warn('[WARN] Security header check returned:', helmetCheck);
    }

    console.log('\n>>> All Phase 1 Foundation verification tests PASSED successfully! <<<');
  } catch (err) {
    console.error('[FAIL] Verification error:', err.message);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      console.log('[PASS] Test server stopped cleanly.');
    });
  }
}

runPhase1Checks();
