import { companyRepository } from './company.repository.js';
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
      // Auto-initialize with default official profile if empty
      profile = await companyRepository.upsertProfile(DEFAULT_COMPANY_PROFILE);
    }

    return {
      companyName: profile.companyName,
      logoUrl: profile.logoUrl,
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
    return profile;
  }

  async updateProfile(data) {
    return await companyRepository.upsertProfile(data);
  }
}

export const companyService = new CompanyService();
