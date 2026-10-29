import { documentsRepository } from './documents.repository.js';
import { storageService } from '../../core/storage/index.js';
import { AppError } from '../../core/errors/AppError.js';

export const documentsService = {
  /**
   * Retrieves list of active documents for the authenticated applicant.
   */
  async getDocuments(userId, query = {}) {
    return documentsRepository.findUserDocuments(userId, query);
  },

  /**
   * Retrieves metadata of a single document with strict ownership or admin check.
   */
  async getDocumentById(id, userId, userRole = 'APPLICANT') {
    const doc = await documentsRepository.findDocumentById(id);

    if (!doc) {
      throw AppError.notFound('Document not found');
    }

    if (userRole !== 'ADMIN' && doc.userId !== userId) {
      // Prevent IDOR by returning 404 instead of revealing existence
      throw AppError.notFound('Document not found');
    }

    return {
      id: doc.id,
      type: doc.type,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      fileSizeBytes: doc.fileSizeBytes,
      checksumSha256: doc.checksumSha256,
      isArchived: doc.isArchived,
      applicationCount: doc.applicationCount,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },

  /**
   * Uploads a new document for the authenticated applicant.
   */
  async uploadDocument({ userId, file, type, description }) {
    if (!file || !file.buffer) {
      throw AppError.badRequest('Document file is required');
    }

    let storedFile = null;

    try {
      // 1. Save to private storage (validates extensions, MIME, and binary magic bytes)
      storedFile = await storageService.saveApplicantDocument({
        userId,
        filename: file.originalname,
        buffer: file.buffer,
        mimeType: file.mimetype,
        size: file.size,
      });

      // 2. Persist metadata in database
      const document = await documentsRepository.createDocument({
        userId,
        type,
        originalFilename: storedFile.originalFilename,
        storageKey: storedFile.storageKey,
        mimeType: storedFile.mimeType,
        fileSizeBytes: storedFile.fileSizeBytes,
        checksumSha256: storedFile.checksumSha256,
        metadata: description ? { description } : undefined,
      });

      return {
        id: document.id,
        type: document.type,
        originalFilename: document.originalFilename,
        mimeType: document.mimeType,
        fileSizeBytes: document.fileSizeBytes,
        checksumSha256: document.checksumSha256,
        isArchived: document.isArchived,
        applicationCount: document.applicationCount,
        metadata: document.metadata,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      };
    } catch (err) {
      // Cleanup orphaned file from storage if DB insert fails
      if (storedFile?.storageKey) {
        await storageService.deleteDocumentFile(storedFile.storageKey);
      }
      throw err;
    }
  },

  /**
   * Replaces an existing document.
   * If the document has been referenced by submitted applications, the old file
   * is strictly preserved and archived, and a new active document version is created.
   * If not referenced, the old storage file is cleaned up and replaced in-place.
   */
  async replaceDocument({ id, userId, file, type }) {
    if (!file || !file.buffer) {
      throw AppError.badRequest('Replacement document file is required');
    }

    const existing = await documentsRepository.findActiveDocumentById(id, userId);
    if (!existing) {
      throw AppError.notFound('Document not found or access denied');
    }

    const docType = type || existing.type;
    let storedFile = null;

    try {
      // Save new file to storage
      storedFile = await storageService.saveApplicantDocument({
        userId,
        filename: file.originalname,
        buffer: file.buffer,
        mimeType: file.mimetype,
        size: file.size,
      });

      if (existing.applicationCount > 0) {
        // Historical preservation: archive old document and create new active document
        await documentsRepository.softDeleteDocument(existing.id);

        const newDoc = await documentsRepository.createDocument({
          userId,
          type: docType,
          originalFilename: storedFile.originalFilename,
          storageKey: storedFile.storageKey,
          mimeType: storedFile.mimeType,
          fileSizeBytes: storedFile.fileSizeBytes,
          checksumSha256: storedFile.checksumSha256,
          metadata: {
            replacedDocumentId: existing.id,
            replacedAt: new Date().toISOString(),
          },
        });

        return {
          id: newDoc.id,
          type: newDoc.type,
          originalFilename: newDoc.originalFilename,
          mimeType: newDoc.mimeType,
          fileSizeBytes: newDoc.fileSizeBytes,
          checksumSha256: newDoc.checksumSha256,
          isArchived: newDoc.isArchived,
          createdAt: newDoc.createdAt,
          updatedAt: newDoc.updatedAt,
          preservedHistoricalVersion: true,
        };
      }

      // No submitted application references this file: safe in-place replacement
      const oldStorageKey = existing.storageKey;

      const updated = await documentsRepository.updateDocument(existing.id, {
        type: docType,
        originalFilename: storedFile.originalFilename,
        storageKey: storedFile.storageKey,
        mimeType: storedFile.mimeType,
        fileSizeBytes: storedFile.fileSizeBytes,
        checksumSha256: storedFile.checksumSha256,
      });

      // Safely delete obsolete unreferenced file
      await storageService.deleteDocumentFile(oldStorageKey);

      return {
        id: updated.id,
        type: updated.type,
        originalFilename: updated.originalFilename,
        mimeType: updated.mimeType,
        fileSizeBytes: updated.fileSizeBytes,
        checksumSha256: updated.checksumSha256,
        isArchived: updated.isArchived,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } catch (err) {
      if (storedFile?.storageKey) {
        await storageService.deleteDocumentFile(storedFile.storageKey);
      }
      throw err;
    }
  },

  /**
   * Deletes a document.
   * If referenced by submitted applications, it is soft-deleted/archived
   * so historical applications can still retrieve the file.
   * If unreferenced, the database record and storage file are completely removed.
   */
  async deleteDocument({ id, userId }) {
    const existing = await documentsRepository.findActiveDocumentById(id, userId);
    if (!existing) {
      throw AppError.notFound('Document not found or access denied');
    }

    if (existing.applicationCount > 0) {
      // Historical preservation: soft-delete only
      await documentsRepository.softDeleteDocument(existing.id);
      return {
        deleted: true,
        archived: true,
        message: 'Document removed from active documents and preserved for historical applications.',
      };
    }

    // Unreferenced: full cleanup
    await documentsRepository.hardDeleteDocument(existing.id);
    await storageService.deleteDocumentFile(existing.storageKey);

    return {
      deleted: true,
      archived: false,
      message: 'Document deleted successfully.',
    };
  },

  /**
   * Authorizes and retrieves the file for download.
   */
  async downloadDocument({ id, userId, userRole = 'APPLICANT' }) {
    const doc = await documentsRepository.findDocumentById(id);
    if (!doc) {
      throw AppError.notFound('Document not found');
    }

    // IDOR check: only owner or admin can download
    if (userRole !== 'ADMIN' && doc.userId !== userId) {
      throw AppError.notFound('Document not found');
    }

    const download = await storageService.getDocumentDownload(doc.storageKey);

    return {
      download,
      document: {
        id: doc.id,
        originalFilename: doc.originalFilename,
        mimeType: doc.mimeType,
        fileSizeBytes: doc.fileSizeBytes,
      },
    };
  },
};

