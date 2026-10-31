/**
 * Job Interview Rounds Configuration & Pipeline Progression Engine
 * Configures role-specific rounds (Full-Stack, BDA, UI/UX, Engineering, etc.)
 * and strictly validates round-by-round progression.
 */

export const DEFAULT_JOB_ROUNDS = {
  ENGINEERING: [
    { round: 'Screening', order: 1, name: 'Screening', description: 'Resume & qualifications screening' },
    { round: 'Technical Round 1', order: 2, name: 'Technical Round 1', description: 'Core programming, data structures & algorithms' },
    { round: 'Technical Round 2', order: 3, name: 'Technical Round 2', description: 'Advanced framework & stack-specific implementation' },
    { round: 'System Design', order: 4, name: 'System Design', description: 'High-level architecture, scalability & database design' },
    { round: 'Managerial Round', order: 5, name: 'Managerial Round', description: 'Engineering leadership, problem solving & behavioral fit' },
    { round: 'HR Round', order: 6, name: 'HR Round', description: 'Employment policies, culture fit & compensation alignment' },
  ],
  BDA_SALES: [
    { round: 'Screening', order: 1, name: 'Screening', description: 'Profile & background screening' },
    { round: 'Communication Round', order: 2, name: 'Communication Round', description: 'Verbal communication, persuasion & fluency evaluation' },
    { round: 'Sales Assessment', order: 3, name: 'Sales Assessment', description: 'Live pitch simulation & handling objections' },
    { round: 'Managerial Round', order: 4, name: 'Managerial Round', description: 'Sales targets alignment & behavioral review' },
    { round: 'HR Round', order: 5, name: 'HR Round', description: 'Offer alignment, background check & terms discussion' },
  ],
  DESIGN_UIUX: [
    { round: 'Screening', order: 1, name: 'Screening', description: 'Initial portfolio & background screening' },
    { round: 'Portfolio Review', order: 2, name: 'Portfolio Review', description: 'Detailed walkthrough of past design projects & case studies' },
    { round: 'Design Task', order: 3, name: 'Design Task', description: 'Evaluation of wireframes, prototypes & UX flows' },
    { round: 'Design Discussion', order: 4, name: 'Design Discussion', description: 'Design systems, critique & cross-functional handoff' },
    { round: 'HR Round', order: 5, name: 'HR Round', description: 'Culture fit & compensation discussion' },
  ],
  DEFAULT: [
    { round: 'Screening', order: 1, name: 'Screening', description: 'Initial credentials & qualifications screening' },
    { round: 'Technical Round 1', order: 2, name: 'Technical Round 1', description: 'Domain competence & problem solving' },
    { round: 'Managerial Round', order: 3, name: 'Managerial Round', description: 'Team fit & operational evaluation' },
    { round: 'HR Round', order: 4, name: 'HR Round', description: 'Employment terms & cultural alignment' },
  ],
};

/**
 * Returns the configured interview rounds for a job posting.
 */
export function getJobInterviewRounds(job) {
  const title = (job?.title || '').toLowerCase();
  const dept = (job?.department || '').toLowerCase();

  if (
    title.includes('bda') ||
    title.includes('sales') ||
    title.includes('business development') ||
    dept.includes('sales') ||
    dept.includes('marketing')
  ) {
    return DEFAULT_JOB_ROUNDS.BDA_SALES;
  }

  if (
    title.includes('ui/ux') ||
    title.includes('designer') ||
    title.includes('design') ||
    dept.includes('design')
  ) {
    return DEFAULT_JOB_ROUNDS.DESIGN_UIUX;
  }

  if (
    title.includes('full stack') ||
    title.includes('developer') ||
    title.includes('engineer') ||
    title.includes('backend') ||
    title.includes('frontend') ||
    title.includes('software') ||
    title.includes('architect') ||
    dept.includes('engineering') ||
    dept.includes('technology') ||
    dept.includes('development')
  ) {
    return DEFAULT_JOB_ROUNDS.ENGINEERING;
  }

  return DEFAULT_JOB_ROUNDS.DEFAULT;
}

/**
 * Normalizes round names for robust case-insensitive comparison.
 */
export function normalizeRoundName(name) {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Computes candidate round-by-round pipeline state for a job application.
 * Returns each round with:
 * - name
 * - order
 * - status: 'CLEARED' | 'ELIGIBLE' | 'SCHEDULED' | 'REJECTED' | 'ON_HOLD' | 'LOCKED'
 * - interview: matching interview record if exists
 */
export function computePipelineProgression(configuredRounds, existingInterviews = []) {
  // Sort interviews chronologically
  const interviews = [...existingInterviews].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  let isBlockedByRejection = false;
  let previousRoundCleared = true; // First round is always eligible initially

  return configuredRounds.map((configured, index) => {
    const normConfigured = normalizeRoundName(configured.round);

    // Find the latest non-cancelled interview for this round
    const matching = interviews
      .filter((inv) => normalizeRoundName(inv.round) === normConfigured && inv.status !== 'CANCELLED')
      .pop();

    if (matching) {
      const feedback = matching.feedbacks?.[0];
      const recommendation = feedback?.recommendation;

      if (recommendation === 'NOT_RECOMMENDED') {
        isBlockedByRejection = true;
        previousRoundCleared = false;
        return {
          ...configured,
          status: 'REJECTED',
          interview: matching,
          recommendation: 'NOT_RECOMMENDED',
        };
      }

      if (recommendation === 'HOLD') {
        previousRoundCleared = false;
        return {
          ...configured,
          status: 'ON_HOLD',
          interview: matching,
          recommendation: 'HOLD',
        };
      }

      if (recommendation === 'RECOMMENDED' || recommendation === 'STRONG_HIRE') {
        previousRoundCleared = true;
        return {
          ...configured,
          status: 'CLEARED',
          interview: matching,
          recommendation,
        };
      }

      if (matching.status === 'SCHEDULED' || matching.status === 'RESCHEDULED') {
        previousRoundCleared = false;
        return {
          ...configured,
          status: 'SCHEDULED',
          interview: matching,
          recommendation: 'PENDING',
        };
      }

      if (matching.status === 'COMPLETED' && !feedback) {
        previousRoundCleared = false;
        return {
          ...configured,
          status: 'FEEDBACK_PENDING',
          interview: matching,
          recommendation: 'PENDING',
        };
      }
    }

    // If no matching interview yet:
    if (isBlockedByRejection) {
      return { ...configured, status: 'LOCKED', reason: 'Previous round was rejected.' };
    }

    if (previousRoundCleared) {
      // This is the next eligible round to schedule!
      previousRoundCleared = false; // Next ones after this will be locked until this is cleared
      return { ...configured, status: 'ELIGIBLE' };
    }

    return { ...configured, status: 'LOCKED' };
  });
}

