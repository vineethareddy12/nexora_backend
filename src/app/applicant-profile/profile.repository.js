import { prisma } from '../../core/database/prisma.js';

export class ProfileRepository {
  async findProfileByUserId(userId) {
    return await prisma.applicantProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });
  }

  async upsertProfile(userId, data, fullName) {
    if (fullName && typeof fullName === 'string' && fullName.trim()) {
      await prisma.user.update({
        where: { id: userId },
        data: { fullName: fullName.trim() },
      });
    }

    return await prisma.applicantProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: {
        ...data,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });
  }
}

export const profileRepository = new ProfileRepository();
