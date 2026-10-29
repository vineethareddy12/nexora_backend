import { prisma } from '../../core/database/prisma.js';

export const documentsRepository = {
  /**
   * Finds documents belonging to a user, with optional type filter.
   * By default returns only non-deleted, non-archived documents.
   */
  async findUserDocuments(userId, { type, includeArchived = false } = {}) {
    const where = {
      userId,
      deletedAt: null,
    };

    if (!includeArchived) {
      where.isArchived = false;
    }

    if (type) {
      where.type = type;
    }

    return prisma.applicantDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        originalFilename: true,
        mimeType: true,
        fileSizeBytes: true,
        checksumSha256: true,
        isArchived: true,
        applicationCount: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Finds a document by ID with optional strict ownership check.
   */
  async findDocumentById(id, userId = null) {
    const where = { id };
    if (userId) {
      where.userId = userId;
    }

    return prisma.applicantDocument.findFirst({
      where,
    });
  },

  /**
   * Finds an active (not soft-deleted) document by ID and userId.
   */
  async findActiveDocumentById(id, userId) {
    return prisma.applicantDocument.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });
  },

  /**
   * Creates a new applicant document record.
   */
  async createDocument(data) {
    return prisma.applicantDocument.create({
      data,
    });
  },

  /**
   * Updates an existing document record.
   */
  async updateDocument(id, data) {
    return prisma.applicantDocument.update({
      where: { id },
      data,
    });
  },

  /**
   * Soft-deletes / archives a document (for historical application preservation).
   */
  async softDeleteDocument(id) {
    return prisma.applicantDocument.update({
      where: { id },
      data: {
        isArchived: true,
        deletedAt: new Date(),
      },
    });
  },

  /**
   * Hard-deletes a document record from the database.
   */
  async hardDeleteDocument(id) {
    return prisma.applicantDocument.delete({
      where: { id },
    });
  },
};
