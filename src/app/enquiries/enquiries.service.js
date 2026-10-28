import { enquiriesRepository } from './enquiries.repository.js';
import { AppError } from '../../core/errors/AppError.js';
import { parsePagination, formatPaginatedResult } from '../../core/utils/pagination.js';

export class EnquiriesService {
  async submitEnquiry(data) {
    const payload = {
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone ? data.phone.trim() : null,
      subject: data.subject.trim(),
      message: data.message.trim(),
    };

    const enquiry = await enquiriesRepository.create(payload);

    return {
      id: enquiry.id,
      message: 'Thank you for reaching out. Your enquiry has been received and our corporate team will contact you shortly.',
    };
  }

  async getAdminEnquiries(query) {
    const { page, limit, skip } = parsePagination(query, { defaultLimit: 20 });
    const { items, totalCount } = await enquiriesRepository.findAllAdmin({
      search: query.search?.trim(),
      status: query.status,
      fromDate: query.fromDate,
      toDate: query.toDate,
      skip,
      limit,
    });

    return formatPaginatedResult(items, totalCount, page, limit);
  }

  async getEnquiryById(id) {
    const enquiry = await enquiriesRepository.findById(id);
    if (!enquiry) {
      throw AppError.notFound(`Enquiry with ID '${id}' not found.`);
    }
    return enquiry;
  }

  async updateEnquiryStatus(id, status, adminNotes) {
    const enquiry = await enquiriesRepository.findById(id);
    if (!enquiry) {
      throw AppError.notFound(`Enquiry with ID '${id}' not found.`);
    }

    return await enquiriesRepository.updateStatus(id, status, adminNotes);
  }

  async updateEnquiryNotes(id, adminNotes) {
    const enquiry = await enquiriesRepository.findById(id);
    if (!enquiry) {
      throw AppError.notFound(`Enquiry with ID '${id}' not found.`);
    }

    return await enquiriesRepository.updateNotes(id, adminNotes);
  }

  async deleteEnquiry(id) {
    const enquiry = await enquiriesRepository.findById(id);
    if (!enquiry) {
      throw AppError.notFound(`Enquiry with ID '${id}' not found.`);
    }

    return await enquiriesRepository.delete(id);
  }
}

export const enquiriesService = new EnquiriesService();
