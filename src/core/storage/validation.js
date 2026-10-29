import path from 'path';
import crypto from 'crypto';
import { AppError } from '../errors/AppError.js';

export const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const MIME_TO_EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

/**
 * Validates filename, content type, and file size before issuing an upload URL.
 */
export function validateFileMetadata({ filename, contentType, size }) {
  if (!filename || typeof filename !== 'string') {
    throw new AppError('Filename is required and must be a valid string', 400);
  }

  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new AppError(
      `Unsupported file extension "${ext}". Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
      400
    );
  }

  if (!contentType || typeof contentType !== 'string') {
    throw new AppError('ContentType is required', 400);
  }

  const normalizedContentType = contentType.toLowerCase().trim();
  if (!ALLOWED_MIME_TYPES.includes(normalizedContentType)) {
    throw new AppError(
      `Unsupported image type "${normalizedContentType}". Allowed MIME types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      400
    );
  }

  if (!size || typeof size !== 'number' || size <= 0) {
    throw new AppError('File size must be a positive number', 400);
  }

  if (size > MAX_FILE_SIZE_BYTES) {
    throw new AppError(
      `File size exceeds limit (${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB). Provided: ${(size / 1024 / 1024).toFixed(2)}MB`,
      400
    );
  }

  // Determine canonical extension based on validated MIME
  const canonicalExt = MIME_TO_EXT[normalizedContentType] || ext;

  return {
    valid: true,
    contentType: normalizedContentType,
    extension: canonicalExt,
    size,
  };
}

/**
 * Validates actual binary signature (magic numbers) of the image buffer.
 * Rejects corrupt images, spoofed extensions, and SVG files.
 */
export function validateImageSignature(buffer, expectedMime) {
  if (!buffer || buffer.length < 12) {
    throw new AppError('Invalid image data: file is empty or truncated', 400);
  }

  const headerHex = buffer.slice(0, 12).toString('hex').toLowerCase();

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng = headerHex.startsWith('89504e470d0a1a0a');

  // JPEG: FF D8 FF
  const isJpeg = headerHex.startsWith('ffd8ff');

  // WebP: RIFF (52 49 46 46) ... WEBP (57 45 42 50 at offset 8)
  const isWebp =
    headerHex.startsWith('52494646') &&
    buffer.slice(8, 12).toString('ascii').toUpperCase() === 'WEBP';

  let detectedMime = null;
  if (isPng) detectedMime = 'image/png';
  else if (isJpeg) detectedMime = 'image/jpeg';
  else if (isWebp) detectedMime = 'image/webp';

  if (!detectedMime) {
    throw new AppError('File signature does not match any allowed image format (PNG, JPEG, WebP)', 400);
  }

  if (expectedMime && detectedMime !== expectedMime.toLowerCase()) {
    throw new AppError(
      `Image content (${detectedMime}) does not match declared MIME type (${expectedMime})`,
      400
    );
  }

  return detectedMime;
}

/**
 * Validates that an object key follows the strict company logo path convention
 * and does not contain path traversal characters (..).
 */
export function validateStorageKey(key) {
  if (!key || typeof key !== 'string') {
    throw new AppError('Invalid storage key: must be a non-empty string', 400);
  }

  // Prevent path traversal and backslashes
  if (key.includes('..') || key.includes('\\')) {
    throw new AppError('Invalid storage key: path traversal detected', 400);
  }

  // Enforce expected prefix and filename pattern
  const validPattern = /^logos\/company\/[a-zA-Z0-9_\-]+\.(png|jpg|jpeg|webp)$/;
  if (!validPattern.test(key)) {
    throw new AppError('Invalid storage key: key does not match allowed company logo pattern', 400);
  }

  return key;
}

/**
 * Generates a unique, server-controlled storage key for a new company logo.
 */
export function generateStorageKey(extension) {
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  const uniqueId = crypto.randomUUID();
  return `logos/company/${uniqueId}${ext}`;
}

// ==========================================
// Document Management Validation (Phase 1)
// ==========================================

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

export const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
export const MAX_DOCUMENT_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const DOC_MIME_TO_EXT = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

/**
 * Validates document metadata and returns canonical extension & mime.
 */
export function validateDocumentMetadata({ filename, mimeType, size }) {
  if (!filename || typeof filename !== 'string') {
    throw new AppError('Filename is required and must be a valid string', 400);
  }

  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)) {
    throw new AppError(
      `Unsupported file extension "${ext}". Allowed document extensions: ${ALLOWED_DOCUMENT_EXTENSIONS.join(', ')}`,
      400
    );
  }

  if (!mimeType || typeof mimeType !== 'string') {
    throw new AppError('MIME type is required', 400);
  }

  const normalizedMime = mimeType.toLowerCase().trim();
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(normalizedMime)) {
    throw new AppError(
      `Unsupported document MIME type "${normalizedMime}". Allowed types: ${ALLOWED_DOCUMENT_MIME_TYPES.join(', ')}`,
      400
    );
  }

  if (!size || typeof size !== 'number' || size <= 0) {
    throw new AppError('File size must be a positive number', 400);
  }

  if (size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
    throw new AppError(
      `File size exceeds limit (${Math.round(MAX_DOCUMENT_FILE_SIZE_BYTES / 1024 / 1024)}MB). Provided: ${(size / 1024 / 1024).toFixed(2)}MB`,
      400
    );
  }

  const canonicalExt = DOC_MIME_TO_EXT[normalizedMime] || ext;

  return {
    valid: true,
    mimeType: normalizedMime,
    extension: canonicalExt,
    size,
  };
}

/**
 * Validates actual binary signature (magic numbers) of uploaded documents.
 * Protects against extension spoofing (e.g. executable disguised as PDF).
 */
export function validateDocumentSignature(buffer, expectedMime) {
  if (!buffer || buffer.length < 4) {
    throw new AppError('Invalid document data: file is empty or truncated', 400);
  }

  // PDF: %PDF- (hex: 25 50 44 46)
  const isPdf = buffer.slice(0, 5).toString('ascii').startsWith('%PDF-') ||
                buffer.slice(0, 4).toString('hex').toLowerCase() === '25504446';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng = buffer.length >= 8 && buffer.slice(0, 8).toString('hex').toLowerCase() === '89504e470d0a1a0a';

  // JPEG: FF D8 FF
  const isJpeg = buffer.length >= 3 && buffer.slice(0, 3).toString('hex').toLowerCase() === 'ffd8ff';

  let detectedMime = null;
  if (isPdf) detectedMime = 'application/pdf';
  else if (isPng) detectedMime = 'image/png';
  else if (isJpeg) detectedMime = 'image/jpeg';

  if (!detectedMime) {
    throw new AppError('File binary signature does not match allowed formats (PDF, PNG, JPEG)', 400);
  }

  if (expectedMime && detectedMime !== expectedMime.toLowerCase()) {
    throw new AppError(
      `Document content signature (${detectedMime}) does not match declared MIME type (${expectedMime})`,
      400
    );
  }

  return detectedMime;
}

/**
 * Validates that a document storage key stays within the documents path convention.
 */
export function validateDocumentStorageKey(key) {
  if (!key || typeof key !== 'string') {
    throw new AppError('Invalid storage key: must be a non-empty string', 400);
  }

  if (key.includes('..') || key.includes('\\')) {
    throw new AppError('Invalid storage key: path traversal detected', 400);
  }

  const validPattern = /^documents\/[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-]+\.(pdf|jpg|jpeg|png)$/;
  if (!validPattern.test(key)) {
    throw new AppError('Invalid storage key: key does not match allowed document path pattern', 400);
  }

  return key;
}

/**
 * Generates a unique, server-controlled storage key for an applicant document.
 */
export function generateDocumentStorageKey(userId, extension) {
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  const uniqueId = crypto.randomUUID();
  return `documents/${userId}/${uniqueId}${ext}`;
}


