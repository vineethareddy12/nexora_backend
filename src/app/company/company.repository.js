import { prisma } from '../../core/database/prisma.js';

export class CompanyRepository {
  async getProfile() {
    return await prisma.companyProfile.findFirst();
  }

  async upsertProfile(data) {
    const existing = await prisma.companyProfile.findFirst();
    if (existing) {
      return await prisma.companyProfile.update({
        where: { id: existing.id },
        data,
      });
    }

    return await prisma.companyProfile.create({
      data,
    });
  }
}

export const companyRepository = new CompanyRepository();
