import { servicesRepository } from './services.repository.js';
import { AppError } from '../../core/errors/AppError.js';
import { parsePagination, formatPaginatedResult } from '../../core/utils/pagination.js';

export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class ServicesService {
  async getPublishedServices(query) {
    const { page, limit, skip } = parsePagination(query, { defaultLimit: 20 });
    const { items, totalCount } = await servicesRepository.findPublished({
      search: query.search?.trim(),
      category: query.category?.trim(),
      skip,
      limit,
    });

    return formatPaginatedResult(items, totalCount, page, limit);
  }

  async getPublishedServiceBySlug(slug) {
    const service = await servicesRepository.findBySlug(slug);
    if (!service || !service.isPublished) {
      throw AppError.notFound(`Service offering not found for slug '${slug}'.`);
    }
    return service;
  }

  async getAdminServices(query) {
    const { page, limit, skip } = parsePagination(query, { defaultLimit: 20 });
    let isPublished = undefined;
    if (query.isPublished === 'true') isPublished = true;
    if (query.isPublished === 'false') isPublished = false;

    const { items, totalCount } = await servicesRepository.findAllAdmin({
      search: query.search?.trim(),
      category: query.category?.trim(),
      isPublished,
      skip,
      limit,
    });

    return formatPaginatedResult(items, totalCount, page, limit);
  }

  async getServiceById(id) {
    const service = await servicesRepository.findById(id);
    if (!service) {
      throw AppError.notFound(`Service with ID '${id}' not found.`);
    }
    return service;
  }

  async createService(data) {
    const slug = data.slug ? slugify(data.slug) : slugify(data.title);
    const existing = await servicesRepository.findBySlug(slug);
    if (existing) {
      throw AppError.conflict(`A service with the slug '${slug}' already exists.`);
    }

    return await servicesRepository.create({
      ...data,
      slug,
    });
  }

  async updateService(id, data) {
    const service = await servicesRepository.findById(id);
    if (!service) {
      throw AppError.notFound(`Service with ID '${id}' not found.`);
    }

    if (data.slug && data.slug !== service.slug) {
      const slug = slugify(data.slug);
      const existing = await servicesRepository.findBySlug(slug);
      if (existing && existing.id !== id) {
        throw AppError.conflict(`A service with the slug '${slug}' already exists.`);
      }
      data.slug = slug;
    }

    return await servicesRepository.update(id, data);
  }

  async updateServiceStatus(id, isPublished) {
    const service = await servicesRepository.findById(id);
    if (!service) {
      throw AppError.notFound(`Service with ID '${id}' not found.`);
    }

    return await servicesRepository.updateStatus(id, isPublished);
  }

  async reorderServices(orders) {
    return await servicesRepository.reorder(orders);
  }

  async deleteService(id) {
    const service = await servicesRepository.findById(id);
    if (!service) {
      throw AppError.notFound(`Service with ID '${id}' not found.`);
    }

    return await servicesRepository.delete(id);
  }
}

export const servicesService = new ServicesService();
