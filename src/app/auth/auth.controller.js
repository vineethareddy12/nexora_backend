import { authService, AUTH_MESSAGES } from './auth.service.js';
import { sendSuccess } from '../../core/http/response.js';

export class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return sendSuccess(res, result, AUTH_MESSAGES.REGISTER_SUCCESS, 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      return sendSuccess(res, result, AUTH_MESSAGES.LOGIN_SUCCESS, 200);
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];
      const result = await authService.refreshTokens(refreshToken);
      return sendSuccess(res, result, AUTH_MESSAGES.TOKEN_REFRESH_SUCCESS, 200);
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];
      await authService.logout(refreshToken);
      return sendSuccess(res, null, AUTH_MESSAGES.LOGOUT_SUCCESS, 200);
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req, res, next) {
    try {
      return sendSuccess(res, { user: req.user }, 'User profile retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async getSessionState(req, res, next) {
    try {
      return sendSuccess(res, { authenticated: true, user: req.user }, 'Active session verified', 200);
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const result = await authService.requestPasswordReset(req.body.email);
      return sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const result = await authService.resetPassword(req.body.token, req.body.newPassword);
      return sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const result = await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
      return sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
