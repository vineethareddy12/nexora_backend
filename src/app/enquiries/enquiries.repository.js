import { prisma } from '../../core/database/prisma.js';

export class EnquiriesRepository {
  async create(data) {
    return await prisma.contactEnquiry.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject,
        message: data.message,
        status: 'NEW',
      },
    });
  }

  async findAllAdmin({ search, status, fromDate, toDate, skip, limit }) {
    const where = {
      ...(status ? { status } : {}),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: new Date(fromDate) } : {}),
              ...(toDate ? { lte: new Date(toDate) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { subject: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await Promise.all([
      prisma.contactEnquiry.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.contactEnquiry.count({ where }),
    ]);

    return { items, totalCount };
  }

  async findById(id) {
    return await prisma.contactEnquiry.findUnique({
      where: { id },
    });
  }

  async updateStatus(id, status, adminNotes = undefined) {
    const data = { status };
    if (adminNotes !== undefined) {
      data.adminNotes = adminNotes;
    }
    return await prisma.contactEnquiry.update({
      where: { id },
      data,
    });
  }

  async updateNotes(id, adminNotes) {
    return await prisma.contactEnquiry.update({
      where: { id },
      data: { adminNotes },
    });
  }

  async delete(id) {
    return await prisma.contactEnquiry.delete({
      where: { id },
    });
  }
}

export const enquiriesRepository = new EnquiriesRepository();
