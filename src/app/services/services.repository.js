import { prisma } from '../../core/database/prisma.js';

export class ServicesRepository {
  async findPublished({ search, category, skip, limit }) {
    const where = {
      isPublished: true,
      ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { shortDescription: { contains: search, mode: 'insensitive' } },
              { capabilities: { has: search } },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.service.count({ where }),
    ]);

    return { items, totalCount };
  }

  async findBySlug(slug) {
    return await prisma.service.findUnique({
      where: { slug },
    });
  }

  async findById(id) {
    return await prisma.service.findUnique({
      where: { id },
    });
  }

  async findAllAdmin({ search, category, isPublished, skip, limit }) {
    const where = {
      ...(typeof isPublished === 'boolean' ? { isPublished } : {}),
      ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { shortDescription: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.service.count({ where }),
    ]);

    return { items, totalCount };
  }

  async create(data) {
    return await prisma.service.create({
      data,
    });
  }

  async update(id, data) {
    return await prisma.service.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id, isPublished) {
    return await prisma.service.update({
      where: { id },
      data: { isPublished },
    });
  }

  async reorder(orders) {
    return await prisma.$transaction(
      orders.map((item) =>
        prisma.service.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        })
      )
    );
  }

  async delete(id) {
    return await prisma.service.delete({
      where: { id },
    });
  }
}

export const servicesRepository = new ServicesRepository();
