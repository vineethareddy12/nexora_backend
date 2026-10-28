/**
 * server/scripts/check-db.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Inspects all Prisma tables and prints live counts and health check.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { prisma } from '../src/core/database/prisma.js';

async function check() {
  console.log('\n======================================================');
  console.log('  Nexora Technologies — Database Health & Live Counts');
  console.log('======================================================\n');

  const [users, companies, services, jobs, enquiries] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true, role: true, status: true } }),
    prisma.companyProfile.count(),
    prisma.service.count(),
    prisma.job.count(),
    prisma.contactEnquiry.count(),
  ]);

  console.log(`Company Profiles:  ${companies}`);
  console.log(`Services:          ${services}`);
  console.log(`Jobs:              ${jobs}`);
  console.log(`Contact Enquiries: ${enquiries}`);
  console.log(`Total Users:       ${users.length}`);
  console.log('\nUsers Breakdown:');
  users.forEach((u, i) => {
    console.log(`  ${i + 1}. [${u.role}] ${u.email} (${u.status})`);
  });
  console.log('\n======================================================\n');
  await prisma.$disconnect();
}

check().catch((e) => {
  console.error('[CHECK-DB] Error:', e.message);
  process.exit(1);
});
