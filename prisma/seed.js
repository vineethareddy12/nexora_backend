/**
 * prisma/seed.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single authoritative seed for Nexora Technologies.
 *
 * Sections:
 *   1. Admin user (always upserts with fresh password hash)
 *   2. Company profile
 *   3. Services (6 enterprise offerings)
 *   4. Job postings (4 published roles)
 *
 * Run:  node prisma/seed.js
 *  or:  npm run db:seed
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Build correct DATABASE_URL even if .env still has the placeholder
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('YOUR_POSTGRES_PASSWORD_HERE')) {
  const { DB_USER = 'postgres', DB_PASSWORD = 'postgres', DB_HOST = 'localhost', DB_PORT = '5432', DB_NAME = 'nexora_db' } = process.env;
  process.env.DATABASE_URL = `postgresql://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public`;
}

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

// ─── 1. Admin User ────────────────────────────────────────────────────────────
async function seedAdmin() {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (existingAdmin) {
    console.log(`[SEED] ℹ️ Admin user already exists (${existingAdmin.email}), skipping.`);
    return existingAdmin;
  }

  const email = (process.env.ADMIN_DEFAULT_EMAIL || 'admin@nexoratech.com').toLowerCase().trim();
  const password = process.env.ADMIN_DEFAULT_PASSWORD || 'AdminSecurePass2026!';
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: 'Nexora System Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    select: { id: true, email: true, role: true, status: true },
  });

  console.log('[SEED] ✅ Admin user ready');
  console.log(`       Email:  ${admin.email}`);
  console.log(`       Role:   ${admin.role}`);
  console.log(`       Status: ${admin.status}`);
  return admin;
}

// ─── 2. Company Profile ───────────────────────────────────────────────────────
async function seedCompany() {
  const existing = await prisma.companyProfile.findFirst();
  if (existing) {
    console.log('[SEED] ℹ️ Company profile already exists, preserving your data.');
    return;
  }

  const data = {
    companyName: 'Nexora Technologies Private Limited',
    logoUrl: null,
    shortDescription:
      'Delivering high-impact enterprise software engineering, cloud architectures, and an integrated global talent recruitment platform from Hyderabad, India.',
    about:
      'Nexora Technologies is an ISO 9001:2015 certified global technology services company headquartered in Madhapur, Hitec City, Hyderabad. We deliver end-to-end full-stack software development, cloud infrastructure planning, and enterprise recruitment services to technology organisations across India and international markets.',
    mission:
      'To empower forward-thinking enterprises with resilient digital infrastructure, modern microservices architectures, and high-calibre engineering talent that drive sustained commercial value.',
    vision:
      'To be a globally recognised technology partner known for flawless software craftsmanship, ethical talent practices, and transparent recruitment operations.',
    areasOfExpertise: [
      'Full-Stack Web Application Development',
      'Native & Cross-Platform Mobile Solutions',
      'Cloud Architecture & DevOps Automation',
      'Enterprise IT Modernisation & Architecture Consulting',
      'Artificial Intelligence & Document Automation',
      'Automated Software Testing & Quality Engineering',
    ],
    businessCapabilities: [
      'Dedicated Offshore Software Engineering Pods',
      'ISO 9001:2015 Process-Controlled Delivery Framework',
      'Integrated Applicant Tracking & Digital Offer Management',
      'High-Concurrency Microservices with Zero-Trust Security',
    ],
    email: 'info@nexoratech.com',
    phone: '+91 93904 66320 / +91 40 4855 2244',
    address: 'LVS Arcade, Jubilee Enclave, Madhapur, Hitec City, Hyderabad, Telangana 500081, India',
    websiteUrl: 'https://www.globaltechnologyservice.in',
  };

  await prisma.companyProfile.create({ data });
  console.log('[SEED] ✅ Company profile ready');
}

// ─── 3. Services ──────────────────────────────────────────────────────────────
async function seedServices() {
  const existingCount = await prisma.service.count();
  if (existingCount > 0) {
    console.log(`[SEED] ℹ️ Found ${existingCount} services in database, preserving existing data.`);
    return;
  }

  const services = [
    {
      title: 'Full-Stack Web Application Development',
      slug: 'full-stack-web-development',
      category: 'Software Engineering',
      shortDescription:
        'Robust, scalable, and responsive web applications built with modern frontend frameworks and production-ready microservices designed for enterprise high-traffic loads.',
      fullDescription:
        'From high-concurrency client dashboards to transactional backend APIs, our web application engineering practice builds reliable, secure, and maintainable systems utilising modern Single Page Architecture (SPA) and clean microservices.',
      capabilities: [
        'React 18 & Single Page Architecture (SPA)',
        'Node.js & Express RESTful API Engineering',
        'PostgreSQL & Prisma Relational Database Modelling',
        'Role-Based Access Control (RBAC) & JWT Security',
        'Progressive Web Apps (PWA) & Offline Persistence',
        'Real-time WebSocket event streaming',
      ],
      techStack: ['React', 'Node.js', 'Express', 'PostgreSQL', 'Prisma', 'REST / GraphQL'],
      iconName: 'Code2',
      displayOrder: 1,
      isPublished: true,
    },
    {
      title: 'Mobile App Engineering (iOS & Android)',
      slug: 'mobile-app-engineering',
      category: 'Mobile Solutions',
      shortDescription:
        'Native and hybrid mobile applications designed with fluid UI interactions, secure on-device credential storage, and seamless offline data synchronisation.',
      fullDescription:
        'We architect production-ready mobile applications across iOS and Android with optimised rendering performance, native device hardware integrations, and reliable push telemetry.',
      capabilities: [
        'Cross-platform React Native & Flutter codebases',
        'Native Swift / Kotlin integrations for hardware modules',
        'Biometric authentication (FaceID & Fingerprint)',
        'Push notifications & background sync engines',
        'App Store & Google Play Store release lifecycle',
      ],
      techStack: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Firebase'],
      iconName: 'Smartphone',
      displayOrder: 2,
      isPublished: true,
    },
    {
      title: 'Cloud Architecture & DevOps Engineering',
      slug: 'cloud-architecture-devops',
      category: 'Cloud Solutions',
      shortDescription:
        'End-to-end cloud infrastructure planning, containerisation, automated deployment pipelines, and multi-region disaster recovery setups.',
      fullDescription:
        'Our cloud practice delivers automated, resilient, and cost-optimised cloud architectures leveraging container orchestration, declarative infrastructure, and 24/7 observability.',
      capabilities: [
        'Amazon Web Services (AWS) & Azure cloud setup',
        'Docker containerisation & Kubernetes clusters',
        'Automated CI/CD release pipelines (GitHub Actions)',
        'Infrastructure as Code (Terraform / CloudFormation)',
        'Real-time telemetry, Prometheus & Grafana APM',
      ],
      techStack: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'GitHub Actions'],
      iconName: 'Cloud',
      displayOrder: 3,
      isPublished: true,
    },
    {
      title: 'Enterprise IT Consulting & Modernisation',
      slug: 'enterprise-it-consulting',
      category: 'Consulting',
      shortDescription:
        'Strategic technology advisory, legacy code refactoring, cloud migrations, and dedicated self-managing engineering pod augmentation.',
      fullDescription:
        'We help enterprise leadership navigate complex technical transformations, decompose legacy monoliths, and enforce clean architecture and DevSecOps best practices.',
      capabilities: [
        'Legacy monolith to microservices decomposition',
        'Code quality, security auditing & vulnerability scans',
        'Database performance tuning & query optimisation',
        'Agile delivery coaching & Scrum leadership',
        'Dedicated remote POD staffing & team augmentation',
      ],
      techStack: ['Microservices', 'Clean Architecture', 'DevSecOps', 'Agile/Scrum'],
      iconName: 'ShieldCheck',
      displayOrder: 4,
      isPublished: true,
    },
    {
      title: 'AI, Machine Learning & Automation',
      slug: 'ai-ml-automation',
      category: 'Intelligent Systems',
      shortDescription:
        'Custom artificial intelligence integrations, automated document workflows, natural language processing, and predictive analytics models.',
      fullDescription:
        'Empower enterprise operations with intelligent automation pipelines, automated resume and document ingestion, and tailored natural language understanding systems.',
      capabilities: [
        'Automated PDF resume parsing & skill extraction',
        'Predictive candidate matching & scoring algorithms',
        'Conversational AI chatbots & support automation',
        'Data pipeline ETL engineering & warehousing',
      ],
      techStack: ['Python', 'TensorFlow', 'PyTorch', 'FastAPI', 'Pandas'],
      iconName: 'Cpu',
      displayOrder: 5,
      isPublished: true,
    },
    {
      title: 'Quality Assurance & Automated Testing',
      slug: 'quality-assurance-testing',
      category: 'Quality Engineering',
      shortDescription:
        'Comprehensive automated test suites, end-to-end regression testing, security fuzzing, and performance load benchmarking.',
      fullDescription:
        'We guarantee enterprise software reliability through automated test pyramid coverage, regression matrices, cross-browser validation, and stress testing.',
      capabilities: [
        'Automated end-to-end testing with Cypress & Playwright',
        'Backend integration and unit testing with Jest / Vitest',
        'API performance benchmarking & high-concurrency load testing',
        'Accessibility compliance (WCAG 2.1) & cross-browser QA',
      ],
      techStack: ['Cypress', 'Playwright', 'Jest', 'Postman', 'k6'],
      iconName: 'Zap',
      displayOrder: 6,
      isPublished: true,
    },
  ];

  for (const s of services) {
    await prisma.service.upsert({ where: { slug: s.slug }, update: s, create: s });
  }
  console.log(`[SEED] ✅ ${services.length} services ready`);
}

// ─── 4. Job Postings ──────────────────────────────────────────────────────────
async function seedJobs() {
  const existingCount = await prisma.job.count();
  if (existingCount > 0) {
    console.log(`[SEED] ℹ️ Found ${existingCount} jobs in database, preserving existing data.`);
    return;
  }

  const jobs = [
    {
      jobCode: 'NEX-ENG-001',
      title: 'Senior Full-Stack Engineer',
      department: 'Engineering',
      location: 'Bangalore, India',
      employmentType: 'FULL_TIME',
      workMode: 'HYBRID',
      experienceRequired: '4+ years',
      salaryRange: 'Commensurate with experience',
      description:
        'As a Senior Full-Stack Engineer at Nexora Technologies, you will lead the architecture and development of scalable cloud-based web platforms.',
      responsibilities: [
        'Design, implement, and maintain high-throughput REST APIs and microservices.',
        'Build interactive, accessible, and responsive user interfaces using React.',
        'Architect scalable database schemas and query optimisations in PostgreSQL.',
        'Establish CI/CD pipelines and deployment automation with cloud providers.',
      ],
      requiredQualifications: ['Bachelor or Master degree in Computer Science, Engineering, or related field.'],
      requiredSkills: [
        '4+ years of professional full-stack development experience.',
        'Deep expertise in JavaScript ES modules, React, Node.js, and Express.',
        'Strong working knowledge of PostgreSQL and Prisma ORM.',
        'Experience with authentication standards (JWT, RBAC), secure storage, and API design.',
      ],
      preferredSkills: [
        'Experience with Docker and Kubernetes deployment environments.',
        'Familiarity with OpenAPI/Swagger specifications and automated testing.',
      ],
      numberOfOpenings: 3,
      applicationDeadline: new Date('2026-11-30T23:59:59.000Z'),
      status: 'PUBLISHED',
      isFeatured: true,
    },
    {
      jobCode: 'NEX-INFRA-002',
      title: 'DevOps & Cloud Specialist',
      department: 'Infrastructure',
      location: 'Remote (India)',
      employmentType: 'FULL_TIME',
      workMode: 'REMOTE',
      experienceRequired: '3+ years',
      salaryRange: 'Commensurate with experience',
      description:
        'Architect, automate, and monitor high-availability Kubernetes infrastructure and cloud CI/CD pipelines across AWS and Azure environments.',
      responsibilities: [
        'Architect containerised deployment workflows using Docker and Kubernetes.',
        'Configure automated CI/CD release pipelines with GitHub Actions and Terraform.',
        'Implement application observability, log aggregation, and Prometheus / Grafana alerts.',
        'Oversee cloud security hardening, secret management, and disaster recovery drills.',
      ],
      requiredQualifications: ['B.Tech / B.E. in Information Technology or Computer Science.'],
      requiredSkills: [
        '3+ years managing AWS or Azure production infrastructure.',
        'Proven expertise with Docker, Kubernetes, Helm, and Linux administration.',
        'Solid scripting knowledge in Bash / Python.',
        'Hands-on experience with Terraform or CloudFormation Infrastructure as Code.',
      ],
      preferredSkills: [
        'AWS Certified Solutions Architect or CKA certification.',
        'Experience with multi-region disaster recovery setups.',
      ],
      numberOfOpenings: 2,
      applicationDeadline: new Date('2026-12-15T23:59:59.000Z'),
      status: 'PUBLISHED',
      isFeatured: true,
    },
    {
      jobCode: 'NEX-FE-003',
      title: 'Junior Frontend Developer',
      department: 'Frontend Engineering',
      location: 'Hyderabad, India',
      employmentType: 'FULL_TIME',
      workMode: 'ON_SITE',
      experienceRequired: '1-2 years',
      salaryRange: 'Commensurate with experience',
      description:
        'Craft responsive, accessible, and visually stunning web interfaces using React, CSS design systems, and modern component architectures.',
      responsibilities: [
        'Develop modern, responsive web application interfaces in React.',
        'Collaborate with UI/UX designers to translate Figma mockups into reusable components.',
        'Integrate frontend components with RESTful backend endpoints.',
        'Conduct cross-browser testing and performance audits.',
      ],
      requiredQualifications: ['Bachelor of Science, BCA, B.Tech, or equivalent diploma in computer applications.'],
      requiredSkills: [
        'Strong foundation in HTML5, modern CSS3, and JavaScript ES6+.',
        'Experience building SPAs with React and modern component libraries.',
        'Familiarity with Git version control and team development workflows.',
        'Eagerness to learn cloud architectures and backend integration patterns.',
      ],
      preferredSkills: [
        'Knowledge of state management libraries and REST APIs.',
        'Understanding of web accessibility standards (WCAG 2.1).',
      ],
      numberOfOpenings: 4,
      applicationDeadline: new Date('2026-11-20T23:59:59.000Z'),
      status: 'PUBLISHED',
      isFeatured: false,
    },
    {
      jobCode: 'NEX-QA-004',
      title: 'QA Automation Engineer',
      department: 'Quality Engineering',
      location: 'Hyderabad, India',
      employmentType: 'FULL_TIME',
      workMode: 'HYBRID',
      experienceRequired: '2-4 years',
      salaryRange: 'Commensurate with experience',
      description:
        'Design, code, and execute automated regression suites and high-concurrency API performance benchmarks for enterprise deliverables.',
      responsibilities: [
        'Build and maintain end-to-end automated testing suites using Cypress and Playwright.',
        'Design automated API test suites for Express / Node.js REST endpoints.',
        'Execute performance benchmarking and concurrency load tests using k6.',
        'Integrate automated tests into GitHub Actions CI pipelines.',
      ],
      requiredQualifications: ['Graduate degree in computer science or technical discipline.'],
      requiredSkills: [
        '2+ years in automated software quality assurance.',
        'Proficiency in JavaScript or Python test automation frameworks.',
        'Hands-on experience testing RESTful APIs and PostgreSQL databases.',
      ],
      preferredSkills: [
        'Experience with Jest, Supertest, or Cypress.',
        'Security testing and vulnerability scanning familiarity.',
      ],
      numberOfOpenings: 2,
      applicationDeadline: new Date('2026-12-01T23:59:59.000Z'),
      status: 'PUBLISHED',
      isFeatured: false,
    },
  ];

  for (const j of jobs) {
    await prisma.job.upsert({ where: { jobCode: j.jobCode }, update: j, create: j });
  }
  console.log(`[SEED] ✅ ${jobs.length} job postings ready`);
}

// ─── Runner ───────────────────────────────────────────────────────────────────
async function main() {
  if (process.env.SKIP_SEED === 'true') {
    console.log('[SEED] ⏭️ SKIP_SEED=true detected. Skipping database seed.');
    return;
  }

  console.log('\n══════════════════════════════════════════');
  console.log('  Nexora Technologies — Database Seed');
  console.log('══════════════════════════════════════════\n');

  await seedAdmin();
  await seedCompany();
  await seedServices();
  await seedJobs();

  console.log('\n══════════════════════════════════════════');
  console.log('  Seed completed successfully ✅');
  console.log('══════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('[SEED] ❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
