import { z } from 'zod'
import { Candidate } from '@/types'

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
