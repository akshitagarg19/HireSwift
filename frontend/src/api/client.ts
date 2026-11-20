import { z } from 'zod'
import { Candidate, Job, Application, Company } from '@/types'
import { useAppStore } from '@/store'
import { matchScore } from '@/lib/scoring'
import { ApiCandidateSchema, fromApiCandidate, toApiCandidate } from './mappers'

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
  match_score: z.number(),
  breakdown: z.object({
    skills: z.number(),
    experience: z.number(),
    education: z.number(),
    semantic: z.number(),
  }),
  matched_skills: z.array(z.string()).default([]),
  missing_skills: z.array(z.string()).default([]),
  explanation: z.string().default(''),
  stage: z.string().default('applied'),
})

export const JobRankingResponseSchema = z.object({
  job_id: z.string(),
  candidates: z.array(JobRankingItemSchema),
})

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
  candidate: Candidate;
  application_id: string;
  match_score: number;
  breakdown: {
    skills: number;
    experience: number;
    education: number;
    semantic: number;
  };
  matched_skills: string[];
  missing_skills: string[];
  explanation: string;
  stage: string;
}

export interface JobRankingResponse {
  job_id: string;
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
  match_score: number;
  breakdown: {
    skills: number;
    experience: number;
    education: number;
    semantic: number;
  };
  matched_skills: string[];
  missing_skills: string[];
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
    files: File[]
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

  getJobRanking: async (jobId: string): Promise<JobRankingResponse> => {
    await sleep(200)
    const store = useAppStore.getState()
    const job = store.jobs.find((j) => j.id === jobId)
    if (!job) throw new ApiError(404, `Job ${jobId} not found.`)

    const company = store.companies.find((c) => c.id === job.companyId)
    const weights = job.scoringWeights || company?.settings.scoringWeights || {
      skills: 40,
      experience: 25,
      education: 20,
      semantic: 15,
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
    ranked.sort((a, b) => b.match_score - a.match_score)

    return {
      job_id: jobId,
      candidates: ranked,
    }
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
    const app = store.applications.find((a) => a.id === applicationId)
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
      let evaluated = {
        score: 75,
        breakdown: { skills: 70, experience: 80, education: 75, semantic: 75 },
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
}

// ==========================================
// REAL HTTP API IMPLEMENTATION (FastAPI Backend)
// ==========================================
export const httpApi = {
  health: async (): Promise<{ status: string; version: string; database?: string }> => {
    const res = await fetch(`${API_BASE_URL}/health`)
    if (!res.ok) throw new ApiError(res.status, 'Health check failed.')
    const data = await res.json()
    return HealthResponseSchema.parse(data)
  },

  uploadResumesBulk: async (
    files: File[]
  ): Promise<{ batch_id: string; total_files: number; status: string }> => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
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
    if (!res.ok) throw new ApiError(res.status, 'Failed to list jobs.')
    return res.json()
  },

  getJob: async (id: string): Promise<Job> => {
    const res = await fetch(`${API_BASE_URL}/jobs/${id}`)
    if (!res.ok) throw new ApiError(res.status, 'Job not found.')
    return res.json()
  },

  createJob: async (jobData: Omit<Job, 'id' | 'createdAt'>): Promise<Job> => {
    const res = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData),
    })
    if (!res.ok) throw new ApiError(res.status, 'Failed to create job.')
    return res.json()
  },

  patchJob: async (id: string, updates: Partial<Job>): Promise<Job> => {
    const res = await fetch(`${API_BASE_URL}/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new ApiError(res.status, 'Failed to update job.')
    return res.json()
  },

  getJobRanking: async (jobId: string): Promise<JobRankingResponse> => {
    const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/ranking`)
    if (!res.ok) throw new ApiError(res.status, 'Failed to retrieve job rankings.')
    const data = await res.json()
    const parsed = JobRankingResponseSchema.parse(data)
    return {
      job_id: parsed.job_id,
      candidates: parsed.candidates.map((c) => ({
        ...c,
        candidate: c.candidate ? fromApiCandidate(c.candidate) : undefined,
      })),
    } as unknown as JobRankingResponse
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
    if (!res.ok) throw new ApiError(res.status, 'Failed to fetch applications.')
    const data = await res.json()
    return (data || []).map((raw: any) => ({
      id: raw.id,
      companyId: raw.company_id || raw.companyId || 'company-nova',
      jobId: raw.job_id || raw.jobId,
      candidateId: raw.candidate_id || raw.candidateId,
      stage: raw.stage || 'applied',
      matchScore: raw.match_score ?? raw.matchScore ?? 75,
      breakdown: raw.breakdown || { skills: 75, experience: 75, education: 75, semantic: 75 },
      matchedSkills: raw.matched_skills || raw.matchedSkills || [],
      missingSkills: raw.missing_skills || raw.missingSkills || [],
      explanation: raw.explanation || '',
      evidenceSnippets: raw.evidence_snippets || raw.evidenceSnippets || [],
      notes: raw.notes || [],
      createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    }))
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
