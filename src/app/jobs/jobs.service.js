import { jobsRepository } from './jobs.repository.js';
import { AppError } from '../../core/errors/AppError.js';
import { parsePagination, formatPaginatedResult } from '../../core/utils/pagination.js';

export class JobsService {
  async getPublishedJobs(query) {
    const { page, limit, skip } = parsePagination(query, { defaultLimit: 20 });
    const { items, totalCount } = await jobsRepository.findPublished({
      search: query.search?.trim(),
      department: query.department?.trim(),
      employmentType: query.employmentType,
      workMode: query.workMode,
      location: query.location?.trim(),
      skip,
      limit,
    });

    return formatPaginatedResult(items, totalCount, page, limit);
  }

  async getPublishedJobDetails(idOrCode) {
    const job = await jobsRepository.findPublishedByIdOrCode(idOrCode);
    if (!job) {
      throw AppError.notFound(`Job vacancy '${idOrCode}' not found or no longer active.`);
    }

    return job;
  }

  async getAdminJobs(query) {
    const { page, limit, skip } = parsePagination(query, { defaultLimit: 20 });
    const { items, totalCount } = await jobsRepository.findAllAdmin({
      search: query.search?.trim(),
      status: query.status,
      department: query.department?.trim(),
      employmentType: query.employmentType,
      workMode: query.workMode,
      location: query.location?.trim(),
      skip,
      limit,
    });

    return formatPaginatedResult(items, totalCount, page, limit);
  }

  async getJobById(id) {
    const job = await jobsRepository.findById(id);
    if (!job) {
      throw AppError.notFound(`Job record with ID '${id}' not found.`);
    }
    return job;
  }

  async createJob(data) {
    // Generate unique job code if not supplied
    let jobCode = data.jobCode?.trim();
    if (!jobCode) {
      const count = (await jobsRepository.countTotal()) + 1;
      const deptPrefix = data.department ? data.department.substring(0, 3).toUpperCase() : 'GEN';
      jobCode = `NEX-${deptPrefix}-${String(count).padStart(3, '0')}`;
    }

    const existing = await jobsRepository.findByCode(jobCode);
    if (existing) {
      throw AppError.conflict(`A job posting with reference code '${jobCode}' already exists.`);
    }

    const payload = {
      ...data,
      jobCode,
      applicationDeadline: data.applicationDeadline ? new Date(data.applicationDeadline) : null,
      publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
    };

    return await jobsRepository.create(payload);
  }

  async updateJob(id, data) {
    const existing = await jobsRepository.findById(id);
    if (!existing) {
      throw AppError.notFound(`Job with ID '${id}' not found.`);
    }

    if (data.jobCode && data.jobCode !== existing.jobCode) {
      const codeCheck = await jobsRepository.findByCode(data.jobCode);
      if (codeCheck && codeCheck.id !== id) {
        throw AppError.conflict(`Job code '${data.jobCode}' is already assigned to another opening.`);
      }
    }

    const payload = { ...data };
    if (data.applicationDeadline !== undefined) {
      payload.applicationDeadline = data.applicationDeadline ? new Date(data.applicationDeadline) : null;
    }

    return await jobsRepository.update(id, payload);
  }

  async updateJobStatus(id, status) {
    const existing = await jobsRepository.findById(id);
    if (!existing) {
      throw AppError.notFound(`Job with ID '${id}' not found.`);
    }

    const publishedAt = status === 'PUBLISHED' && !existing.publishedAt ? new Date() : undefined;
    return await jobsRepository.updateStatus(id, status, publishedAt);
  }

  async deleteJob(id) {
    const existing = await jobsRepository.findById(id);
    if (!existing) {
      throw AppError.notFound(`Job with ID '${id}' not found.`);
    }

    return await jobsRepository.delete(id);
  }
}

export const jobsService = new JobsService();
