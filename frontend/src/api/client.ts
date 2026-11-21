import { z } from 'zod'
import { Candidate, Job, Application, Company, ScoringWeights } from '@/types'
import { useAppStore } from '@/store'
import { matchScore } from '@/lib/scoring'
import { ApiCandidateSchema, fromApiCandidate, toApiCandidate, fromApiApplication } from './mappers'
import { fromApiJob, toApiJob } from './jobMapper'

// Environment Configurations
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
export const getUseMock = (): boolean => {
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('hireswift_use_mock')
    if (override !== null) return override === 'true'
  }
  return import.meta.env.VITE_USE_MOCK !== undefined
    ? import.meta.env.VITE_USE_MOCK === 'true'
    : import.meta.env.DEV
}

export const USE_MOCK = getUseMock()

// Synthetic data detection from stub server (STUB_SCALE=1000)
let syntheticDetected = false
export const getIsSyntheticData = (): boolean => syntheticDetected
export const setSyntheticDetected = (val: boolean) => {
  syntheticDetected = val
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hireswift-synthetic', { detail: val }))
  }
}

export function checkSyntheticResponse(res: Response) {
  if (res.headers && res.headers.get('X-Stub-Synthetic') === 'true') {
    syntheticDetected = true
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hireswift-synthetic', { detail: true }))
    }
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ==========================================
// ZOD VALIDATION SCHEMAS FOR CONTRACT
// ==========================================
export const HealthResponseSchema = z.object({
  status: z.string(),
  version: z.string(),
  database: z.string().optional(),
})

export const BatchProgressSchema = z.object({
  id: z.string(),
  total_files: z.number(),
  processed_files: z.number(),
  status: z.enum(['processing', 'completed', 'failed']),
  failed_files: z.array(
    z.object({
      filename: z.string(),
      reason: z.string(),
    })
  ),
})

export const CandidateItemSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  college: z.string(),
  degree: z.string(),
  branch: z.string(),
  gradYear: z.number(),
  tenthPercent: z.number(),
  twelfthPercent: z.number(),
  cgpa: z.number(),
  skills: z.array(z.string()),
  experienceYears: z.number(),
  resumeText: z.string(),
  resumeFileName: z.string(),
  parseConfidence: z.number(),
  source: z.string(),
  createdAt: z.string(),
})

export const CandidatesListResponseSchema = z.object({
  items: z.array(ApiCandidateSchema),
  total: z.number(),
  page: z.number().optional().default(1),
  page_size: z.number().optional().default(12),
})

export const JobRankingItemSchema = z.object({
  candidate_id: z.string(),
  candidate: ApiCandidateSchema.optional(),
  name: z.string().optional(),
  college: z.string().optional(),
  application_id: z.string().optional().default(''),
  match_score: z.number().nullable().optional(),
  breakdown: z
    .object({
      skills: z.number().nullable().optional(),
      experience: z.number().nullable().optional(),
      education: z.number().nullable().optional(),
      semantic: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  matched_skills: z.array(z.string()).default([]),
  missing_skills: z.array(z.string()).default([]),
  explanation: z.string().default(''),
  stage: z.string().default('applied'),
})

export const JobRankingResponseSchema = z.object({
  job_id: z.string(),
  weights_applied: z
    .object({
      skills: z.number().optional(),
      experience: z.number().optional(),
      education: z.number().optional(),
      semantic: z.number().optional(),
    })
    .nullable()
    .optional(),
  candidates: z.array(JobRankingItemSchema),
})

export const MergeDuplicatesResponseSchema = z.object({
  success: z.boolean(),
  candidate: ApiCandidateSchema,
  merged_candidate_ids: z.array(z.string()).default([]),
})

export const CriterionEvaluationSchema = z.object({
  rating: z.number().min(1).max(5),
  notes: z.string().default(''),
})

export const ScorecardRecordSchema = z.object({
  id: z.string(),
  application_id: z.string(),
  interviewer_name: z.string().default('Evaluator'),
  recommendation: z.string(),
  technical_depth: CriterionEvaluationSchema.optional(),
  problem_solving: CriterionEvaluationSchema.optional(),
  communication: CriterionEvaluationSchema.optional(),
  notes: z.string().default(''),
  created_at: z.string(),
})

export type ScorecardRecord = z.infer<typeof ScorecardRecordSchema>

export interface ScorecardPayload {
  interviewer_name?: string
  recommendation: string
  technical_depth?: { rating: number; notes: string }
  problem_solving?: { rating: number; notes: string }
  communication?: { rating: number; notes: string }
  criteria?: {
    technical_depth?: { rating: number; notes: string }
    problem_solving?: { rating: number; notes: string }
    communication?: { rating: number; notes: string }
  }
  notes?: string
  overall_notes?: string
}

export type JobRankingWeightsParam = {
  skills?: number
  experience?: number
  education?: number
  semantic?: number
  weights_skills?: number
  weights_experience?: number
  weights_education?: number
  weights_semantic?: number
}

export const SkillGapResponseSchema = z.object({
  job_id: z.string(),
  skills: z.array(
    z.object({
      name: z.string(),
      required: z.boolean(),
      applicants_count: z.number(),
      coverage_pct: z.number(),
    })
  ),
  total_applicants: z.number(),
})

export const EmailRecipientSchema = z.object({
  candidate_id: z.string(),
  to: z.string(),
  subject: z.string(),
  body: z.string(),
})

export const SendBulkEmailRequestSchema = z.object({
  job_id: z.string().optional(),
  recipients: z.array(EmailRecipientSchema),
  include_test_failure: z.boolean().optional(),
})

export const EmailSendResultItemSchema = z.object({
  candidate_id: z.string(),
  email: z.string(),
  status: z.enum(['sent', 'failed']),
  error: z.string().optional(),
})

export const SendBulkEmailResponseSchema = z.object({
  sent: z.array(EmailSendResultItemSchema),
})

export type EmailRecipient = z.infer<typeof EmailRecipientSchema>
export type SendBulkEmailRequest = z.infer<typeof SendBulkEmailRequestSchema>
export type EmailSendResultItem = z.infer<typeof EmailSendResultItemSchema>
export type SendBulkEmailResponse = z.infer<typeof SendBulkEmailResponseSchema>

// ==========================================
// QUERY PARAMETERS AND TYPES
// ==========================================
export interface CandidateFilterParams {
  cgpa_min?: number;
  tenth_min?: number;
  twelfth_min?: number;
  skills_all?: string[];
  skills_any?: string[];
  skills_none?: string[];
  exp_min?: number;
  exp_max?: number;
  city?: string;
  grad_year?: number;
  q?: string;
  include_unknown?: boolean;
  sort?: string;
  page?: number;
  page_size?: number;
}

export interface CandidatesListResponse {
  items: Candidate[];
  total: number;
  page: number;
  page_size: number;
}

export interface BatchProgress {
  id: string;
  total_files: number;
  processed_files: number;
  status: 'processing' | 'completed' | 'failed';
  failed_files: Array<{ filename: string; reason: string }>;
}

export interface JobRankingCandidate {
  candidate_id: string;
  candidate?: Candidate;
  name?: string;
  college?: string;
  application_id: string;
  match_score: number | null;
  breakdown?: {
    skills?: number | null;
    experience?: number | null;
    education?: number | null;
    semantic?: number | null;
  } | null;
  matched_skills: string[];
  missing_skills: string[];
  explanation: string;
  stage: string;
}

export interface JobRankingResponse {
  job_id: string;
  weights_applied?: {
    skills?: number;
    experience?: number;
    education?: number;
    semantic?: number;
  };
  candidates: JobRankingCandidate[];
}

export interface SkillGapItem {
  name: string;
  required: boolean;
  applicants_count: number;
  coverage_pct: number;
}

export interface SkillGapResponse {
  job_id: string;
  skills: SkillGapItem[];
  total_applicants: number;
}

export interface CompareCandidateItem {
  candidate: Candidate;
  match_score?: number | null;
  breakdown?: {
    skills?: number | null;
    experience?: number | null;
    education?: number | null;
    semantic?: number | null;
  } | null;
  matched_skills?: string[];
  missing_skills?: string[];
}

export interface CompareResponse {
  candidates: CompareCandidateItem[];
  job?: Job;
}

// Stage transition validation helper
export const VALID_STAGE_TRANSITIONS: Record<string, string[]> = {
  applied: ['shortlisted', 'rejected'],
  shortlisted: ['interview', 'rejected'],
  interview: ['offer', 'rejected'],
  offer: ['rejected', 'applied'],
  rejected: ['applied'],
}

export function isValidTransition(fromStage: string, toStage: string): boolean {
  if (fromStage === toStage) return true
  const allowed = VALID_STAGE_TRANSITIONS[fromStage]
  return allowed ? allowed.includes(toStage) : false
}

// Network simulation helper
const sleep = (ms = 200): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// ==========================================
// MOCK API IMPLEMENTATION (Client-side Engine)
// ==========================================
export const mockApi = {
  health: async (): Promise<{ status: string; version: string; database?: string }> => {
    await sleep(50)
    return { status: 'ok', version: '1.0.0', database: 'connected' }
  },

  uploadResumesBulk: async (
    files: File[],
    jobId?: string
  ): Promise<{ batch_id: string; total_files: number; status: string }> => {
    await sleep(350)
    const batchId = `batch-${Date.now()}`
    return {
      batch_id: batchId,
      total_files: files.length,
      status: 'processing',
    }
  },

  getBatchProgress: async (batchId: string): Promise<BatchProgress> => {
    await sleep(200)
    return {
      id: batchId,
      total_files: 10,
      processed_files: 10,
      status: 'completed',
      failed_files: [],
    }
  },

  getCandidates: async (params: CandidateFilterParams = {}): Promise<CandidatesListResponse> => {
    await sleep(150)
    const store = useAppStore.getState()
    const all = store.candidates.filter((c) => c.companyId === store.currentCompanyId)

    const filtered = all.filter((cand) => {
      // Unknown inclusion check: if include_unknown is false and fields are empty/zero
      const hasUnknownCgpa = cand.cgpa == null || cand.cgpa <= 0
      const hasUnknownExp = cand.experienceYears == null || cand.experienceYears < 0
      const hasUnknownTenth = cand.tenthPercent == null || cand.tenthPercent <= 0
      const hasUnknownTwelfth = cand.twelfthPercent == null || cand.twelfthPercent <= 0

      if (!params.include_unknown) {
        if (params.cgpa_min && params.cgpa_min > 0 && hasUnknownCgpa) return false
        if (params.tenth_min && params.tenth_min > 0 && hasUnknownTenth) return false
        if (params.twelfth_min && params.twelfth_min > 0 && hasUnknownTwelfth) return false
        if (params.exp_min !== undefined && hasUnknownExp) return false
      }

      // CGPA Min
      if (params.cgpa_min && params.cgpa_min > 0) {
        if (!hasUnknownCgpa && (cand.cgpa == null || cand.cgpa < params.cgpa_min)) return false
      }

      // 10th & 12th
      if (params.tenth_min && params.tenth_min > 0 && (cand.tenthPercent == null || cand.tenthPercent < params.tenth_min)) return false
      if (params.twelfth_min && params.twelfth_min > 0 && (cand.twelfthPercent == null || cand.twelfthPercent < params.twelfth_min)) return false

      // Experience Range
      if (params.exp_min !== undefined && (cand.experienceYears == null || cand.experienceYears < params.exp_min)) return false
      if (params.exp_max !== undefined && (cand.experienceYears != null && cand.experienceYears > params.exp_max)) return false

      // City / Location
      if (params.city && params.city !== 'All' && cand.location.toLowerCase() !== params.city.toLowerCase()) {
        return false
      }

      // Grad Year
      if (params.grad_year && cand.gradYear !== params.grad_year) return false

      // Full Text Query
      if (params.q && params.q.trim()) {
        const query = params.q.toLowerCase()
        const matchName = cand.name.toLowerCase().includes(query)
        const matchCollege = cand.college.toLowerCase().includes(query)
        const matchSkill = cand.skills.some((s) => s.toLowerCase().includes(query))
        if (!matchName && !matchCollege && !matchSkill) return false
      }

      // Skills: AND (skills_all - must contain all)
      if (params.skills_all && params.skills_all.length > 0) {
        const candSkillsLower = cand.skills.map((s) => s.toLowerCase())
        const hasAll = params.skills_all.every((req) =>
          candSkillsLower.some((s) => s.includes(req.toLowerCase()))
        )
        if (!hasAll) return false
      }

      // Skills: OR (skills_any - must contain at least one)
      if (params.skills_any && params.skills_any.length > 0) {
        const candSkillsLower = cand.skills.map((s) => s.toLowerCase())
        const hasAny = params.skills_any.some((req) =>
          candSkillsLower.some((s) => s.includes(req.toLowerCase()))
        )
        if (!hasAny) return false
      }

      // Skills: NOT (skills_none - must NOT contain any)
      if (params.skills_none && params.skills_none.length > 0) {
        const candSkillsLower = cand.skills.map((s) => s.toLowerCase())
        const hasForbidden = params.skills_none.some((forbidden) =>
          candSkillsLower.some((s) => s.includes(forbidden.toLowerCase()))
        )
        if (hasForbidden) return false
      }

      return true
    })

    // Sorting
    const sorted = [...filtered].sort((a, b) => {
      const aCgpa = a.cgpa ?? 0
      const bCgpa = b.cgpa ?? 0
      const aExp = a.experienceYears ?? 0
      const bExp = b.experienceYears ?? 0
      if (params.sort === 'cgpa_desc') return bCgpa - aCgpa
      if (params.sort === 'exp_desc') return bExp - aExp
      if (params.sort === 'name_asc') return a.name.localeCompare(b.name)
      if (params.sort === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return bCgpa - aCgpa // default
    })

    const page = params.page || 1
    const pageSize = params.page_size || 12
    const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

    return {
      items: paginated,
      total: sorted.length,
      page,
      page_size: pageSize,
    }
  },

  getCandidate: async (id: string): Promise<Candidate> => {
    await sleep(100)
    const store = useAppStore.getState()
    const cand = store.candidates.find((c) => c.id === id)
    if (!cand) throw new ApiError(404, `Candidate ${id} not found.`)
    return cand
  },

  patchCandidate: async (id: string, updates: Partial<Candidate>): Promise<Candidate> => {
    await sleep(200)
    const store = useAppStore.getState()
    store.updateCandidate(id, updates)
    const updated = store.candidates.find((c) => c.id === id)
    if (!updated) throw new ApiError(404, `Candidate ${id} not found.`)
    return updated
  },

  getJobs: async (): Promise<Job[]> => {
    await sleep(150)
    const store = useAppStore.getState()
    return store.jobs.filter((j) => j.companyId === store.currentCompanyId)
  },

  getJob: async (id: string): Promise<Job> => {
    await sleep(100)
    const store = useAppStore.getState()
    const job = store.jobs.find((j) => j.id === id)
    if (!job) throw new ApiError(404, `Job ${id} not found.`)
    return job
  },

  createJob: async (jobData: Omit<Job, 'id' | 'createdAt'>): Promise<Job> => {
    await sleep(300)
    const store = useAppStore.getState()
    const job = store.addJob(jobData)
    return job
  },

  patchJob: async (id: string, updates: Partial<Job>): Promise<Job> => {
    await sleep(200)
    const store = useAppStore.getState()
    store.updateJob(id, updates)
    const updated = store.jobs.find((j) => j.id === id)
    if (!updated) throw new ApiError(404, `Job ${id} not found.`)
    return updated
  },

  getJobRanking: async (
    jobId: string,
    customWeights?: JobRankingWeightsParam
  ): Promise<JobRankingResponse> => {
    await sleep(200)
    const store = useAppStore.getState()
    const job = store.jobs.find((j) => j.id === jobId)
    if (!job) throw new ApiError(404, `Job ${jobId} not found.`)

    const company = store.companies.find((c) => c.id === job.companyId)
    const defaultWeights = job.scoringWeights || company?.settings.scoringWeights || {
      skills: 40,
      experience: 25,
      education: 20,
      semantic: 15,
    }

    const weights: ScoringWeights = {
      skills: customWeights?.skills ?? (customWeights?.weights_skills != null ? Math.round(customWeights.weights_skills * 100) : defaultWeights.skills),
      experience: customWeights?.experience ?? (customWeights?.weights_experience != null ? Math.round(customWeights.weights_experience * 100) : defaultWeights.experience),
      education: customWeights?.education ?? (customWeights?.weights_education != null ? Math.round(customWeights.weights_education * 100) : defaultWeights.education),
      semantic: customWeights?.semantic ?? (customWeights?.weights_semantic != null ? Math.round(customWeights.weights_semantic * 100) : defaultWeights.semantic),
    }
    const synonyms = company?.settings.skillSynonyms || {}

    // Find all applications for this job
    const apps = store.applications.filter((a) => a.jobId === jobId)
    const candMap = new Map(store.candidates.map((c) => [c.id, c]))

    const ranked: JobRankingCandidate[] = []

    apps.forEach((app) => {
      const cand = candMap.get(app.candidateId)
      if (!cand) return
      const evaluated = matchScore(cand, job, weights, synonyms)
      ranked.push({
        candidate_id: cand.id,
        candidate: cand,
        application_id: app.id,
        match_score: evaluated.score,
        breakdown: evaluated.breakdown,
        matched_skills: evaluated.matchedSkills,
        missing_skills: evaluated.missingSkills,
        explanation: evaluated.explanation,
        stage: app.stage,
      })
    })

    // Sort descending by match score
    ranked.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))

    const appliedWeights = customWeights
      ? {
          skills: customWeights.weights_skills ?? (customWeights.skills != null ? customWeights.skills / 100 : undefined),
          experience: customWeights.weights_experience ?? (customWeights.experience != null ? customWeights.experience / 100 : undefined),
          education: customWeights.weights_education ?? (customWeights.education != null ? customWeights.education / 100 : undefined),
          semantic: customWeights.weights_semantic ?? (customWeights.semantic != null ? customWeights.semantic / 100 : undefined),
        }
      : undefined

    return {
      job_id: jobId,
      weights_applied: appliedWeights,
      candidates: ranked,
    }
  },

  rematchJob: async (jobId: string): Promise<{ job_id: string; total_ranked: number; status: string }> => {
    await sleep(200)
    return { job_id: jobId, total_ranked: 50, status: 'complete' }
  },

  mergeDuplicates: async (groupId: string, primaryCandidateId: string): Promise<Candidate> => {
    await sleep(200)
    const store = useAppStore.getState()
    store.mergeDuplicates(groupId, primaryCandidateId)
    const cand = store.candidates.find((c) => c.id === primaryCandidateId)
    if (!cand) throw new ApiError(404, 'Candidate not found')
    return cand
  },

  createScorecard: async (applicationId: string, scorecard: ScorecardPayload): Promise<ScorecardRecord> => {
    await sleep(200)
    const store = useAppStore.getState()
    const tech = scorecard.technical_depth || scorecard.criteria?.technical_depth || { rating: 3, notes: '' }
    const prob = scorecard.problem_solving || scorecard.criteria?.problem_solving || { rating: 3, notes: '' }
    const comm = scorecard.communication || scorecard.criteria?.communication || { rating: 3, notes: '' }
    const notesText = scorecard.notes || scorecard.overall_notes || ''

    store.addScorecard(applicationId, {
      interviewerName: scorecard.interviewer_name || 'Evaluator',
      overallRecommendation: scorecard.recommendation as any,
      criteria: [
        { name: 'Technical Depth', rating: tech.rating, feedback: tech.notes },
        { name: 'Problem Solving', rating: prob.rating, feedback: prob.notes },
        { name: 'Communication', rating: comm.rating, feedback: comm.notes },
      ],
      notes: notesText,
    })
    return {
      id: `sc-${Date.now()}`,
      application_id: applicationId,
      interviewer_name: scorecard.interviewer_name || 'Evaluator',
      recommendation: scorecard.recommendation,
      technical_depth: tech,
      problem_solving: prob,
      communication: comm,
      notes: notesText,
      created_at: new Date().toISOString(),
    }
  },

  getScorecards: async (applicationId: string): Promise<ScorecardRecord[]> => {
    await sleep(150)
    const store = useAppStore.getState()
    const app = store.applications.find((a) => a.id === applicationId)
    return (app?.scorecards || []).map((sc: any) => ({
      id: sc.id,
      application_id: applicationId,
      interviewer_name: sc.interviewerName,
      recommendation: sc.overallRecommendation,
      notes: sc.notes || '',
      created_at: sc.createdAt || new Date().toISOString(),
    }))
  },

  getCandidateResumeUrl: (candidateId: string): string => {
    return `${API_BASE_URL}/candidates/${encodeURIComponent(candidateId)}/resume`
  },

  getJobSkillGap: async (jobId: string): Promise<SkillGapResponse> => {
    await sleep(150)
    const store = useAppStore.getState()
    const job = store.jobs.find((j) => j.id === jobId)
    if (!job) throw new ApiError(404, `Job ${jobId} not found.`)

    const apps = store.applications.filter((a) => a.jobId === jobId)
    const candidateIds = new Set(apps.map((a) => a.candidateId))
    const applicants = store.candidates.filter((c) => candidateIds.has(c.id))

    const allSkills = [
      ...job.requirements.requiredSkills.map((s) => ({ name: s, required: true })),
      ...job.requirements.preferredSkills.map((s) => ({ name: s, required: false })),
    ]

    const skillsData: SkillGapItem[] = allSkills.map(({ name, required }) => {
      const matchCount = applicants.filter((c) =>
        c.skills.some((s) => s.toLowerCase().includes(name.toLowerCase()))
      ).length
      const coveragePct = applicants.length > 0 ? Math.round((matchCount / applicants.length) * 100) : 0
      return {
        name,
        required,
        applicants_count: matchCount,
        coverage_pct: coveragePct,
      }
    })

    return {
      job_id: jobId,
      skills: skillsData,
      total_applicants: applicants.length,
    }
  },

  getApplications: async (jobId?: string): Promise<Application[]> => {
    await sleep(100)
    const store = useAppStore.getState()
    return store.applications.filter((a) => {
      if (a.companyId !== store.currentCompanyId) return false
      if (jobId && jobId !== 'all' && a.jobId !== jobId) return false
      return true
    })
  },

  moveApplication: async (
    applicationId: string,
    newStage: string,
    reason?: string
  ): Promise<{ success: boolean; stage: string; historyId: string }> => {
    await sleep(250)
    const store = useAppStore.getState()
    const app = store.applications.find((a) => a.id === applicationId || a.application_id === applicationId)
    if (!app) throw new ApiError(404, `Application ${applicationId} not found.`)

    const currentStage = app.stage

    // VALIDATE STAGE TRANSITIONS PER CONTRACT
    if (!isValidTransition(currentStage, newStage)) {
      throw new ApiError(
        400,
        `Invalid stage transition: Cannot jump directly from '${currentStage}' to '${newStage}'. Must progress through standard pipeline flow.`
      )
    }

    store.updateApplicationStage(applicationId, newStage, reason)
    return {
      success: true,
      stage: newStage,
      historyId: `hist-${Date.now()}`,
    }
  },

  compareCandidates: async (ids: string[], jobId?: string): Promise<CompareResponse> => {
    await sleep(200)
    if (ids.length > 3) {
      throw new ApiError(400, 'Comparison is limited to a maximum of 3 candidates.')
    }
    const store = useAppStore.getState()
    const company = store.companies.find((c) => c.id === store.currentCompanyId)
    const targetJob = jobId
      ? store.jobs.find((j) => j.id === jobId)
      : store.jobs.find((j) => j.companyId === store.currentCompanyId)

    const weights = targetJob?.scoringWeights || company?.settings.scoringWeights || {
      skills: 40,
      experience: 25,
      education: 20,
      semantic: 15,
    }
    const synonyms = company?.settings.skillSynonyms || {}

    const compared: CompareCandidateItem[] = []

    ids.forEach((id) => {
      const cand = store.candidates.find((c) => c.id === id)
      if (!cand) return
      let evaluated: {
        score: number | null
        breakdown: any
        matchedSkills: string[]
        missingSkills: string[]
      } = {
        score: null,
        breakdown: null,
        matchedSkills: cand.skills.slice(0, 3),
        missingSkills: [] as string[],
      }
      if (targetJob) {
        const match = matchScore(cand, targetJob, weights, synonyms)
        evaluated = {
          score: match.score,
          breakdown: match.breakdown,
          matchedSkills: match.matchedSkills,
          missingSkills: match.missingSkills,
        }
      }
      compared.push({
        candidate: cand,
        match_score: evaluated.score,
        breakdown: evaluated.breakdown,
        matched_skills: evaluated.matchedSkills,
        missing_skills: evaluated.missingSkills,
      })
    })

    return {
      candidates: compared,
      job: targetJob,
    }
  },

  sendBulkEmail: async (req: SendBulkEmailRequest): Promise<SendBulkEmailResponse> => {
    await sleep(250)
    const results: EmailSendResultItem[] = req.recipients.map((r, idx) => {
      const email = r.to || ''
      const isFailed =
        email.toLowerCase().includes('fail') ||
        email.toLowerCase().includes('invalid') ||
        r.candidate_id === 'C042' ||
        (idx === 1 && req.recipients.length >= 2 && Boolean(req.include_test_failure))

      if (isFailed) {
        return {
          candidate_id: r.candidate_id,
          email,
          status: 'failed',
          error: 'SMTP 550 5.1.1 Recipient address rejected: User unknown',
        }
      }
      return {
        candidate_id: r.candidate_id,
        email,
        status: 'sent',
      }
    })
    return { sent: results }
  },
}

// ==========================================
// REAL HTTP API IMPLEMENTATION (FastAPI Backend)
// ==========================================
export const httpApi = {
  health: async (): Promise<{ status: string; version: string; database?: string }> => {
    const res = await fetch(`${API_BASE_URL}/health`)
    checkSyntheticResponse(res)
    if (!res.ok) throw new ApiError(res.status, 'Health check failed.')
    const data = await res.json()
    return HealthResponseSchema.parse(data)
  },

  uploadResumesBulk: async (
    files: File[],
    jobId?: string
  ): Promise<{ batch_id: string; total_files: number; status: string }> => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    if (jobId) {
      formData.append('job_id', jobId)
    }
    const res = await fetch(`${API_BASE_URL}/resumes/bulk`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
      throw new ApiError(res.status, err.detail || 'Failed to upload resumes.')
    }
    return res.json()
  },

  getBatchProgress: async (batchId: string): Promise<BatchProgress> => {
    const res = await fetch(`${API_BASE_URL}/batches/${batchId}/progress`)
    if (!res.ok) throw new ApiError(res.status, 'Failed to fetch batch progress.')
    const data = await res.json()
    return BatchProgressSchema.parse(data)
  },

  getCandidates: async (params: CandidateFilterParams = {}): Promise<CandidatesListResponse> => {
    const searchParams = new URLSearchParams()
    if (params.cgpa_min !== undefined) searchParams.append('cgpa_min', String(params.cgpa_min))
    if (params.tenth_min !== undefined) searchParams.append('tenth_min', String(params.tenth_min))
    if (params.twelfth_min !== undefined) searchParams.append('twelfth_min', String(params.twelfth_min))
    if (params.skills_all?.length) searchParams.append('skills_all', params.skills_all.join(','))
    if (params.skills_any?.length) searchParams.append('skills_any', params.skills_any.join(','))
    if (params.skills_none?.length) searchParams.append('skills_none', params.skills_none.join(','))
    if (params.exp_min !== undefined) searchParams.append('exp_min', String(params.exp_min))
    if (params.exp_max !== undefined) searchParams.append('exp_max', String(params.exp_max))
    if (params.city) searchParams.append('city', params.city)
    if (params.grad_year !== undefined) searchParams.append('grad_year', String(params.grad_year))
    if (params.q) searchParams.append('q', params.q)
    if (params.include_unknown !== undefined) searchParams.append('include_unknown', String(params.include_unknown))
    if (params.sort) searchParams.append('sort', params.sort)
    if (params.page !== undefined) searchParams.append('page', String(params.page))
    if (params.page_size !== undefined) searchParams.append('page_size', String(params.page_size))

    const res = await fetch(`${API_BASE_URL}/candidates?${searchParams.toString()}`)
    checkSyntheticResponse(res)
    if (!res.ok) throw new ApiError(res.status, 'Failed to load candidates.')
    const data = await res.json()
    const parsed = CandidatesListResponseSchema.parse(data)
    return {
      items: parsed.items.map((raw) => fromApiCandidate(raw)),
      total: parsed.total,
      page: parsed.page,
      page_size: parsed.page_size,
    }
  },

  getCandidate: async (id: string): Promise<Candidate> => {
    const res = await fetch(`${API_BASE_URL}/candidates/${id}`)
    if (!res.ok) throw new ApiError(res.status, 'Candidate not found.')
    const data = await res.json()
    const parsed = ApiCandidateSchema.parse(data)
    return fromApiCandidate(parsed)
  },

  patchCandidate: async (id: string, updates: Partial<Candidate>): Promise<Candidate> => {
    const payload = toApiCandidate(updates)
    const res = await fetch(`${API_BASE_URL}/candidates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new ApiError(res.status, 'Failed to update candidate.')
    const data = await res.json()
    const parsed = ApiCandidateSchema.parse(data)
    return fromApiCandidate(parsed)
  },

  getJobs: async (): Promise<Job[]> => {
    const res = await fetch(`${API_BASE_URL}/jobs`)
    checkSyntheticResponse(res)
    if (!res.ok) throw new ApiError(res.status, 'Failed to list jobs.')
    const data = await res.json()
    return (data || []).map((raw: any) => fromApiJob(raw))
  },

  getJob: async (id: string): Promise<Job> => {
    const res = await fetch(`${API_BASE_URL}/jobs/${id}`)
    if (!res.ok) throw new ApiError(res.status, 'Job not found.')
    const data = await res.json()
    return fromApiJob(data)
  },

  createJob: async (jobData: Omit<Job, 'id' | 'createdAt'>): Promise<Job> => {
    const payload = toApiJob(jobData as Partial<Job>)
    const res = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new ApiError(res.status, 'Failed to create job.')
    const data = await res.json()
    return fromApiJob(data)
  },

  patchJob: async (id: string, updates: Partial<Job>): Promise<Job> => {
    const payload = toApiJob(updates)
    const res = await fetch(`${API_BASE_URL}/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new ApiError(res.status, 'Failed to update job.')
    const data = await res.json()
    return fromApiJob(data)
  },

  getJobRanking: async (
    jobId: string,
    weights?: JobRankingWeightsParam
  ): Promise<JobRankingResponse> => {
    const params = new URLSearchParams()
    if (weights) {
      const s = weights.weights_skills ?? weights.skills
      const exp = weights.weights_experience ?? weights.experience
      const edu = weights.weights_education ?? weights.education
      const sem = weights.weights_semantic ?? weights.semantic
      if (s !== undefined) params.append('weights_skills', String(s))
      if (exp !== undefined) params.append('weights_experience', String(exp))
      if (edu !== undefined) params.append('weights_education', String(edu))
      if (sem !== undefined) params.append('weights_semantic', String(sem))
    }
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/ranking${qs}`)
    checkSyntheticResponse(res)
    if (!res.ok) throw new ApiError(res.status, 'Failed to retrieve job rankings.')
    const data = await res.json()
    const parsed = JobRankingResponseSchema.parse(data)
    return {
      job_id: parsed.job_id,
      weights_applied: parsed.weights_applied ?? undefined,
      candidates: parsed.candidates.map((c) => ({
        ...c,
        candidate: c.candidate ? fromApiCandidate(c.candidate) : undefined,
      })),
    } as unknown as JobRankingResponse
  },

  rematchJob: async (jobId: string): Promise<{ job_id: string; total_ranked: number; status: string }> => {
    const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/rematch`, {
      method: 'POST',
    })
    checkSyntheticResponse(res)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Rematch failed.' }))
      throw new ApiError(res.status, err.detail || 'Failed to re-match candidates.')
    }
    return res.json()
  },

  mergeDuplicates: async (groupId: string, primaryCandidateId: string): Promise<Candidate> => {
    const res = await fetch(`${API_BASE_URL}/duplicates/${encodeURIComponent(groupId)}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primary_candidate_id: primaryCandidateId }),
    })
    checkSyntheticResponse(res)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to merge duplicate group.' }))
      throw new ApiError(res.status, err.detail || 'Failed to merge duplicates.')
    }
    const data = await res.json()
    const parsed = MergeDuplicatesResponseSchema.parse(data)
    return fromApiCandidate(parsed.candidate)
  },

  createScorecard: async (applicationId: string, scorecard: ScorecardPayload): Promise<ScorecardRecord> => {
    const res = await fetch(`${API_BASE_URL}/applications/${encodeURIComponent(applicationId)}/scorecards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scorecard),
    })
    checkSyntheticResponse(res)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to submit scorecard.' }))
      throw new ApiError(res.status, err.detail || 'Failed to submit scorecard.')
    }
    const data = await res.json()
    return ScorecardRecordSchema.parse(data)
  },

  getScorecards: async (applicationId: string): Promise<ScorecardRecord[]> => {
    const res = await fetch(`${API_BASE_URL}/applications/${encodeURIComponent(applicationId)}/scorecards`)
    checkSyntheticResponse(res)
    if (!res.ok) throw new ApiError(res.status, 'Failed to fetch scorecards.')
    const data = await res.json()
    return z.array(ScorecardRecordSchema).parse(data)
  },

  getCandidateResumeUrl: (candidateId: string): string => {
    return `${API_BASE_URL}/candidates/${encodeURIComponent(candidateId)}/resume`
  },

  getJobSkillGap: async (jobId: string): Promise<SkillGapResponse> => {
    const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/skill-gap`)
    if (!res.ok) throw new ApiError(res.status, 'Failed to retrieve skill gap data.')
    const data = await res.json()
    return SkillGapResponseSchema.parse(data)
  },

  getApplications: async (jobId?: string): Promise<Application[]> => {
    const url = jobId && jobId !== 'all'
      ? `${API_BASE_URL}/applications?job_id=${encodeURIComponent(jobId)}`
      : `${API_BASE_URL}/applications`
    const res = await fetch(url)
    checkSyntheticResponse(res)
    if (!res.ok) throw new ApiError(res.status, 'Failed to fetch applications.')
    const data = await res.json()
    return (data || []).map((raw: any) => fromApiApplication(raw))
  },

  moveApplication: async (
    applicationId: string,
    newStage: string,
    reason?: string
  ): Promise<{ success: boolean; stage: string; historyId: string }> => {
    const res = await fetch(`${API_BASE_URL}/applications/${applicationId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage, reason }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to transition application stage.' }))
      throw new ApiError(res.status, err.detail || 'Invalid stage transition.')
    }
    return res.json()
  },

  compareCandidates: async (ids: string[], jobId?: string): Promise<CompareResponse> => {
    const params = new URLSearchParams()
    params.append('ids', ids.join(','))
    if (jobId) params.append('job_id', jobId)

    const res = await fetch(`${API_BASE_URL}/compare?${params.toString()}`)
    checkSyntheticResponse(res)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Comparison failed.' }))
      throw new ApiError(res.status, err.detail || 'Failed to compare candidates.')
    }
    const data = await res.json()
    return {
      job: data.job,
      candidates: (data.candidates || []).map((item: any) => ({
        ...item,
        candidate: fromApiCandidate(item.candidate || item),
      })),
    }
  },

  sendBulkEmail: async (payload: SendBulkEmailRequest): Promise<SendBulkEmailResponse> => {
    const res = await fetch(`${API_BASE_URL}/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    checkSyntheticResponse(res)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Email sending is not enabled on this server.' }))
      throw new ApiError(res.status, err.detail || 'Email sending is not enabled on this server.')
    }
    const data = await res.json()
    return SendBulkEmailResponseSchema.parse(data)
  },
}

// Default export uses Mock unless VITE_USE_MOCK=false
export type HireSwiftApiClient = typeof httpApi

export const api: HireSwiftApiClient = new Proxy({} as HireSwiftApiClient, {
  get(_target, prop) {
    const activeApi = getUseMock() ? mockApi : httpApi
    const value = (activeApi as any)[prop]
    if (typeof value === 'function') {
      return value.bind(activeApi)
    }
    return value
  },
})
