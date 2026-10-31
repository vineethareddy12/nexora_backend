import { prisma } from '../../core/database/prisma.js';

export const offersRepository = {
  /**
   * Aggregates live offer statistics for Dashboard
   */
  async getDashboardMetrics() {
    const statusCounts = await prisma.jobOffer.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const summary = {
      total: 0,
      draft: 0,
      issued: 0,
      accepted: 0,
      declined: 0,
      expired: 0,
      withdrawn: 0,
    };

    for (const item of statusCounts) {
      const count = item._count.id;
      summary.total += count;
      if (item.status === 'DRAFT') summary.draft += count;
      if (item.status === 'ISSUED') summary.issued += count;
      if (item.status === 'ACCEPTED') summary.accepted += count;
      if (item.status === 'DECLINED') summary.declined += count;
      if (item.status === 'EXPIRED') summary.expired += count;
      if (item.status === 'WITHDRAWN') summary.withdrawn += count;
    }

    return summary;
  },

  /**
   * Finds offers with filters & pagination
   */
  async findOffers({
    page = 1,
    limit = 10,
    search,
    status,
    jobId,
    applicantId,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (applicantId) {
      where.applicantId = applicantId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (jobId && jobId !== 'ALL') {
      where.jobId = jobId;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { offerCode: { contains: term, mode: 'insensitive' } },
        { designation: { contains: term, mode: 'insensitive' } },
        { applicant: { fullName: { contains: term, mode: 'insensitive' } } },
        { applicant: { email: { contains: term, mode: 'insensitive' } } },
        { job: { title: { contains: term, mode: 'insensitive' } } },
        { application: { referenceNumber: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [offers, total] = await Promise.all([
      prisma.jobOffer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          applicant: {
            select: { id: true, fullName: true, email: true, profile: { select: { phone: true, currentLocation: true } } },
          },
          job: {
            select: { id: true, title: true, department: true, location: true },
          },
          application: {
            select: { id: true, referenceNumber: true, status: true },
          },
        },
      }),
      prisma.jobOffer.count({ where }),
    ]);

    return {
      offers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Finds offer by ID with relations
   */
  async findById(id) {
    return prisma.jobOffer.findUnique({
      where: { id },
      include: {
        applicant: {
          select: { id: true, fullName: true, email: true, profile: true },
        },
        job: true,
        application: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        statusHistory: {
          include: {
            changedBy: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  },

  /**
   * Creates draft offer and logs status history
   */
  async createOffer(data, offerCode, adminId) {
    return prisma.$transaction(async (tx) => {
      const offer = await tx.jobOffer.create({
        data: {
          offerCode,
          applicationId: data.applicationId,
          applicantId: data.applicantId,
          jobId: data.jobId,
          createdById: adminId,
          designation: data.designation,
          employmentType: data.employmentType || 'FULL_TIME',
          salary: data.salary || null,
          currency: data.currency || 'INR',
          joiningDate: new Date(data.joiningDate),
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          termsAndConditions: data.termsAndConditions || null,
          responseNotes: data.notes || null,
          status: 'DRAFT',
        },
        include: {
          applicant: { select: { id: true, fullName: true, email: true } },
          job: { select: { id: true, title: true } },
          application: { select: { id: true, referenceNumber: true } },
        },
      });

      await tx.offerStatusHistory.create({
        data: {
          offerId: offer.id,
          changedById: adminId,
          previousStatus: 'DRAFT',
          newStatus: 'DRAFT',
          remarks: 'Draft offer letter prepared by recruitment team.',
        },
      });

      return offer;
    });
  },

  /**
   * Updates draft offer details
   */
  async updateOffer(id, data, adminId) {
    return prisma.jobOffer.update({
      where: { id },
      data: {
        ...(data.designation && { designation: data.designation }),
        ...(data.employmentType && { employmentType: data.employmentType }),
        ...(data.salary !== undefined && { salary: data.salary }),
        ...(data.currency && { currency: data.currency }),
        ...(data.joiningDate && { joiningDate: new Date(data.joiningDate) }),
        ...(data.expiryDate !== undefined && { expiryDate: data.expiryDate ? new Date(data.expiryDate) : null }),
        ...(data.termsAndConditions !== undefined && { termsAndConditions: data.termsAndConditions }),
        ...(data.notes !== undefined && { responseNotes: data.notes }),
        updatedAt: new Date(),
      },
      include: {
        applicant: { select: { id: true, fullName: true, email: true } },
        job: { select: { id: true, title: true } },
      },
    });
  },

  /**
   * Issues offer to applicant and logs transition
   */
  async issueOffer(id, adminId) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.jobOffer.findUnique({ where: { id } });
      if (!existing) return null;

      const updated = await tx.jobOffer.update({
        where: { id },
        data: {
          status: 'ISSUED',
          issuedAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          applicant: { select: { id: true, fullName: true, email: true } },
          job: { select: { id: true, title: true } },
          application: { select: { id: true, referenceNumber: true } },
        },
      });

      await tx.offerStatusHistory.create({
        data: {
          offerId: id,
          changedById: adminId,
          previousStatus: existing.status,
          newStatus: 'ISSUED',
          remarks: 'Offer letter issued to applicant.',
        },
      });

      return updated;
    });
  },

  /**
   * Withdraws an offer
   */
  async withdrawOffer(id, reason, adminId) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.jobOffer.findUnique({ where: { id } });
      if (!existing) return null;

      const updated = await tx.jobOffer.update({
        where: { id },
        data: {
          status: 'WITHDRAWN',
          responseNotes: reason,
          updatedAt: new Date(),
        },
        include: {
          applicant: { select: { id: true, fullName: true, email: true } },
          job: { select: { id: true, title: true } },
        },
      });

      await tx.offerStatusHistory.create({
        data: {
          offerId: id,
          changedById: adminId,
          previousStatus: existing.status,
          newStatus: 'WITHDRAWN',
          remarks: `Offer withdrawn by recruitment admin: ${reason}`,
        },
      });

      return updated;
    });
  },

  /**
   * Applicant accepts or declines offer
   */
  async respondToOffer(id, decision, notes, applicantId) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.jobOffer.findUnique({ where: { id } });
      if (!existing) return null;

      const updated = await tx.jobOffer.update({
        where: { id },
        data: {
          status: decision,
          respondedAt: new Date(),
          responseNotes: notes || null,
          updatedAt: new Date(),
        },
        include: {
          applicant: { select: { id: true, fullName: true, email: true } },
          job: { select: { id: true, title: true } },
          application: { select: { id: true, referenceNumber: true } },
        },
      });

      await tx.offerStatusHistory.create({
        data: {
          offerId: id,
          changedById: applicantId,
          previousStatus: existing.status,
          newStatus: decision,
          remarks: notes ? `Applicant decision: ${decision}. Notes: ${notes}` : `Applicant decision: ${decision}.`,
        },
      });

      return updated;
    });
  },
};

