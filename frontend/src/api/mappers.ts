import { z } from 'zod'
import { Candidate, Application } from '@/types'

/**
 * Strict Zod Schema for FastAPI Candidate payloads (snake_case)
 */
export const ApiCandidateSchema = z.object({
  id: z.string(),
  company_id: z.string().optional().default('company-nova'),
  name: z.string(),
  email: z.string().default(''),
  phone: z.string().optional().default(''),
  location: z.string().optional().default(''),
  college: z.string().optional().default(''),
  degree: z.string().optional().default(''),
  branch: z.string().optional().default(''),
  grad_year: z.number().nullable().optional(),
  tenth_percent: z.number().nullable().optional(),
  twelfth_percent: z.number().nullable().optional(),
  cgpa: z.number().nullable().optional(),
  skills: z.array(z.string()).optional().default([]),
  experience_years: z.number().nullable().optional(),
  experience: z
    .array(
      z.object({
        title: z.string().default(''),
        company: z.string().default(''),
        duration: z.string().default(''),
        description: z.string().default(''),
      })
    )
    .optional()
    .default([]),
  projects: z
    .array(
      z.object({
        title: z.string().default(''),
        description: z.string().default(''),
        technologies: z.array(z.string()).default([]),
      })
    )
    .optional()
    .default([]),
  certifications: z.array(z.string()).optional().default([]),
  resume_text: z.string().optional().default(''),
  resume_file_name: z.string().optional().default(''),
  parse_confidence: z.number().nullable().optional(),
  field_confidence: z.record(z.number()).optional().default({}),
  custom_fields: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().default({}),
  is_duplicate: z.boolean().optional().default(false),
  duplicate_group_id: z.string().nullable().optional(),
  duplicate_type: z.string().nullable().optional(),
  duplicate_signal: z.string().nullable().optional(),
  group_id: z.string().nullable().optional(),
  source: z.string().optional().default('Upload'),
  created_at: z.string().optional(),
})

export type ApiCandidate = z.infer<typeof ApiCandidateSchema>

/**
 * Maps incoming snake_case backend Candidate to camelCase frontend model
 */
export function fromApiCandidate(raw: unknown): Candidate {
  // If already parsed or partial camelCase from mock, tolerate
  const data = ApiCandidateSchema.parse(raw)

  return {
    id: data.id,
    companyId: data.company_id || 'company-nova',
    name: data.name,
    email: data.email,
    phone: data.phone || '',
    location: data.location || 'India',
    college: data.college || '',
    degree: data.degree || '',
    branch: data.branch || '',
    gradYear: data.grad_year ?? null,
    tenthPercent: data.tenth_percent ?? null,
    twelfthPercent: data.twelfth_percent ?? null,
    cgpa: data.cgpa ?? null,
    skills: data.skills || [],
    experienceYears: data.experience_years ?? null,
    experience: data.experience || [],
    projects: data.projects || [],
    certifications: data.certifications || [],
    resumeText: data.resume_text || '',
    resumeFileName: data.resume_file_name || '',
    parseConfidence: data.parse_confidence ?? 85,
    fieldConfidence: data.field_confidence || {},
    customFields: data.custom_fields || {},
    isDuplicate: Boolean(data.is_duplicate),
    duplicateGroupId: data.duplicate_group_id || data.group_id || undefined,
    duplicateSignal: data.duplicate_signal || undefined,
    duplicateType: data.duplicate_type || undefined,
    source: data.source || 'Upload',
    createdAt: data.created_at || new Date().toISOString(),
  }
}

/**
 * Maps frontend camelCase Candidate updates to snake_case payload for PATCH / POST
 */
export function toApiCandidate(candidate: Partial<Candidate>): Record<string, any> {
  const result: Record<string, any> = {}

  if (candidate.id !== undefined) result.id = candidate.id
  if (candidate.companyId !== undefined) result.company_id = candidate.companyId
  if (candidate.name !== undefined) result.name = candidate.name
  if (candidate.email !== undefined) result.email = candidate.email
  if (candidate.phone !== undefined) result.phone = candidate.phone
  if (candidate.location !== undefined) result.location = candidate.location
  if (candidate.college !== undefined) result.college = candidate.college
  if (candidate.degree !== undefined) result.degree = candidate.degree
  if (candidate.branch !== undefined) result.branch = candidate.branch
  if (candidate.gradYear !== undefined) result.grad_year = candidate.gradYear
  if (candidate.tenthPercent !== undefined) result.tenth_percent = candidate.tenthPercent
  if (candidate.twelfthPercent !== undefined) result.twelfth_percent = candidate.twelfthPercent
  if (candidate.cgpa !== undefined) result.cgpa = candidate.cgpa
  if (candidate.skills !== undefined) result.skills = candidate.skills
  if (candidate.experienceYears !== undefined) result.experience_years = candidate.experienceYears
  if (candidate.experience !== undefined) result.experience = candidate.experience
  if (candidate.projects !== undefined) result.projects = candidate.projects
  if (candidate.certifications !== undefined) result.certifications = candidate.certifications
  if (candidate.resumeText !== undefined) result.resume_text = candidate.resumeText
  if (candidate.resumeFileName !== undefined) result.resume_file_name = candidate.resumeFileName
  if (candidate.parseConfidence !== undefined) result.parse_confidence = candidate.parseConfidence
  if (candidate.fieldConfidence !== undefined) result.field_confidence = candidate.fieldConfidence
  if (candidate.customFields !== undefined) result.custom_fields = candidate.customFields
  if (candidate.isDuplicate !== undefined) result.is_duplicate = candidate.isDuplicate
  if (candidate.duplicateGroupId !== undefined) result.duplicate_group_id = candidate.duplicateGroupId

  return result
}

/**
 * Strict Zod Schema for FastAPI Application payloads (snake_case)
 */
export const ApiApplicationSchema = z.object({
  application_id: z.string().optional(),
  id: z.string().optional(),
  company_id: z.string().optional().default('company-nova'),
  companyId: z.string().optional(),
  job_id: z.string().optional(),
  jobId: z.string().optional(),
  candidate_id: z.string().optional(),
  candidateId: z.string().optional(),
  stage: z.string().optional().default('applied'),
  match_score: z.number().nullable().optional(),
  matchScore: z.number().nullable().optional(),
  breakdown: z
    .object({
      skills: z.number().nullable().optional(),
      experience: z.number().nullable().optional(),
      education: z.number().nullable().optional(),
      semantic: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  matched_skills: z.array(z.string()).optional(),
  matchedSkills: z.array(z.string()).optional(),
  missing_skills: z.array(z.string()).optional(),
  missingSkills: z.array(z.string()).optional(),
  explanation: z.string().optional().default(''),
  evidence_snippets: z.array(z.string()).optional().default([]),
  evidenceSnippets: z.array(z.string()).optional().default([]),
  created_at: z.string().optional(),
  createdAt: z.string().optional(),
  candidate: z
    .object({
      name: z.string().optional().default('Candidate'),
      college: z.string().optional().default(''),
      location: z.string().optional().default(''),
      cgpa: z.number().nullable().optional(),
      skills: z.array(z.string()).optional().default([]),
      is_duplicate: z.boolean().optional().default(false),
    })
    .optional(),
})

export type ApiApplication = z.infer<typeof ApiApplicationSchema>

/**
 * Maps incoming snake_case backend Application to camelCase frontend model
 * Accepts application_id first, falling back to id per specification.
 * NO INVENTED VALUES: missing scores or breakdowns are mapped to null, NEVER 75.
 */
export function fromApiApplication(raw: unknown): Application {
  const data = ApiApplicationSchema.parse(raw)
  const appId = data.application_id || data.id || `app-${Date.now()}`

  const resolvedScore =
    data.match_score !== undefined
      ? data.match_score
      : data.matchScore !== undefined
      ? data.matchScore
      : null

  const resolvedBreakdown = data.breakdown
    ? {
        skills: data.breakdown.skills ?? null,
        experience: data.breakdown.experience ?? null,
        education: data.breakdown.education ?? null,
        semantic: data.breakdown.semantic ?? null,
      }
    : null

  return {
    id: appId,
    application_id: appId,
    companyId: data.company_id || data.companyId || 'company-nova',
    jobId: data.job_id || data.jobId || '',
    candidateId: data.candidate_id || data.candidateId || '',
    stage: data.stage || 'applied',
    matchScore: resolvedScore,
    breakdown: resolvedBreakdown,
    matchedSkills: data.matched_skills || data.matchedSkills || [],
    missingSkills: data.missing_skills || data.missingSkills || [],
    explanation: data.explanation || '',
    evidenceSnippets: data.evidence_snippets || data.evidenceSnippets || [],
    notes: [],
    createdAt: data.created_at || data.createdAt || new Date().toISOString(),
    candidate: data.candidate
      ? {
          name: data.candidate.name || 'Candidate',
          college: data.candidate.college || '',
          location: data.candidate.location || '',
          cgpa: data.candidate.cgpa ?? null,
          skills: data.candidate.skills || [],
          is_duplicate: Boolean(data.candidate.is_duplicate),
        }
      : undefined,
  }
}
