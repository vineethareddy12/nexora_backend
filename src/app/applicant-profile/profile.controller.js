import { profileService } from './profile.service.js';
import { sendSuccess } from '../../core/http/response.js';

export class ProfileController {
  async getProfile(req, res, next) {
    try {
      const result = await profileService.getProfile(req.user.id);
      return sendSuccess(res, result, 'Applicant profile retrieved', 200);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const result = await profileService.updateProfile(req.user.id, req.body);
      return sendSuccess(res, result, 'Applicant profile updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const profileController = new ProfileController();
