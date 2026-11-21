import { z } from 'zod'
import { Job } from '@/types'

/**
 * Strict Zod Schema for FastAPI Job payloads in snake_case:
 * (id, title, department, location, jd_text, required_skills, preferred_skills,
 *  min_experience, min_cgpa, grad_years, status, created_at, applicant_count)
 */
export const ApiJobSchema = z.object({
  id: z.string(),
  company_id: z.string().optional().default('company-nova'),
  companyId: z.string().optional(),
  title: z.string(),
  department: z.string().optional().default('Engineering'),
  location: z.string().optional().default('Bengaluru'),
  type: z.string().optional().default('Full-time'),
  jd_text: z.string().optional().default(''),
  jdText: z.string().optional(),
  required_skills: z.array(z.string()).optional().default([]),
  preferred_skills: z.array(z.string()).optional().default([]),
  requirements: z
    .object({
      requiredSkills: z.array(z.string()).optional(),
      preferredSkills: z.array(z.string()).optional(),
      minExperience: z.number().optional(),
      minCgpa: z.number().optional(),
      gradYears: z.array(z.number()).optional(),
    })
    .optional(),
  min_experience: z.number().nullable().optional(),
  min_cgpa: z.number().nullable().optional(),
  grad_years: z.array(z.number()).optional().default([]),
  status: z.string().optional().default('active'),
  created_at: z.string().optional(),
  createdAt: z.string().optional(),
  applicant_count: z.number().optional().default(0),
  applicantCount: z.number().optional(),
})

export type ApiJob = z.infer<typeof ApiJobSchema>

/**
 * Maps incoming backend snake_case Job to frontend camelCase Job model
 */
export function fromApiJob(raw: unknown): Job {
  const data = ApiJobSchema.parse(raw)

  const reqSkills =
    data.required_skills?.length > 0
      ? data.required_skills
      : data.requirements?.requiredSkills || []

  const prefSkills =
    data.preferred_skills?.length > 0
      ? data.preferred_skills
      : data.requirements?.preferredSkills || []

  const minExp =
    data.min_experience !== undefined && data.min_experience !== null
      ? data.min_experience
      : data.requirements?.minExperience ?? 0

  const minCgpa =
    data.min_cgpa !== undefined && data.min_cgpa !== null
      ? data.min_cgpa
      : data.requirements?.minCgpa ?? 0

  const gradYears =
    data.grad_years?.length > 0
      ? data.grad_years
      : data.requirements?.gradYears || []

  const normalizedStatus =
    data.status?.toLowerCase() === 'closed'
      ? 'Closed'
      : data.status?.toLowerCase() === 'paused'
      ? 'Paused'
      : 'Active'

  return {
    id: data.id,
    companyId: data.company_id || data.companyId || 'company-nova',
    title: data.title,
    department: data.department || 'Engineering',
    location: data.location || 'Bengaluru',
    type: (data.type as any) || 'Full-time',
    jdText: data.jd_text || data.jdText || '',
    requirements: {
      requiredSkills: reqSkills,
      preferredSkills: prefSkills,
      minExperience: minExp,
      minCgpa: minCgpa,
      gradYears: gradYears,
    },
    status: normalizedStatus,
    createdAt: data.created_at || data.createdAt || new Date().toISOString(),
    applicantCount: data.applicant_count ?? data.applicantCount ?? 0,
    applicant_count: data.applicant_count ?? data.applicantCount ?? 0,
  }
}

/**
 * Maps frontend camelCase Job model to snake_case payload for POST / PATCH
 */
export function toApiJob(job: Partial<Job>): Record<string, any> {
  const result: Record<string, any> = {}

  if (job.id !== undefined) result.id = job.id
  if (job.companyId !== undefined) result.company_id = job.companyId
  if (job.title !== undefined) result.title = job.title
  if (job.department !== undefined) result.department = job.department
  if (job.location !== undefined) result.location = job.location
  if (job.type !== undefined) result.type = job.type
  if (job.jdText !== undefined) result.jd_text = job.jdText
  if (job.requirements?.requiredSkills !== undefined) result.required_skills = job.requirements.requiredSkills
  if (job.requirements?.preferredSkills !== undefined) result.preferred_skills = job.requirements.preferredSkills
  if (job.requirements?.minExperience !== undefined) result.min_experience = job.requirements.minExperience
  if (job.requirements?.minCgpa !== undefined) result.min_cgpa = job.requirements.minCgpa
  if (job.requirements?.gradYears !== undefined) result.grad_years = job.requirements.gradYears
  if (job.status !== undefined) result.status = job.status.toLowerCase()
  if (job.createdAt !== undefined) result.created_at = job.createdAt
  if (job.applicantCount !== undefined) result.applicant_count = job.applicantCount

  return result
}
