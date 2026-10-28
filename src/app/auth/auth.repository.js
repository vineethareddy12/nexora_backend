import { prisma } from '../../core/database/prisma.js';

export class AuthRepository {
  async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { profile: true },
    });
  }

  async findById(id) {
    return await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  async createApplicantWithProfile({ fullName, email, passwordHash }) {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName,
          email: email.toLowerCase().trim(),
          passwordHash,
          role: 'APPLICANT',
          status: 'ACTIVE',
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      // Create initial empty profile
      const profile = await tx.applicantProfile.create({
        data: {
          userId: user.id,
          technicalSkills: [],
        },
      });

      return { ...user, profile };
    });
  }

  async updateLastLogin(userId) {
    return await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async updatePassword(userId, passwordHash) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });
  }

  // Session management
  async createSession({ userId, refreshTokenHash, expiresAt }) {
    return await prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt,
      },
    });
  }

  async findSessionByHash(refreshTokenHash) {
    return await prisma.session.findUnique({
      where: { refreshTokenHash },
      include: { user: true },
    });
  }

  async revokeSession(id) {
    return await prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserSessions(userId) {
    return await prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }
}

export const authRepository = new AuthRepository();
