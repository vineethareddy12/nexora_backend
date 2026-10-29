import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { validateStorageKey, validateImageSignature } from './validation.js';

export class LocalStorageProvider {
  constructor() {
    this.storageRoot = path.resolve(process.cwd(), env.LOCAL_STORAGE_DIR || './storage');
    this.logosDir = path.join(this.storageRoot, 'logos');
    this.companyLogosDir = path.join(this.logosDir, 'company');
  }

  /**
   * Initializes local storage directories.
   */
  async init() {
    try {
      await fs.mkdir(this.companyLogosDir, { recursive: true });
    } catch (err) {
      console.error('[LocalStorageProvider] Failed to create storage directories:', err);
      throw err;
    }
  }

  /**
   * Resolves a storage key to an absolute filesystem path safely,
   * guaranteeing that the resolved path stays strictly within the logos directory.
   */
  resolvePath(storageKey) {
    validateStorageKey(storageKey);

    // Remove leading 'logos/' from storageKey if resolving from logosDir
    const relativePart = storageKey.startsWith('logos/') ? storageKey.slice(6) : storageKey;
    const absolutePath = path.resolve(this.logosDir, relativePart);

    // Path traversal guard
    if (!absolutePath.startsWith(this.logosDir)) {
      throw new AppError('Access denied: attempted path traversal', 403);
    }

    return absolutePath;
  }

  /**
   * Generates a restricted local upload URL and instructions for direct frontend upload.
   */
  async generateUploadUrl(uploadId, storageKey, contentType, size, expiresInSeconds = 900) {
    validateStorageKey(storageKey);

    // Returns the restricted local upload endpoint
    const uploadUrl = `/api/v1/company/logo/local-upload/${uploadId}`;

    return {
      uploadUrl,
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Saves the direct upload bytes sent by the frontend via the restricted local endpoint.
   */
  async saveDirectUpload(storageKey, buffer, expectedContentType) {
    const filePath = this.resolvePath(storageKey);

    // Verify binary image signature before writing
    validateImageSignature(buffer, expectedContentType);

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write file
    await fs.writeFile(filePath, buffer);

    return {
      storageKey,
      size: buffer.length,
      contentType: expectedContentType,
    };
  }

  /**
   * Verifies that the uploaded object exists on the filesystem and has valid content.
   */
  async verifyObject(storageKey, expectedSize, expectedContentType) {
    const filePath = this.resolvePath(storageKey);

    if (!fsSync.existsSync(filePath)) {
      throw new AppError(`Uploaded object not found in local storage: ${storageKey}`, 404);
    }

    const stat = await fs.stat(filePath);
    if (stat.size <= 0) {
      throw new AppError('Uploaded object is empty', 400);
    }

    // Verify file header signature
    const handle = await fs.open(filePath, 'r');
    try {
      const headerBuf = Buffer.alloc(16);
      await handle.read(headerBuf, 0, 16, 0);
      validateImageSignature(headerBuf, expectedContentType);
    } finally {
      await handle.close();
    }

    return {
      exists: true,
      size: stat.size,
      storageKey,
    };
  }

  /**
   * Returns a controlled local image retrieval URL.
   */
  async getDisplayUrl(storageKey) {
    validateStorageKey(storageKey);
    return `/api/v1/company/logo/content?key=${encodeURIComponent(storageKey)}`;
  }

  /**
   * Deletes an obsolete logo file safely from local storage.
   */
  async deleteObject(storageKey) {
    try {
      const filePath = this.resolvePath(storageKey);
      if (fsSync.existsSync(filePath)) {
        await fs.unlink(filePath);
        console.log(`[LocalStorageProvider] Deleted obsolete object: ${storageKey}`);
      }
    } catch (err) {
      console.warn(`[LocalStorageProvider] Failed to delete object ${storageKey}:`, err.message);
    }
  }

  /**
   * Writes an initial buffer directly (used for migration of legacy logo).
   */
  async saveInitialBuffer(storageKey, buffer) {
    const filePath = this.resolvePath(storageKey);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    return filePath;
  }

  /**
   * Reads the raw buffer of a stored logo file (for serving).
   */
  async readObject(storageKey) {
    const filePath = this.resolvePath(storageKey);
    if (!fsSync.existsSync(filePath)) {
      throw new AppError('Logo file not found', 404);
    }
    const stat = await fs.stat(filePath);
    const buffer = await fs.readFile(filePath);

    // Determine mime from extension
    const ext = path.extname(filePath).toLowerCase();
    let mime = 'application/octet-stream';
    if (ext === '.png') mime = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
    else if (ext === '.webp') mime = 'image/webp';

    return {
      buffer,
      size: stat.size,
      contentType: mime,
    };
  }
}

