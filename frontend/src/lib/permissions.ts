import { Role } from '@/types'

export const canManageSettings = (role?: Role): boolean => role === 'Admin'

export const canAdvanceStage = (role?: Role): boolean => role === 'Admin' || role === 'Recruiter'

export const canSendEmail = (role?: Role): boolean => role === 'Admin' || role === 'Recruiter'

export const canEditCandidate = (role?: Role): boolean => role === 'Admin' || role === 'Recruiter'

export const canUploadResumes = (role?: Role): boolean => role === 'Admin' || role === 'Recruiter'

export const isReadOnlyViewer = (role?: Role): boolean => role === 'Viewer'
