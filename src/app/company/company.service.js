import { companyRepository } from './company.repository.js';
import { storageService } from '../../core/storage/index.js';
import { AppError } from '../../core/errors/AppError.js';

// Default corporate profile fallback based on SRS v1.2 / GTS reference
export const DEFAULT_COMPANY_PROFILE = {
  companyName: 'Nexora Technologies Private Limited',
  logoUrl: null,
  shortDescription: 'Delivering high-impact enterprise software engineering, cloud architectures, and an integrated global talent recruitment platform from Hyderabad, India.',
  about: 'Nexora Technologies is an ISO 9001:2015 certified global technology services company headquartered in Madhapur, Hitec City, Hyderabad. We deliver end-to-end full-stack software development, cloud infrastructure planning, and enterprise recruitment services to technology organizations across India and international markets.',
  mission: 'To empower forward-thinking enterprises with resilient digital infrastructure, modern microservices architectures, and high-caliber engineering talent that drive sustained commercial value.',
  vision: 'To be a globally recognized technology partner known for flawless software craftsmanship, ethical talent practices, and transparent recruitment operations.',
  areasOfExpertise: [
    'Full-Stack Web Application Development',
    'Native & Cross-Platform Mobile Solutions',
    'Cloud Architecture & DevOps Automation',
    'Enterprise IT Modernization & Architecture Consulting',
    'Artificial Intelligence & Document Automation',
    'Automated Software Testing & Quality Engineering',
  ],
  businessCapabilities: [
    'Dedicated Offshore Software Engineering Pods',
    'ISO 9001:2015 Process-Controlled Delivery Framework',
    'Integrated Applicant Tracking & Digital Offer Management',
    'High-Concurrency Microservices with Zero-Trust Security',
  ],
  email: 'info@nexoratech.com',
  careersEmail: 'careers@nexoratech.com',
  phone: '+91 93904 66320 / +91 40 4855 2244',
  secondaryPhone: '+91 93904 66320',
  address: 'LVS Arcade, Jubilee Enclave, Madhapur, Hitec City, Hyderabad, Telangana 500081, India',
  operatingHours: 'Monday – Friday: 9:00 AM – 6:30 PM IST (Offshore Delivery Support: 24/7)',
  websiteUrl: 'https://www.globaltechnologyservice.in',
};

export class CompanyService {
  async getPublicProfile() {
    let profile = await companyRepository.getProfile();
    if (!profile) {
      profile = await companyRepository.upsertProfile(DEFAULT_COMPANY_PROFILE);
    }

    // Attempt migration if still stored as legacy base64
    await this.migrateLegacyLogo(profile);

    const resolvedLogoUrl = await storageService.resolveLogoUrl(profile.logoUrl);

    return {
      companyName: profile.companyName,
      logoUrl: resolvedLogoUrl,
      shortDescription: profile.shortDescription,
      about: profile.about,
      mission: profile.mission,
      vision: profile.vision,
      areasOfExpertise: profile.areasOfExpertise,
      businessCapabilities: profile.businessCapabilities,
      email: profile.email,
      careersEmail: profile.careersEmail,
      phone: profile.phone,
      secondaryPhone: profile.secondaryPhone,
      address: profile.address,
      operatingHours: profile.operatingHours,
      websiteUrl: profile.websiteUrl,
      updatedAt: profile.updatedAt,
    };
  }

  async getAdminProfile() {
    let profile = await companyRepository.getProfile();
    if (!profile) {
      profile = await companyRepository.upsertProfile(DEFAULT_COMPANY_PROFILE);
    }

    await this.migrateLegacyLogo(profile);

    const resolvedLogoUrl = await storageService.resolveLogoUrl(profile.logoUrl);

    return {
      ...profile,
      logoUrl: resolvedLogoUrl,
    };
  }

  async updateProfile(data) {
    return await companyRepository.upsertProfile(data);
  }

  /**
   * Step 1: Request short-lived direct upload URL/token
   */
  async requestLogoUpload({ userId, filename, contentType, size }) {
    return await storageService.requestLogoUpload({ userId, filename, contentType, size });
  }

  /**
   * Step 3: Confirm direct upload, verify presence, update database, and clean up old object
   */
  async confirmLogoUpload({ uploadId, userId }) {
    const verified = await storageService.confirmLogoUpload({ uploadId, userId });

    const currentProfile = await companyRepository.getProfile();
    const oldLogoKey = currentProfile?.logoUrl;

    // Update database record with verified storage key
    await companyRepository.upsertProfile({
      logoUrl: verified.storageKey,
    });

    // Safely delete previous logo object if it was a storage key and different from the new key
    if (oldLogoKey && oldLogoKey.startsWith('logos/') && oldLogoKey !== verified.storageKey) {
      await storageService.deleteLogoObject(oldLogoKey);
    }

    return {
      logoUrl: verified.displayUrl,
      storageKey: verified.storageKey,
    };
  }

  /**
   * Idempotent migration of legacy base64 logo to storage provider
   */
  async migrateLegacyLogo(profile) {
    if (profile && typeof profile.logoUrl === 'string' && profile.logoUrl.startsWith('data:image/')) {
      const newKey = await storageService.migrateLegacyLogo(profile, async (savedKey) => {
        await companyRepository.upsertProfile({ logoUrl: savedKey });
      });
      if (newKey) {
        profile.logoUrl = newKey;
      }
    }
  }
}

export const companyService = new CompanyService();
