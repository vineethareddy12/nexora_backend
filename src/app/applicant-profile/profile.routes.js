import { Router } from 'express';
import { profileController } from './profile.controller.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { validateRequest } from '../../core/middleware/validateRequest.js';
import { updateProfileSchema } from './profile.schemas.js';

const router = Router();

// Routes mounted at /me/profile or /api/v1/me/profile
router.use(authenticate);

router.get('/', (req, res, next) => {
  profileController.getProfile(req, res, next);
});

router.patch('/', validateRequest(updateProfileSchema), (req, res, next) => {
  profileController.updateProfile(req, res, next);
});

export default router;
