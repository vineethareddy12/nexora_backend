import { companyService } from './company.service.js';
import { storageService, getPendingUpload, validateStorageKey } from '../../core/storage/index.js';
import { AppError } from '../../core/errors/AppError.js';

export class CompanyController {
  async getPublicProfile(req, res, next) {
    try {
      const data = await companyService.getPublicProfile();
      res.status(200).json({
        success: true,
        data: { company: data },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAdminProfile(req, res, next) {
    try {
      const data = await companyService.getAdminProfile();
      res.status(200).json({
        success: true,
        data: { company: data },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const updated = await companyService.updateProfile(req.body);
      res.status(200).json({
        success: true,
        message: 'Company profile updated successfully.',
        data: { company: updated },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Step 1: Request upload URL and authorization token
   */
  async requestLogoUpload(req, res, next) {
    try {
      const result = await companyService.requestLogoUpload({
        userId: req.user.id,
        filename: req.body.filename,
        contentType: req.body.contentType,
        size: req.body.size,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Step 2 (Local): Direct upload endpoint for local development
   */
  async handleLocalUpload(req, res, next) {
    try {
      const { uploadId } = req.params;
      const pending = getPendingUpload(uploadId);

      if (pending.provider !== 'local') {
        throw new AppError('Direct local upload endpoint is only available for local storage provider', 400);
      }

      if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
        throw new AppError('No binary data received in request body', 400);
      }

      const localProvider = storageService.getProvider();
      await localProvider.saveDirectUpload(pending.storageKey, req.body, pending.contentType);

      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Step 3: Confirm direct upload and update company logo in database
   */
  async confirmLogoUpload(req, res, next) {
    try {
      const result = await companyService.confirmLogoUpload({
        uploadId: req.body.uploadId,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        message: 'Logo uploaded and confirmed successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Controlled image serving endpoint for local development
   */
  async serveLocalLogo(req, res, next) {
    try {
      const key = req.query.key;
      if (!key) {
        throw new AppError('Missing storage key parameter', 400);
      }

      validateStorageKey(key);

      if (storageService.getProviderName() === 'local') {
        const localProvider = storageService.getProvider();
        const file = await localProvider.readObject(key);
        res.setHeader('Content-Type', file.contentType);
        res.setHeader('Content-Length', file.size);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(file.buffer);
      }

      // If Supabase, redirect to signed URL
      const displayUrl = await storageService.resolveLogoUrl(key);
      if (displayUrl) {
        return res.redirect(displayUrl);
      }

      throw new AppError('Logo file not found', 404);
    } catch (error) {
      next(error);
    }
  }
}

export const companyController = new CompanyController();
