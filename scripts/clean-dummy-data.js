/**
 * server/scripts/clean-dummy-data.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Cleans all dummy/mock records from the Nexora database, leaving only the
 * single authoritative Administrator account so you can test end-to-end with
 * pristine data.
 *
 * Usage:
 *   node scripts/clean-dummy-data.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('YOUR_POSTGRES_PASSWORD_HERE')) {
  const { DB_USER = 'postgres', DB_PASSWORD = 'postgres', DB_HOST = 'localhost', DB_PORT = '5432', DB_NAME = 'nexora_db' } = process.env;
  process.env.DATABASE_URL = `postgresql://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public`;
}

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function cleanData() {
  console.log('\n======================================================');
  console.log('  Nexora Technologies — Clean Dummy Data Utility');
  console.log('======================================================\n');

  // 1. Delete Contact Enquiries
  const deletedEnquiries = await prisma.contactEnquiry.deleteMany({});
  console.log(`[CLEAN] Removed ${deletedEnquiries.count} contact enquiry records.`);

  // 2. Delete Jobs
  const deletedJobs = await prisma.job.deleteMany({});
  console.log(`[CLEAN] Removed ${deletedJobs.count} job vacancy records.`);

  // 3. Delete Services
  const deletedServices = await prisma.service.deleteMany({});
  console.log(`[CLEAN] Removed ${deletedServices.count} company service records.`);

  // 4. Delete temp / phase test users (keep only the admin and genuine users)
  const deletedTempUsers = await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: 'test.applicant.' } },
        { email: { startsWith: 'phase3.' } },
      ],
    },
  });
  console.log(`[CLEAN] Removed ${deletedTempUsers.count} temporary test users.`);

  // 5. Ensure the ONE authoritative Admin account is active with fresh hash
  const adminEmail = (process.env.ADMIN_DEFAULT_EMAIL || 'admin@nexoratech.com').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'AdminSecurePass2026!';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      fullName: 'Nexora System Administrator',
    },
    create: {
      email: adminEmail,
      passwordHash,
      fullName: 'Nexora System Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    select: { id: true, email: true, role: true, status: true },
  });

  // Ensure no other admin accounts exist
  const removedOtherAdmins = await prisma.user.deleteMany({
    where: {
      role: 'ADMIN',
      email: { not: adminEmail },
    },
  });
  if (removedOtherAdmins.count > 0) {
    console.log(`[CLEAN] Removed ${removedOtherAdmins.count} extra admin accounts. Exactly 1 admin remains.`);
  }

  // 6. Print database summary
  const userCount = await prisma.user.count();
  const jobCount = await prisma.job.count();
  const serviceCount = await prisma.service.count();
  const enquiryCount = await prisma.contactEnquiry.count();
  const companyProfile = await prisma.companyProfile.findFirst();

  console.log('\n------------------------------------------------------');
  console.log('  Current Database Status (Ready For Testing)');
  console.log('------------------------------------------------------');
  console.log(`  Users:             ${userCount} (Active Admin: ${admin.email})`);
  console.log(`  Job Postings:      ${jobCount}`);
  console.log(`  Company Services:  ${serviceCount}`);
  console.log(`  Contact Enquiries: ${enquiryCount}`);
  console.log(`  Company Profile:   ${companyProfile ? companyProfile.companyName : 'None'}`);
  console.log('------------------------------------------------------\n');
  console.log('Admin Login Credentials:');
  console.log(`  URL:      http://localhost:5173/login`);
  console.log(`  Email:    ${adminEmail}`);
  console.log(`  Password: ${adminPassword}\n`);
}

cleanData()
  .catch((e) => {
    console.error('[CLEAN] Error cleaning data:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
