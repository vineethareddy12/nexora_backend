import { profileRepository } from './profile.repository.js';
import { AppError } from '../../core/errors/AppError.js';

export class ProfileService {
  async getProfile(userId) {
    let profile = await profileRepository.findProfileByUserId(userId);
    if (!profile) {
      profile = await profileRepository.upsertProfile(userId, { technicalSkills: [] });
    }

    return {
      userId: profile.userId,
      fullName: profile.user?.fullName,
      email: profile.user?.email,
      phone: profile.phone,
      currentLocation: profile.currentLocation,
      highestQualification: profile.highestQualification,
      collegeUniversity: profile.collegeUniversity,
      graduationYear: profile.graduationYear,
      technicalSkills: profile.technicalSkills || [],
      totalExperienceYears: profile.totalExperienceYears,
      currentOrPreviousEmployer: profile.currentOrPreviousEmployer,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      portfolioUrl: profile.portfolioUrl,
      updatedAt: profile.updatedAt,
    };
  }

  async updateProfile(userId, updateData) {
    // Only permitted profile fields can be modified
    const cleanData = {};
    const allowedFields = [
      'phone',
      'currentLocation',
      'highestQualification',
      'collegeUniversity',
      'graduationYear',
      'technicalSkills',
      'totalExperienceYears',
      'currentOrPreviousEmployer',
      'linkedinUrl',
      'githubUrl',
      'portfolioUrl',
    ];

    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        cleanData[key] = updateData[key];
      }
    }

    const updated = await profileRepository.upsertProfile(userId, cleanData, updateData.fullName);

    return {
      userId: updated.userId,
      fullName: updated.user?.fullName,
      email: updated.user?.email,
      ...cleanData,
      updatedAt: updated.updatedAt,
    };
  }
}

export const profileService = new ProfileService();
