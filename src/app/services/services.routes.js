import { Router } from 'express';
import { servicesController } from './services.controller.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRole } from '../../core/middleware/authorizeRole.js';
import { validateRequest } from '../../core/middleware/validateRequest.js';
import { 
  createServiceSchema, 
  updateServiceSchema, 
  updateServiceStatusSchema, 
  reorderServicesSchema 
} from './services.schemas.js';

export const publicServicesRouter = Router();
export const adminServicesRouter = Router();

// Public routes: /api/v1/services
publicServicesRouter.get('/', (req, res, next) => servicesController.getPublishedServices(req, res, next));
publicServicesRouter.get('/:slug', (req, res, next) => servicesController.getPublishedServiceBySlug(req, res, next));

// Admin routes: /api/v1/admin/services
adminServicesRouter.use(authenticate, authorizeRole('ADMIN'));
adminServicesRouter.get('/', (req, res, next) => servicesController.getAdminServices(req, res, next));
adminServicesRouter.post('/', validateRequest(createServiceSchema), (req, res, next) => servicesController.createService(req, res, next));
adminServicesRouter.patch('/reorder', validateRequest(reorderServicesSchema), (req, res, next) => servicesController.reorderServices(req, res, next));
adminServicesRouter.get('/:id', (req, res, next) => servicesController.getServiceById(req, res, next));
adminServicesRouter.patch('/:id', validateRequest(updateServiceSchema), (req, res, next) => servicesController.updateService(req, res, next));
adminServicesRouter.patch('/:id/status', validateRequest(updateServiceStatusSchema), (req, res, next) => servicesController.updateServiceStatus(req, res, next));
adminServicesRouter.delete('/:id', (req, res, next) => servicesController.deleteService(req, res, next));
