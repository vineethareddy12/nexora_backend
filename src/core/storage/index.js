import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { LocalStorageProvider } from './local.storage.js';
import { SupabaseStorageProvider } from './supabase.storage.js';
import {
  validateFileMetadata,
  validateStorageKey,
  generateStorageKey,
  validateImageSignature,
} from './validation.js';
import {
  createPendingUpload,
  getPendingUpload,
  consumePendingUpload,
} from './pendingUploads.js';

class StorageService {
  constructor() {
    this.providerName = env.STORAGE_PROVIDER || 'local';

    if (this.providerName === 'supabase') {
      this.provider = new SupabaseStorageProvider();
    } else if (this.providerName === 'local') {
      this.provider = new LocalStorageProvider();
    } else {
      throw new AppError(
        `Invalid STORAGE_PROVIDER "${this.providerName}". Must be "local" or "supabase".`,
        500
      );
    }
  }

  getProviderName() {
    return this.providerName;
  }

  getProvider() {
    return this.provider;
  }

  /**
   * Initializes the selected storage provider and validates configuration.
   */
  async init() {
    console.log(`[StorageService] Initializing storage with provider: "${this.providerName}"`);
    await this.provider.init();
  }

  /**
   * Step 1: Generates a short-lived direct upload URL/token for the frontend.
   */
  async requestLogoUpload({ userId, filename, contentType, size }) {
    const validated = validateFileMetadata({ filename, contentType, size });
    const storageKey = generateStorageKey(validated.extension);

    // Register short-lived pending upload state
    const pending = createPendingUpload({
      userId,
      storageKey,
      contentType: validated.contentType,
      size: validated.size,
      provider: this.providerName,
      expiresInSeconds: 900, // 15 minutes
    });

    const uploadInstructions = await this.provider.generateUploadUrl(
      pending.uploadId,
      storageKey,
      validated.contentType,
      validated.size,
      900
    );

    return {
      uploadId: pending.uploadId,
      uploadUrl: uploadInstructions.uploadUrl,
      storageKey,
      method: uploadInstructions.method || 'PUT',
      headers: uploadInstructions.headers || {},
      expiresIn: uploadInstructions.expiresIn,
    };
  }

  /**
   * Step 3: Verifies that the direct upload completed successfully in the storage provider.
   */
  async confirmLogoUpload({ uploadId, userId }) {
    const pending = consumePendingUpload(uploadId, userId);

    // Verify object presence and content in the active provider
    await this.provider.verifyObject(pending.storageKey, pending.size, pending.contentType);

    // Generate immediate display URL
    const displayUrl = await this.provider.getDisplayUrl(pending.storageKey);

    return {
      storageKey: pending.storageKey,
      displayUrl,
      size: pending.size,
      contentType: pending.contentType,
    };
  }

  /**
   * Resolves a stored database logo reference (storage key or legacy URL) to a usable display URL.
   */
  async resolveLogoUrl(storedValue) {
    if (!storedValue || typeof storedValue !== 'string') {
      return null;
    }

    // Legacy data URI or fully qualified external URL
    if (storedValue.startsWith('data:') || storedValue.startsWith('http://') || storedValue.startsWith('https://')) {
      return storedValue;
    }

    // Storage key (e.g. logos/company/...)
    if (storedValue.startsWith('logos/')) {
      try {
        return await this.provider.getDisplayUrl(storedValue);
      } catch (err) {
        console.warn(`[StorageService] Failed to resolve display URL for key ${storedValue}:`, err.message);
        return null;
      }
    }

    return storedValue;
  }

  /**
   * Deletes an obsolete logo object safely.
   */
  async deleteLogoObject(storageKey) {
    if (!storageKey || !storageKey.startsWith('logos/')) return;
    try {
      await this.provider.deleteObject(storageKey);
    } catch (err) {
      console.warn(`[StorageService] Failed to delete obsolete logo object ${storageKey}:`, err.message);
    }
  }

  /**
   * Idempotent migration of legacy base64 logo stored in PostgreSQL.
   */
  async migrateLegacyLogo(profile, updateDbCallback) {
    if (!profile || !profile.logoUrl) return null;

    // Only migrate if stored as a base64 Data URL
    if (typeof profile.logoUrl === 'string' && profile.logoUrl.startsWith('data:image/')) {
      try {
        console.log('[StorageService] Migrating legacy base64 logo to storage provider...');
        const [headerPart, base64Data] = profile.logoUrl.split(',');
        if (!base64Data) return null;

        const buffer = Buffer.from(base64Data, 'base64');
        const detectedMime = validateImageSignature(buffer);

        let ext = '.png';
        if (detectedMime === 'image/jpeg') ext = '.jpg';
        else if (detectedMime === 'image/webp') ext = '.webp';

        const storageKey = `logos/company/original-nexora-logo${ext}`;

        // Save buffer to active provider
        if (typeof this.provider.saveInitialBuffer === 'function') {
          await this.provider.saveInitialBuffer(storageKey, buffer, detectedMime);
        }

        // Verify object
        await this.provider.verifyObject(storageKey, buffer.length, detectedMime);

        // Update database with the verified storage key
        if (typeof updateDbCallback === 'function') {
          await updateDbCallback(storageKey);
        }

        console.log(`[StorageService] Legacy logo migrated successfully to key: ${storageKey}`);
        return storageKey;
      } catch (err) {
        console.error('[StorageService] Failed to migrate legacy logo:', err.message);
        return null;
      }
    }

    return profile.logoUrl;
  }
}

export const storageService = new StorageService();
export {
  validateFileMetadata,
  validateStorageKey,
  generateStorageKey,
  validateImageSignature,
  createPendingUpload,
  getPendingUpload,
  consumePendingUpload,
};

