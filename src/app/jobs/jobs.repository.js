import { prisma } from '../../core/database/prisma.js';

export class JobsRepository {
  async findPublished({ search, department, employmentType, workMode, location, skip, limit }) {
    const where = {
      status: 'PUBLISHED',
      ...(department ? { department: { equals: department, mode: 'insensitive' } } : {}),
      ...(employmentType ? { employmentType } : {}),
      ...(workMode ? { workMode } : {}),
      ...(location ? { location: { contains: location, mode: 'insensitive' } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { department: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { jobCode: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    return { items, totalCount };
  }

  async findPublishedByIdOrCode(idOrCode) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);
    return await prisma.job.findFirst({
      where: {
        status: 'PUBLISHED',
        OR: [
          ...(isUuid ? [{ id: idOrCode }] : []),
          { jobCode: idOrCode },
        ],
      },
    });
  }

  async findByIdOrCode(idOrCode) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);
    return await prisma.job.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ id: idOrCode }] : []),
          { jobCode: idOrCode },
        ],
      },
    });
  }

  async findAllAdmin({ search, status, department, employmentType, workMode, location, skip, limit }) {
    const where = {
      ...(status ? { status } : {}),
      ...(department ? { department: { equals: department, mode: 'insensitive' } } : {}),
      ...(employmentType ? { employmentType } : {}),
      ...(workMode ? { workMode } : {}),
      ...(location ? { location: { contains: location, mode: 'insensitive' } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { department: { contains: search, mode: 'insensitive' } },
              { jobCode: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    return { items, totalCount };
  }

  async findByCode(jobCode) {
    return await prisma.job.findUnique({
      where: { jobCode },
    });
  }

  async findById(id) {
    return await prisma.job.findUnique({
      where: { id },
    });
  }

  async countTotal() {
    return await prisma.job.count();
  }

  async create(data) {
    return await prisma.job.create({
      data,
    });
  }

  async update(id, data) {
    return await prisma.job.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id, status, publishedAt = undefined) {
    const data = { status };
    if (status === 'PUBLISHED' && publishedAt !== undefined) {
      data.publishedAt = publishedAt;
    }
    return await prisma.job.update({
      where: { id },
      data,
    });
  }

  async delete(id) {
    return await prisma.job.delete({
      where: { id },
    });
  }
}

export const jobsRepository = new JobsRepository();
