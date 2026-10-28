import { servicesService } from './services.service.js';

export class ServicesController {
  async getPublishedServices(req, res, next) {
    try {
      const result = await servicesService.getPublishedServices(req.query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPublishedServiceBySlug(req, res, next) {
    try {
      const service = await servicesService.getPublishedServiceBySlug(req.params.slug);
      res.status(200).json({
        success: true,
        data: { service },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAdminServices(req, res, next) {
    try {
      const result = await servicesService.getAdminServices(req.query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getServiceById(req, res, next) {
    try {
      const service = await servicesService.getServiceById(req.params.id);
      res.status(200).json({
        success: true,
        data: { service },
      });
    } catch (error) {
      next(error);
    }
  }

  async createService(req, res, next) {
    try {
      const service = await servicesService.createService(req.body);
      res.status(201).json({
        success: true,
        message: 'Service created successfully.',
        data: { service },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateService(req, res, next) {
    try {
      const service = await servicesService.updateService(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Service updated successfully.',
        data: { service },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateServiceStatus(req, res, next) {
    try {
      const service = await servicesService.updateServiceStatus(req.params.id, req.body.isPublished);
      res.status(200).json({
        success: true,
        message: `Service ${service.isPublished ? 'published' : 'unpublished'} successfully.`,
        data: { service },
      });
    } catch (error) {
      next(error);
    }
  }

  async reorderServices(req, res, next) {
    try {
      await servicesService.reorderServices(req.body.orders);
      res.status(200).json({
        success: true,
        message: 'Services display order updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteService(req, res, next) {
    try {
      await servicesService.deleteService(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Service deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const servicesController = new ServicesController();
