import crypto from 'crypto';
import { AppError } from '../errors/AppError.js';

// Map of uploadId -> PendingUploadData
const pendingUploads = new Map();

/**
 * Creates and registers a short-lived pending upload state.
 */
export function createPendingUpload({ userId, storageKey, contentType, size, provider, expiresInSeconds = 900 }) {
  const uploadId = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + expiresInSeconds * 1000;

  const entry = {
    uploadId,
    userId,
    storageKey,
    contentType,
    size,
    provider,
    createdAt: now,
    expiresAt,
    consumed: false,
  };

  pendingUploads.set(uploadId, entry);
  return entry;
}

/**
 * Retrieves an active pending upload record.
 */
export function getPendingUpload(uploadId) {
  if (!uploadId || !pendingUploads.has(uploadId)) {
    throw new AppError('Pending upload record not found or has expired', 404);
  }

  const entry = pendingUploads.get(uploadId);
  if (Date.now() > entry.expiresAt) {
    pendingUploads.delete(uploadId);
    throw new AppError('Upload authorization has expired. Please initiate a new upload.', 410);
  }

  return entry;
}

/**
 * Validates and atomically consumes a pending upload record.
 * Ensures the upload cannot be confirmed more than once (anti-replay).
 */
export function consumePendingUpload(uploadId, requestingUserId) {
  const entry = getPendingUpload(uploadId);

  if (entry.consumed) {
    throw new AppError('This upload authorization has already been confirmed and consumed.', 409);
  }

  if (requestingUserId && entry.userId !== requestingUserId) {
    throw new AppError('Unauthorized: Upload authorization does not belong to the current user', 403);
  }

  entry.consumed = true;
  entry.consumedAt = Date.now();

  // Keep for 5 minutes after consumption to reject immediate re-use, then auto-delete
  setTimeout(() => {
    pendingUploads.delete(uploadId);
  }, 5 * 60 * 1000).unref?.();

  return entry;
}

/**
 * Periodic cleanup of expired pending uploads (runs every 5 minutes)
 */
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of pendingUploads.entries()) {
    if (now > entry.expiresAt + 5 * 60 * 1000) {
      pendingUploads.delete(id);
    }
  }
}, 5 * 60 * 1000).unref?.();

