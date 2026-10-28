import { companyService } from './company.service.js';

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
}

export const companyController = new CompanyController();
