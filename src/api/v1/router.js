
import { Router } from 'express';

import authRoutes from '../../app/auth/auth.routes.js';
import profileRoutes from '../../app/applicant-profile/profile.routes.js';
import documentRoutes from '../../app/documents/documents.routes.js';
import { applicantApplicationsRouter } from '../../app/applications/applications.routes.js';
import healthRoutes from '../../app/health/health.routes.js';

import {
    publicCompanyRouter,
    adminCompanyRouter,
} from '../../app/company/company.routes.js';

import {
    publicServicesRouter,
    adminServicesRouter,
} from '../../app/services/services.routes.js';

import {
    publicJobsRouter,
    adminJobsRouter,
} from '../../app/jobs/jobs.routes.js';

import {
    publicEnquiriesRouter,
    adminEnquiriesRouter,
} from '../../app/enquiries/enquiries.routes.js';

const apiV1Router = Router();

// Health checks
apiV1Router.use('/health', healthRoutes);

// Authentication: registration, login, refresh, password reset, etc.
apiV1Router.use('/auth', authRoutes);

// Applicant profile management
apiV1Router.use('/me/profile', profileRoutes);

// Applicant documents vault (Resumes & Certificates - Phase 1)
apiV1Router.use('/me/documents', documentRoutes);

// Applicant job applications lifecycle (Phase 2)
apiV1Router.use('/me/applications', applicantApplicationsRouter);

// Public company information and protected admin management
apiV1Router.use('/company', publicCompanyRouter);
apiV1Router.use('/admin/company', adminCompanyRouter);

// Public services and protected admin CMS
apiV1Router.use('/services', publicServicesRouter);
apiV1Router.use('/admin/services', adminServicesRouter);

// Public job listings and protected admin job management
apiV1Router.use('/jobs', publicJobsRouter);
apiV1Router.use('/admin/jobs', adminJobsRouter);

// Public contact form and protected enquiry management
apiV1Router.use('/enquiries', publicEnquiriesRouter);
apiV1Router.use('/admin/enquiries', adminEnquiriesRouter);

export default apiV1Router;
