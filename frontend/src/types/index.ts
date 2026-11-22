export type Role = 'Admin' | 'Recruiter' | 'HiringManager' | 'Viewer';

export interface ScoringWeights {
  skills: number;
  experience: number;
  education: number;
  semantic: number;
}

export interface PipelineStageConfig {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
  isReject?: boolean;
  isHired?: boolean;
}

export type CustomFieldType = 'text' | 'number' | 'select' | 'boolean';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  options?: string[];
}

export type DemographicGroup = 'Male' | 'Female' | 'Tier-1' | 'Non-Tier-1';

export type HiddenField = 'name' | 'photo' | 'gender' | 'college' | 'location';

export interface CompanySettings {
  scoringWeights: ScoringWeights;
  pipelineStages: PipelineStageConfig[];
  customFields: CustomFieldDefinition[];
  skillSynonyms: Record<string, string[]>;
  blindMode: boolean;
  hiddenFields: HiddenField[];
  retentionDays: number;
  learnFromDecisions: boolean;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  industry?: string;
  settings: CompanySettings;
}

export const DEFAULT_DEMO_COMPANY: Company = {
  id: 'company-nova',
  name: 'HireSwift Demo',
  slug: 'hireswift-demo',
  settings: {
    scoringWeights: { skills: 40, experience: 25, education: 20, semantic: 15 },
    pipelineStages: [
      { id: 'applied', name: 'Applied', color: '#2563EB', isDefault: true },
      { id: 'shortlisted', name: 'Shortlisted', color: '#7C3AED' },
      { id: 'interview', name: 'Interview', color: '#F59E0B' },
      { id: 'offer', name: 'Offer', color: '#16A34A', isHired: true },
      { id: 'rejected', name: 'Rejected', color: '#DC2626', isReject: true },
    ],
    customFields: [],
    skillSynonyms: {},
    blindMode: false,
    hiddenFields: [],
    retentionDays: 365,
    learnFromDecisions: false,
  },
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: Role;
  avatarColor?: string;
}

export interface JobRequirements {
  requiredSkills: string[];
  preferredSkills: string[];
  minExperience: number;
  minCgpa: number;
  gradYears: number[];
  minTenth?: number;
  minTwelfth?: number;
}

export interface Job {
  id: string;
  companyId: string;
  title: string;
  department: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Internship' | 'Contract';
  jdText: string;
  requirements: JobRequirements;
  scoringWeights?: ScoringWeights;
  status: 'Active' | 'Paused' | 'Closed';
  createdAt: string;
  applicantCount?: number;
  applicant_count?: number;
}

export interface WorkExperience {
  title: string;
  company: string;
  duration: string;
  description: string;
}

export interface ProjectExperience {
  title: string;
  description: string;
  technologies: string[];
}

export interface Candidate {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  college: string;
  degree: string;
  branch: string;
  gradYear?: number | null;
  tenthPercent?: number | null;
  twelfthPercent?: number | null;
  cgpa?: number | null;
  skills: string[];
  experienceYears?: number | null;
  experience: WorkExperience[];
  projects: ProjectExperience[];
  certifications: string[];
  resumeText: string;
  resumeFileName: string;
  parseConfidence: number; // 0 - 100
  fieldConfidence: Record<string, number>;
  source: string;
  createdAt: string;
  customFields: Record<string, string | number | boolean>;
  isDuplicate?: boolean;
  duplicateGroupId?: string;
  duplicateSignal?: string;
  duplicateType?: string;
  gender?: 'Male' | 'Female' | 'Other';
  tier?: 'Tier-1' | 'Tier-2' | 'Tier-3';
}

export interface ApplicationNote {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface ScorecardCriterion {
  name: string;
  rating: number; // 1-5
  feedback: string;
}

export interface InterviewScorecard {
  id: string;
  interviewerName: string;
  overallRecommendation: 'Strong Yes' | 'Yes' | 'Neutral' | 'No' | 'Strong No';
  criteria: ScorecardCriterion[];
  notes: string;
  createdAt: string;
}

export interface ScoreBreakdown {
  skills?: number | null;
  experience?: number | null;
  education?: number | null;
  semantic?: number | null;
}

export interface ApplicationCandidateSummary {
  name: string;
  college?: string;
  location?: string;
  cgpa?: number | null;
  skills?: string[];
  is_duplicate?: boolean;
}

export interface Application {
  id: string;
  application_id?: string;
  companyId: string;
  jobId: string;
  candidateId: string;
  stage: string;
  matchScore: number | null;
  breakdown: ScoreBreakdown | null;
  matchedSkills: string[];
  missingSkills: string[];
  explanation: string;
  evidenceSnippets: string[];
  notes: ApplicationNote[];
  scorecards?: InterviewScorecard[];
  createdAt: string;
  candidate?: ApplicationCandidateSummary;
}

export interface StageHistory {
  id: string;
  applicationId: string;
  from: string;
  to: string;
  byUserId: string;
  byUserName?: string;
  at: string;
  reason?: string;
}

export interface EmailTemplate {
  id: string;
  companyId: string;
  name: string;
  type: 'Shortlist' | 'Interview' | 'Offer' | 'Rejection' | 'General';
  subject: string;
  body: string;
}

export interface EmailLog {
  id: string;
  companyId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'Sent' | 'Scheduled';
  scheduledFor?: string;
}

export interface DuplicateGroup {
  id: string;
  companyId: string;
  candidateIds: string[];
  similarity: number;
  matchingSignals: string[];
  status: 'Pending' | 'Merged' | 'Dismissed' | 'KeptBoth';
}

export interface Notification {
  id: string;
  companyId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  companyId: string;
  action: string;
  actorName: string;
  details: string;
  timestamp: string;
}

export interface CandidateFilterState {
  searchQuery: string;
  minCgpa: number;
  maxCgpa: number;
  minTenth: number;
  minTwelfth: number;
  skills: string[];
  minExperience: number;
  maxExperience: number;
  location: string[];
  gradYears: number[];
  degrees: string[];
  minScore: number;
  stage: string[];
  source: string[];
}
