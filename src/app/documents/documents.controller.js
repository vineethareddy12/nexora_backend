import { documentsService } from './documents.service.js';
import { AppError } from '../../core/errors/AppError.js';

export class DocumentsController {
  async getDocuments(req, res, next) {
    try {
      const documents = await documentsService.getDocuments(req.user.id, req.query);
      res.status(200).json({
        success: true,
        data: { documents },
      });
    } catch (error) {
      next(error);
    }
  }

  async getDocumentById(req, res, next) {
    try {
      const document = await documentsService.getDocumentById(
        req.params.id,
        req.user.id,
        req.user.role
      );
      res.status(200).json({
        success: true,
        data: { document },
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadDocument(req, res, next) {
    try {
      if (!req.file) {
        return next(AppError.badRequest('No document file was uploaded in the "file" field'));
      }

      const document = await documentsService.uploadDocument({
        userId: req.user.id,
        file: req.file,
        type: req.body.type,
        description: req.body.description,
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: { document },
      });
    } catch (error) {
      next(error);
    }
  }

  async replaceDocument(req, res, next) {
    try {
      if (!req.file) {
        return next(AppError.badRequest('No replacement document file was uploaded in the "file" field'));
      }

      const document = await documentsService.replaceDocument({
        id: req.params.id,
        userId: req.user.id,
        file: req.file,
        type: req.body.type,
      });

      res.status(200).json({
        success: true,
        message: 'Document replaced successfully',
        data: { document },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteDocument(req, res, next) {
    try {
      const result = await documentsService.deleteDocument({
        id: req.params.id,
        userId: req.user.id,
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async downloadDocument(req, res, next) {
    try {
      const { download, document } = await documentsService.downloadDocument({
        id: req.params.id,
        userId: req.user.id,
        userRole: req.user.role,
      });

      if (download.type === 'redirect') {
        return res.redirect(download.url);
      }

      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      // Format filename safely for Content-Disposition (RFC 5987)
      const asciiFilename = document.originalFilename.replace(/[^\x20-\x7E]/g, '_');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(document.originalFilename)}`
      );

      if (download.type === 'stream') {
        if (document.fileSizeBytes) {
          res.setHeader('Content-Length', document.fileSizeBytes);
        }
        return download.stream.pipe(res);
      }

      if (download.type === 'buffer') {
        res.setHeader('Content-Length', download.buffer.length);
        return res.send(download.buffer);
      }

      throw AppError.internal('Unknown download format');
    } catch (error) {
      next(error);
    }
  }
}

export const documentsController = new DocumentsController();

