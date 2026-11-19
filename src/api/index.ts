import { useAppStore } from '@/store'
import {
  Company,
  CompanySettings,
  User,
  Job,
  Candidate,
  Application,
  StageHistory,
  EmailTemplate,
  EmailLog,
  DuplicateGroup,
  Notification,
  AuditLog,
  InterviewScorecard,
} from '@/types'

// Helper to simulate network latency
const sleep = (ms = 250): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export const authApi = {
  login: async (email: string): Promise<User> => {
    await sleep(300)
    const success = useAppStore.getState().login(email)
    if (!success) {
      throw new Error('Invalid email or password.')
    }
    const user = useAppStore.getState().currentUser
    if (!user) throw new Error('User not found.')
    return user
  },

  getCurrentUser: async (): Promise<User | null> => {
    await sleep(100)
    return useAppStore.getState().currentUser
  },

  logout: async (): Promise<void> => {
    await sleep(150)
    useAppStore.getState().logout()
  },

  registerCompany: async (
    companyName: string,
    adminName: string,
    adminEmail: string
  ): Promise<{ company: Company; user: User }> => {
    await sleep(400)
    return useAppStore.getState().registerCompany(companyName, adminName, adminEmail)
  },

  inviteTeamMember: async (name: string, email: string, role: User['role']): Promise<void> => {
    await sleep(250)
    useAppStore.getState().inviteTeamMember(name, email, role)
    useAppStore.getState().addAuditLog('Team Member Invited', `Invited ${name} (${email}) as ${role}`)
  },

  updateRole: async (userId: string, role: User['role']): Promise<void> => {
    await sleep(200)
    useAppStore.getState().updateTeamMemberRole(userId, role)
    useAppStore.getState().addAuditLog('Role Updated', `Updated role for user ${userId} to ${role}`)
  },

  removeMember: async (userId: string): Promise<void> => {
    await sleep(250)
    useAppStore.getState().removeTeamMember(userId)
    useAppStore.getState().addAuditLog('Team Member Removed', `Removed user ${userId}`)
  },
}

export const companyApi = {
  getCompany: async (companyId?: string): Promise<Company> => {
    await sleep(150)
    const store = useAppStore.getState()
    const targetId = companyId || store.currentCompanyId
    const company = store.companies.find((c) => c.id === targetId)
    if (!company) throw new Error('Company not found.')
    return company
  },

  updateSettings: async (settings: Partial<CompanySettings>): Promise<void> => {
    await sleep(300)
    const store = useAppStore.getState()
    store.updateCompanySettings(store.currentCompanyId, settings)
    store.addAuditLog('Updated Company Settings', 'Settings modified')
  },

  updateCompany: async (updates: Partial<Company>): Promise<void> => {
    await sleep(250)
    const store = useAppStore.getState()
    store.updateCompany(store.currentCompanyId, updates)
    store.addAuditLog('Company Profile Updated', 'Company information updated')
  },
}

export const jobsApi = {
  listJobs: async (companyId?: string): Promise<Job[]> => {
    await sleep(200)
    const store = useAppStore.getState()
    const targetId = companyId || store.currentCompanyId
    return store.jobs.filter((j) => j.companyId === targetId)
  },

  getJob: async (jobId: string): Promise<Job | null> => {
    await sleep(150)
    return useAppStore.getState().jobs.find((j) => j.id === jobId) || null
  },

  createJob: async (jobData: Omit<Job, 'id' | 'createdAt'>): Promise<Job> => {
    await sleep(350)
    const store = useAppStore.getState()
    const newJob = store.addJob(jobData)
    store.addAuditLog('Created Job', `Posted new job: ${newJob.title}`)
    return newJob
  },

  updateJob: async (jobId: string, updates: Partial<Job>): Promise<void> => {
    await sleep(250)
    const store = useAppStore.getState()
    store.updateJob(jobId, updates)
    store.addAuditLog('Updated Job', `Modified job ${jobId}`)
  },

  deleteJob: async (jobId: string): Promise<void> => {
    await sleep(300)
    const store = useAppStore.getState()
    store.deleteJob(jobId)
    store.addAuditLog('Deleted Job', `Deleted job ${jobId}`)
  },

  rematchTalentPool: async (jobId: string): Promise<void> => {
    await sleep(400)
    const store = useAppStore.getState()
    store.rematchTalentPool(jobId)
    store.addAuditLog('Re-matched Talent Pool', `Re-scored all candidates against job ${jobId}`)
  },
}

export const candidatesApi = {
  listCandidates: async (companyId?: string): Promise<Candidate[]> => {
    await sleep(200)
    const store = useAppStore.getState()
    const targetId = companyId || store.currentCompanyId
    return store.candidates.filter((c) => c.companyId === targetId)
  },

  getCandidate: async (candidateId: string): Promise<Candidate | null> => {
    await sleep(150)
    return useAppStore.getState().candidates.find((c) => c.id === candidateId) || null
  },

  createCandidateWithApplication: async (
    candidateData: Omit<Candidate, 'id' | 'createdAt'>,
    jobId: string,
    initialStage = 'applied'
  ): Promise<{ candidate: Candidate; application: Application }> => {
    await sleep(350)
    const store = useAppStore.getState()
    const result = store.addCandidateWithApplication(candidateData, jobId, initialStage)
    store.addAuditLog('Candidate Ingested', `Candidate ${result.candidate.name} created and applied to job ${jobId}`)
    return result
  },

  updateCandidate: async (candidateId: string, updates: Partial<Candidate>): Promise<void> => {
    await sleep(200)
    const store = useAppStore.getState()
    store.updateCandidate(candidateId, updates)
    store.addAuditLog('Candidate Updated', `Updated profile of ${candidateId}`)
  },

  deleteCandidate: async (candidateId: string): Promise<void> => {
    await sleep(300)
    const store = useAppStore.getState()
    store.deleteCandidate(candidateId)
    store.addAuditLog('Candidate Deleted', `Deleted candidate record ${candidateId}`)
  },
}

export const applicationsApi = {
  listApplications: async (companyId?: string): Promise<Application[]> => {
    await sleep(200)
    const store = useAppStore.getState()
    const targetId = companyId || store.currentCompanyId
    return store.applications.filter((a) => a.companyId === targetId)
  },

  getApplication: async (applicationId: string): Promise<Application | null> => {
    await sleep(150)
    return useAppStore.getState().applications.find((a) => a.id === applicationId) || null
  },

  updateStage: async (applicationId: string, newStage: string, reason?: string): Promise<void> => {
    await sleep(250)
    const store = useAppStore.getState()
    store.updateApplicationStage(applicationId, newStage, reason)
    store.addAuditLog('Stage Changed', `Moved application ${applicationId} to ${newStage}`)
  },

  bulkUpdateStage: async (applicationIds: string[], newStage: string, reason?: string): Promise<void> => {
    await sleep(350)
    const store = useAppStore.getState()
    store.bulkUpdateApplicationStage(applicationIds, newStage, reason)
    store.addAuditLog('Bulk Stage Update', `Moved ${applicationIds.length} applications to ${newStage}`)
  },

  addNote: async (applicationId: string, text: string): Promise<void> => {
    await sleep(150)
    const store = useAppStore.getState()
    store.addApplicationNote(applicationId, text)
  },

  addScorecard: async (
    applicationId: string,
    scorecard: Omit<InterviewScorecard, 'id' | 'createdAt'>
  ): Promise<void> => {
    await sleep(250)
    const store = useAppStore.getState()
    store.addScorecard(applicationId, scorecard)
    store.addAuditLog('Interview Scorecard Added', `Submitted evaluation for application ${applicationId}`)
  },
}

export const stageHistoryApi = {
  listHistory: async (applicationId: string): Promise<StageHistory[]> => {
    await sleep(150)
    return useAppStore.getState().stageHistories.filter((h) => h.applicationId === applicationId)
  },
}

export const emailsApi = {
  sendEmail: async (data: Omit<EmailLog, 'id' | 'sentAt'>): Promise<void> => {
    await sleep(300)
    const store = useAppStore.getState()
    store.sendEmail(data)
    store.addAuditLog('Sent Email', `Sent email to ${data.recipientEmail}: "${data.subject}"`)
  },

  listTemplates: async (companyId?: string): Promise<EmailTemplate[]> => {
    await sleep(150)
    const store = useAppStore.getState()
    const targetId = companyId || store.currentCompanyId
    return store.emailTemplates.filter((t) => t.companyId === targetId)
  },

  createTemplate: async (template: Omit<EmailTemplate, 'id'>): Promise<void> => {
    await sleep(200)
    const store = useAppStore.getState()
    store.addEmailTemplate(template)
  },

  updateTemplate: async (id: string, updates: Partial<EmailTemplate>): Promise<void> => {
    await sleep(200)
    const store = useAppStore.getState()
    store.updateEmailTemplate(id, updates)
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await sleep(200)
    const store = useAppStore.getState()
    store.deleteEmailTemplate(id)
  },

  listLogs: async (companyId?: string): Promise<EmailLog[]> => {
    await sleep(150)
    const store = useAppStore.getState()
    const targetId = companyId || store.currentCompanyId
    return store.emailLogs.filter((l) => l.companyId === targetId)
  },
}

export const duplicatesApi = {
  listDuplicates: async (companyId?: string): Promise<DuplicateGroup[]> => {
    await sleep(200)
    const store = useAppStore.getState()
    const targetId = companyId || store.currentCompanyId
    return store.duplicateGroups.filter((g) => g.companyId === targetId)
  },

  merge: async (groupId: string, primaryCandidateId: string): Promise<void> => {
    await sleep(350)
    const store = useAppStore.getState()
    store.mergeDuplicates(groupId, primaryCandidateId)
    store.addAuditLog('Merged Duplicates', `Merged duplicate group ${groupId} keeping ${primaryCandidateId}`)
  },

  dismiss: async (groupId: string): Promise<void> => {
    await sleep(200)
    const store = useAppStore.getState()
    store.dismissDuplicate(groupId)
  },

  keepBoth: async (groupId: string): Promise<void> => {
    await sleep(200)
    const store = useAppStore.getState()
    store.keepBothDuplicates(groupId)
  },
}

export const notificationsApi = {
  listNotifications: async (companyId?: string): Promise<Notification[]> => {
    await sleep(150)
    const store = useAppStore.getState()
    const targetId = companyId || store.currentCompanyId
    return store.notifications.filter((n) => n.companyId === targetId)
  },

  markRead: async (notificationId: string): Promise<void> => {
    await sleep(100)
    useAppStore.getState().markNotificationRead(notificationId)
  },
}

export const auditApi = {
  listLogs: async (companyId?: string): Promise<AuditLog[]> => {
    await sleep(150)
    const store = useAppStore.getState()
    const targetId = companyId || store.currentCompanyId
    return store.auditLogs.filter((l) => l.companyId === targetId)
  },
}
