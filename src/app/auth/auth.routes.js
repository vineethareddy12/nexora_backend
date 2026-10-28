import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validateRequest } from '../../core/middleware/validateRequest.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authLimiter, passwordResetLimiter } from '../../core/middleware/rateLimiters.js';
import { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema,
  changePasswordSchema
} from './auth.schemas.js';

const router = Router();

// Public Authentication endpoints
router.post('/register', authLimiter, validateRequest(registerSchema), (req, res, next) => {
  authController.register(req, res, next);
});

router.post('/login', authLimiter, validateRequest(loginSchema), (req, res, next) => {
  authController.login(req, res, next);
});

router.post('/refresh', validateRequest(refreshTokenSchema), (req, res, next) => {
  authController.refresh(req, res, next);
});

router.post('/logout', (req, res, next) => {
  authController.logout(req, res, next);
});

router.post('/forgot-password', passwordResetLimiter, validateRequest(forgotPasswordSchema), (req, res, next) => {
  authController.forgotPassword(req, res, next);
});

router.post('/reset-password', passwordResetLimiter, validateRequest(resetPasswordSchema), (req, res, next) => {
  authController.resetPassword(req, res, next);
});

// Authenticated session endpoints
router.get('/me', authenticate, (req, res, next) => {
  authController.getCurrentUser(req, res, next);
});

router.get('/session', authenticate, (req, res, next) => {
  authController.getSessionState(req, res, next);
});

router.post('/change-password', authenticate, validateRequest(changePasswordSchema), (req, res, next) => {
  authController.changePassword(req, res, next);
});

export default router;
