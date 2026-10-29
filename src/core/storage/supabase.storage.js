import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { validateStorageKey, validateImageSignature } from './validation.js';

export class SupabaseStorageProvider {
  constructor() {
    this.url = env.SUPABASE_URL;
    this.serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    this.bucket = env.SUPABASE_STORAGE_BUCKET || 'company-assets';
    this.client = null;
  }

  /**
   * Initializes and validates the Supabase client.
   * Throws immediately if required configuration is missing.
   */
  async init() {
    if (!this.url || !this.serviceRoleKey) {
      throw new AppError(
        'Supabase Storage is selected (STORAGE_PROVIDER=supabase), but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.',
        500
      );
    }

    try {
      this.client = createClient(this.url, this.serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      // Verify connection by checking the bucket
      const { data: buckets, error } = await this.client.storage.listBuckets();
      if (error) {
        console.warn(`[SupabaseStorageProvider] Warning accessing buckets:`, error.message);
      } else {
        const bucketFound = buckets.some((b) => b.name === this.bucket);
        if (!bucketFound) {
          console.warn(
            `[SupabaseStorageProvider] Bucket "${this.bucket}" was not found in Supabase project. Attempting to create private bucket...`
          );
          await this.client.storage.createBucket(this.bucket, {
            public: false,
            fileSizeLimit: 5242880,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
          });
        }
      }
      console.log(`[SupabaseStorageProvider] Initialized with bucket: "${this.bucket}"`);
    } catch (err) {
      console.error('[SupabaseStorageProvider] Initialization failed:', err.message);
      throw new AppError(`Supabase Storage initialization failed: ${err.message}`, 500);
    }
  }

  ensureClient() {
    if (!this.client) {
      if (!this.url || !this.serviceRoleKey) {
        throw new AppError('Supabase credentials are not configured', 500);
      }
      this.client = createClient(this.url, this.serviceRoleKey, {
        auth: { persistSession: false },
      });
    }
    return this.client;
  }

  /**
   * Generates a short-lived signed upload URL for the frontend to upload image bytes directly.
   */
  async generateUploadUrl(uploadId, storageKey, contentType, size, expiresInSeconds = 900) {
    validateStorageKey(storageKey);
    const client = this.ensureClient();

    const { data, error } = await client.storage
      .from(this.bucket)
      .createSignedUploadUrl(storageKey);

    if (error || !data?.signedUrl) {
      console.error('[SupabaseStorageProvider] Failed to generate signed upload URL:', error);
      throw new AppError(`Failed to generate Supabase signed upload URL: ${error?.message || 'Unknown error'}`, 500);
    }

    return {
      uploadUrl: data.signedUrl,
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      token: data.token,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Verifies that the uploaded object exists in Supabase Storage and has valid image bytes.
   */
  async verifyObject(storageKey, expectedSize, expectedContentType) {
    validateStorageKey(storageKey);
    const client = this.ensureClient();

    // Download object to verify existence and check magic bytes
    const { data, error } = await client.storage.from(this.bucket).download(storageKey);
    if (error || !data) {
      throw new AppError(`Uploaded object not found in Supabase Storage: ${storageKey}`, 404);
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length <= 0) {
      throw new AppError('Uploaded object is empty in Supabase Storage', 400);
    }

    // Verify binary image signature
    validateImageSignature(buffer, expectedContentType);

    return {
      exists: true,
      size: buffer.length,
      storageKey,
    };
  }

  /**
   * Generates a short-lived signed download URL for displaying the logo.
   */
  async getDisplayUrl(storageKey, expiresInSeconds = 3600) {
    validateStorageKey(storageKey);
    const client = this.ensureClient();

    const { data, error } = await client.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.error('[SupabaseStorageProvider] Failed to create signed download URL:', error);
      throw new AppError(`Failed to generate signed download URL: ${error?.message || 'Unknown error'}`, 500);
    }

    return data.signedUrl;
  }

  /**
   * Deletes an obsolete logo file from Supabase Storage.
   */
  async deleteObject(storageKey) {
    validateStorageKey(storageKey);
    const client = this.ensureClient();

    try {
      const { error } = await client.storage.from(this.bucket).remove([storageKey]);
      if (error) {
        console.warn(`[SupabaseStorageProvider] Failed to delete object ${storageKey}:`, error.message);
      } else {
        console.log(`[SupabaseStorageProvider] Deleted obsolete object: ${storageKey}`);
      }
    } catch (err) {
      console.warn(`[SupabaseStorageProvider] Exception deleting object ${storageKey}:`, err.message);
    }
  }

  /**
   * Uploads an initial buffer directly (used for migration of legacy logo).
   */
  async saveInitialBuffer(storageKey, buffer, contentType = 'image/png') {
    validateStorageKey(storageKey);
    const client = this.ensureClient();

    const { error } = await client.storage.from(this.bucket).upload(storageKey, buffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      throw new AppError(`Failed to migrate logo to Supabase: ${error.message}`, 500);
    }

    return storageKey;
  }
}

