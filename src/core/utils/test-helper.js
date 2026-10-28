/**
 * server/src/core/utils/test-helper.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight test harness helper for module-level integration tests.
 * Starts an in-memory HTTP instance of the Express app on an ephemeral port
 * and logs in with the official Admin account without creating dummy users.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import app from '../../app.js';
import { prisma } from '../database/prisma.js';
import { env } from '../config/env.js';

export async function createTestClient() {
  const server = app.listen(0); // auto-assign free port
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const adminEmail = (env.ADMIN_DEFAULT_EMAIL || 'admin@nexoratech.com').toLowerCase().trim();
  const adminPassword = env.ADMIN_DEFAULT_PASSWORD || 'AdminSecurePass2026!';

  // Login as Admin
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });

  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.success) {
    server.close();
    throw new Error(`[TEST-HELPER] Failed to authenticate admin: ${loginData.error?.message || loginRes.statusText}`);
  }

  const adminToken = loginData.data?.tokens?.accessToken;

  return {
    server,
    baseUrl,
    adminToken,
    prisma,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
