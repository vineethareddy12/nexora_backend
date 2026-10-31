import { z } from 'zod';

const isValidDateString = (val) => {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split(/[-/]/);
    return !isNaN(Date.parse(`${y}-${m}-${d}`));
  }
  return !isNaN(Date.parse(trimmed));
};

export const scheduleInterviewSchema = z.object({
  applicationId: z.string().uuid({ message: 'Valid application UUID is required' }),
  round: z.string().min(2, 'Interview round must be at least 2 characters').max(100),
  interviewDate: z.string().refine(isValidDateString, { message: 'Valid interview date is required' }),
  startTime: z.string().min(1, 'Start time is required').max(20),
  endTime: z.string().min(1, 'End time is required').max(20),
  mode: z.enum(['ONLINE', 'OFFLINE']).default('ONLINE'),
  meetingLinkOrLocation: z.string().min(3, 'Meeting URL or physical location is required'),
  interviewerName: z.string().max(120).optional().nullable(),
  instructions: z.string().max(2000).optional().nullable(),
});

export const rescheduleInterviewSchema = z.object({
  interviewDate: z.string().refine(isValidDateString, { message: 'Valid interview date is required' }),
  startTime: z.string().min(1, 'Start time is required').max(20),
  endTime: z.string().min(1, 'End time is required').max(20),
  reason: z.string().min(3, 'Rescheduling reason is required').max(1000),
  meetingLinkOrLocation: z.string().min(3).optional().nullable(),
});

export const cancelInterviewSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason is required').max(1000),
});

export const interviewFeedbackSchema = z.object({
  technicalRating: z.number().int().min(1).max(5).optional().nullable(),
  communicationRating: z.number().int().min(1).max(5).optional().nullable(),
  problemSolvingRating: z.number().int().min(1).max(5).optional().nullable(),
  strengths: z.string().max(2000).optional().nullable(),
  areasForImprovement: z.string().max(2000).optional().nullable(),
  overallFeedback: z.string().min(5, 'Overall feedback must be at least 5 characters').max(3000),
  recommendation: z.enum(['RECOMMENDED', 'NOT_RECOMMENDED', 'STRONG_HIRE', 'NEEDS_FURTHER_EVALUATION', 'HOLD']),
  outcome: z.string().max(50).optional().nullable(),
  isConfidential: z.boolean().default(true),
});

export const finalDecisionSchema = z.object({
  decision: z.enum(['SELECTED', 'REJECTED']),
  rejectionReason: z.string().max(1000).optional().nullable(),
  remarks: z.string().max(1000).optional().nullable(),
});

