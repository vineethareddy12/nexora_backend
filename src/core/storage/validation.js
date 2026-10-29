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

