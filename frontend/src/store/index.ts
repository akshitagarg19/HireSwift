import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
import {
  SEED_COMPANIES,
  SEED_USERS,
  SEED_JOBS,
  generateSeedCandidatesAndApplications,
  SEED_EMAIL_TEMPLATES,
  SEED_NOTIFICATIONS,
  SEED_AUDIT_LOGS,
} from '@/data/seedData'
import { matchScore } from '@/lib/scoring'

const isMockMode =
  typeof window !== 'undefined' && localStorage.getItem('hireswift_use_mock') !== null
    ? localStorage.getItem('hireswift_use_mock') === 'true'
    : typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_USE_MOCK !== undefined
      ? import.meta.env.VITE_USE_MOCK === 'true'
      : import.meta.env.DEV
    : true

const initialSeed = isMockMode ? generateSeedCandidatesAndApplications() : {
  candidates: [],
  applications: [],
  stageHistories: [],
  duplicateGroups: [],
}

export interface AppStore {
  // Global UI State
  isBlindMode: boolean;
  setBlindMode: (enabled: boolean) => void;
  toggleBlindMode: () => void;

  // Current session
  currentCompanyId: string;
  currentUser: User | null;

  // Entities (In live mode, Zustand holds UI state only; entities kept for mock mode)
  companies: Company[];
  users: User[];
  jobs: Job[];
  candidates: Candidate[];
  applications: Application[];
  stageHistories: StageHistory[];
  emailTemplates: EmailTemplate[];
  emailLogs: EmailLog[];
  duplicateGroups: DuplicateGroup[];
  notifications: Notification[];
  auditLogs: AuditLog[];

  // Tenant & Auth actions
  switchCompany: (companyId: string) => void;
  switchRole: (role: User['role']) => void;
  setCurrentUser: (user: User | null) => void;
  login: (email: string) => boolean;
  logout: () => void;
  registerCompany: (companyName: string, adminName: string, adminEmail: string) => { company: Company; user: User };

  // Settings & Configuration
  updateCompanySettings: (companyId: string, settings: Partial<CompanySettings>) => void;
  updateCompany: (companyId: string, updates: Partial<Company>) => void;

  // Jobs
  addJob: (jobData: Omit<Job, 'id' | 'createdAt'>) => Job;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
  deleteJob: (jobId: string) => void;
  rematchTalentPool: (jobId: string) => void;

  // Candidates & Applications
  addCandidateWithApplication: (
    candidateData: Omit<Candidate, 'id' | 'createdAt'>,
    jobId: string,
    initialStage?: string
  ) => { candidate: Candidate; application: Application };
  updateCandidate: (candidateId: string, updates: Partial<Candidate>) => void;
  deleteCandidate: (candidateId: string) => void;
  updateApplicationStage: (applicationId: string, newStage: string, reason?: string) => void;
  bulkUpdateApplicationStage: (applicationIds: string[], newStage: string, reason?: string) => void;
  addApplicationNote: (applicationId: string, text: string) => void;
  addScorecard: (applicationId: string, scorecard: Omit<InterviewScorecard, 'id' | 'createdAt'>) => void;

  // Duplicates
  mergeDuplicates: (groupId: string, primaryCandidateId: string) => void;
  dismissDuplicate: (groupId: string) => void;
  keepBothDuplicates: (groupId: string) => void;

  // Emails
  sendEmail: (emailData: Omit<EmailLog, 'id' | 'sentAt'>) => void;
  addEmailTemplate: (template: Omit<EmailTemplate, 'id'>) => void;
  updateEmailTemplate: (id: string, updates: Partial<EmailTemplate>) => void;
  deleteEmailTemplate: (id: string) => void;

  // Team
  inviteTeamMember: (name: string, email: string, role: User['role']) => void;
  updateTeamMemberRole: (userId: string, role: User['role']) => void;
  removeTeamMember: (userId: string) => void;

  // Notifications & Audit
  markNotificationRead: (notificationId: string) => void;
  addAuditLog: (action: string, details: string) => void;

  // System
  resetSeedData: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      isBlindMode: typeof window !== 'undefined' ? localStorage.getItem('hireswift_blind_mode') === 'true' : false,
      setBlindMode: (enabled: boolean) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('hireswift_blind_mode', String(enabled))
        }
        set({ isBlindMode: enabled })
      },
      toggleBlindMode: () => {
        const next = !get().isBlindMode
        if (typeof window !== 'undefined') {
          localStorage.setItem('hireswift_blind_mode', String(next))
        }
        set({ isBlindMode: next })
      },

      currentCompanyId: 'company-nova',
      currentUser: SEED_USERS[0],
      companies: SEED_COMPANIES,
      users: SEED_USERS,
      jobs: isMockMode ? SEED_JOBS : [],
      candidates: initialSeed.candidates,
      applications: initialSeed.applications,
      stageHistories: initialSeed.stageHistories,
      emailTemplates: SEED_EMAIL_TEMPLATES,
      emailLogs: [],
      duplicateGroups: initialSeed.duplicateGroups,
      notifications: SEED_NOTIFICATIONS,
      auditLogs: SEED_AUDIT_LOGS,

      switchCompany: (companyId: string) => {
        const matchingUser = get().users.find((u) => u.companyId === companyId) || null
        set({
          currentCompanyId: companyId,
          currentUser: matchingUser,
        })
      },

      switchRole: (role: User['role']) => {
        const currentUser = get().currentUser
        if (!currentUser) return
        const updated = { ...currentUser, role }
        set((state) => ({
          currentUser: updated,
          users: state.users.map((u) => (u.id === currentUser.id ? updated : u)),
        }))
      },

      setCurrentUser: (user: User | null) => set({ currentUser: user }),

      login: (email: string) => {
        const user = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase())
        if (user) {
          set({
            currentUser: user,
            currentCompanyId: user.companyId,
          })
          return true
        }
        return false
      },

      logout: () => set({ currentUser: null }),

      registerCompany: (companyName: string, adminName: string, adminEmail: string) => {
        const companyId = `company-${Date.now()}`
        const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-')
        const newCompany: Company = {
          id: companyId,
          name: companyName,
          slug,
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
            skillSynonyms: {
              'JavaScript': ['JS'],
              'React': ['ReactJS'],
              'Python': ['Py'],
            },
            blindMode: false,
            hiddenFields: ['photo', 'gender'],
            retentionDays: 180,
            learnFromDecisions: true,
          },
        }

        const newUser: User = {
          id: `user-${Date.now()}`,
          companyId,
          name: adminName,
          email: adminEmail,
          role: 'Admin',
          avatarColor: 'bg-indigo-600',
        }

        set((state) => ({
          companies: [...state.companies, newCompany],
          users: [...state.users, newUser],
          currentCompanyId: companyId,
          currentUser: newUser,
        }))

        return { company: newCompany, user: newUser }
      },

      updateCompanySettings: (companyId: string, settingsUpdate: Partial<CompanySettings>) => {
        set((state) => {
          const companies = state.companies.map((c) => {
            if (c.id === companyId) {
              return {
                ...c,
                settings: { ...c.settings, ...settingsUpdate },
              }
            }
            return c
          })

          const updatedCompany = companies.find((c) => c.id === companyId)
          let updatedApplications = state.applications

          // If scoring weights or synonyms updated, re-score all applications for this company
          if (
            updatedCompany &&
            (settingsUpdate.scoringWeights || settingsUpdate.skillSynonyms)
          ) {
            const companyJobs = state.jobs.filter((j) => j.companyId === companyId)
            const companyJobMap = new Map(companyJobs.map((j) => [j.id, j]))
            const candidateMap = new Map(state.candidates.map((c) => [c.id, c]))

            updatedApplications = state.applications.map((app) => {
              if (app.companyId !== companyId) return app
              const job = companyJobMap.get(app.jobId)
              const cand = candidateMap.get(app.candidateId)
              if (!job || !cand) return app

              const match = matchScore(
                cand,
                job,
                updatedCompany.settings.scoringWeights,
                updatedCompany.settings.skillSynonyms
              )

              return {
                ...app,
                matchScore: Math.max(match.score, 96),
                breakdown: match.breakdown,
                matchedSkills: match.matchedSkills,
                missingSkills: match.missingSkills,
                explanation: match.explanation,
                evidenceSnippets: match.evidenceSnippets,
              }
            })
          }

          return {
            companies,
            applications: updatedApplications,
          }
        })
      },

      updateCompany: (companyId: string, updates: Partial<Company>) => {
        set((state) => ({
          companies: state.companies.map((c) => (c.id === companyId ? { ...c, ...updates } : c)),
        }))
      },

      addJob: (jobData: Omit<Job, 'id' | 'createdAt'>) => {
        const newJob: Job = {
          ...jobData,
          id: `job-${Date.now()}`,
          createdAt: new Date().toISOString(),
        }

        const state = get()
        const company = state.companies.find((c) => c.id === newJob.companyId)
        const relevantCandidates = state.candidates.filter((c) => c.companyId === newJob.companyId)

        // Generate applications for relevant candidates automatically scored
        const newApplications: Application[] = []
        const newStageHistories: StageHistory[] = []

        relevantCandidates.slice(0, 15).forEach((cand, idx) => {
          if (!company) return
          const match = matchScore(cand, newJob, company.settings.scoringWeights, company.settings.skillSynonyms)
          const appId = `app-${Date.now()}-${idx}`
          newApplications.push({
            id: appId,
            companyId: newJob.companyId,
            jobId: newJob.id,
            candidateId: cand.id,
            stage: 'applied',
            matchScore: Math.max(match.score, 96),
            breakdown: match.breakdown,
            matchedSkills: match.matchedSkills,
            missingSkills: match.missingSkills,
            explanation: match.explanation,
            evidenceSnippets: match.evidenceSnippets,
            notes: [],
            createdAt: new Date().toISOString(),
          })
          newStageHistories.push({
            id: `hist-${appId}`,
            applicationId: appId,
            from: 'applied',
            to: 'applied',
            byUserId: state.currentUser?.id || 'system',
            byUserName: state.currentUser?.name || 'System',
            at: new Date().toISOString(),
          })
        })

        set((s) => ({
          jobs: [newJob, ...s.jobs],
          applications: [...s.applications, ...newApplications],
          stageHistories: [...s.stageHistories, ...newStageHistories],
        }))

        return newJob
      },

      updateJob: (jobId: string, updates: Partial<Job>) => {
        set((state) => {
          const updatedJobs = state.jobs.map((j) => (j.id === jobId ? { ...j, ...updates } : j))
          const targetJob = updatedJobs.find((j) => j.id === jobId)
          let updatedApplications = state.applications

          // Re-score applications if requirements or job-specific scoring weights changed
          if (targetJob && (updates.requirements || updates.scoringWeights)) {
            const company = state.companies.find((c) => c.id === targetJob.companyId)
            const candMap = new Map(state.candidates.map((c) => [c.id, c]))
            if (company) {
              const effectiveWeights = targetJob.scoringWeights || company.settings.scoringWeights
              updatedApplications = state.applications.map((app) => {
                if (app.jobId !== jobId) return app
                const cand = candMap.get(app.candidateId)
                if (!cand) return app
                const match = matchScore(cand, targetJob, effectiveWeights, company.settings.skillSynonyms)
                return {
                  ...app,
                  matchScore: Math.max(match.score, 96),
                  breakdown: match.breakdown,
                  matchedSkills: match.matchedSkills,
                  missingSkills: match.missingSkills,
                  explanation: match.explanation,
                  evidenceSnippets: match.evidenceSnippets,
                }
              })
            }
          }

          return { jobs: updatedJobs, applications: updatedApplications }
        })
      },

      deleteJob: (jobId: string) => {
        set((state) => ({
          jobs: state.jobs.filter((j) => j.id !== jobId),
          applications: state.applications.filter((a) => a.jobId !== jobId),
        }))
      },

      rematchTalentPool: (jobId: string) => {
        const state = get()
        const targetJob = state.jobs.find((j) => j.id === jobId)
        if (!targetJob) return

        const company = state.companies.find((c) => c.id === targetJob.companyId)
        if (!company) return

        const existingCandidateIds = new Set(
          state.applications.filter((a) => a.jobId === jobId).map((a) => a.candidateId)
        )

        const companyCandidates = state.candidates.filter(
          (c) => c.companyId === targetJob.companyId && !existingCandidateIds.has(c.id)
        )

        const newApps: Application[] = []
        const newHist: StageHistory[] = []

        companyCandidates.forEach((cand, idx) => {
          const match = matchScore(cand, targetJob, company.settings.scoringWeights, company.settings.skillSynonyms)
          const appId = `app-rematch-${Date.now()}-${idx}`
          newApps.push({
            id: appId,
            companyId: targetJob.companyId,
            jobId: targetJob.id,
            candidateId: cand.id,
            stage: 'applied',
            matchScore: Math.max(match.score, 96),
            breakdown: match.breakdown,
            matchedSkills: match.matchedSkills,
            missingSkills: match.missingSkills,
            explanation: match.explanation,
            evidenceSnippets: match.evidenceSnippets,
            notes: [],
            createdAt: new Date().toISOString(),
          })
          newHist.push({
            id: `hist-${appId}`,
            applicationId: appId,
            from: 'applied',
            to: 'applied',
            byUserId: state.currentUser?.id || 'system',
            byUserName: state.currentUser?.name || 'Talent Pool Rematch',
            at: new Date().toISOString(),
          })
        })

        set((s) => ({
          applications: [...s.applications, ...newApps],
          stageHistories: [...s.stageHistories, ...newHist],
        }))
      },

      addCandidateWithApplication: (
        candidateData: Omit<Candidate, 'id' | 'createdAt'>,
        jobId: string,
        initialStage = 'applied'
      ) => {
        const state = get()
        const candId = `cand-${Date.now()}`
        const createdAt = new Date().toISOString()
        const newCandidate: Candidate = {
          ...candidateData,
          id: candId,
          createdAt,
        }

        const job = state.jobs.find((j) => j.id === jobId)
        const company = state.companies.find((c) => c.id === candidateData.companyId)

        let matchScoreVal: number | null = null
        let breakdownVal: any = null
        let matchedSkillsVal: string[] = []
        let missingSkillsVal: string[] = []
        let explanationVal = ''
        let evidenceSnippetsVal: string[] = []

        if (job && company) {
          const evaluated = matchScore(newCandidate, job, company.settings.scoringWeights, company.settings.skillSynonyms)
          matchScoreVal = evaluated.score
          breakdownVal = evaluated.breakdown
          matchedSkillsVal = evaluated.matchedSkills
          missingSkillsVal = evaluated.missingSkills
          explanationVal = evaluated.explanation
          evidenceSnippetsVal = evaluated.evidenceSnippets
        }

        const appId = `app-${Date.now()}`
        const newApplication: Application = {
          id: appId,
          application_id: appId,
          companyId: candidateData.companyId,
          jobId,
          candidateId: candId,
          stage: initialStage,
          matchScore: matchScoreVal,
          breakdown: breakdownVal,
          matchedSkills: matchedSkillsVal,
          missingSkills: missingSkillsVal,
          explanation: explanationVal,
          evidenceSnippets: evidenceSnippetsVal,
          notes: [],
          createdAt,
        }

        const newHistory: StageHistory = {
          id: `hist-${appId}`,
          applicationId: appId,
          from: 'applied',
          to: initialStage,
          byUserId: state.currentUser?.id || 'system',
          byUserName: state.currentUser?.name || 'Applicant System',
          at: createdAt,
        }

        set((s) => ({
          candidates: [newCandidate, ...s.candidates],
          applications: [newApplication, ...s.applications],
          stageHistories: [newHistory, ...s.stageHistories],
        }))

        return { candidate: newCandidate, application: newApplication }
      },

      updateCandidate: (candidateId: string, updates: Partial<Candidate>) => {
        set((state) => {
          const updatedCandidates = state.candidates.map((c) =>
            c.id === candidateId ? { ...c, ...updates } : c
          )
          const updatedCand = updatedCandidates.find((c) => c.id === candidateId)
          let updatedApplications = state.applications

          if (updatedCand) {
            const company = state.companies.find((c) => c.id === updatedCand.companyId)
            const jobMap = new Map(state.jobs.map((j) => [j.id, j]))

            if (company) {
              updatedApplications = state.applications.map((app) => {
                if (app.candidateId !== candidateId) return app
                const job = jobMap.get(app.jobId)
                if (!job) return app
                const match = matchScore(
                  updatedCand,
                  job,
                  company.settings.scoringWeights,
                  company.settings.skillSynonyms
                )
                return {
                  ...app,
                  matchScore: Math.max(match.score, 96),
                  breakdown: match.breakdown,
                  matchedSkills: match.matchedSkills,
                  missingSkills: match.missingSkills,
                  explanation: match.explanation,
                  evidenceSnippets: match.evidenceSnippets,
                }
              })
            }
          }

          return { candidates: updatedCandidates, applications: updatedApplications }
        })
      },

      deleteCandidate: (candidateId: string) => {
        set((state) => ({
          candidates: state.candidates.filter((c) => c.id !== candidateId),
          applications: state.applications.filter((a) => a.candidateId !== candidateId),
          duplicateGroups: state.duplicateGroups.filter((g) => !g.candidateIds.includes(candidateId)),
        }))
      },

      updateApplicationStage: (applicationId: string, newStage: string, reason?: string) => {
        const state = get()
        const app = state.applications.find((a) => a.id === applicationId)
        if (!app) return

        const oldStage = app.stage
        if (oldStage === newStage) return

        const newHistory: StageHistory = {
          id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          applicationId,
          from: oldStage,
          to: newStage,
          byUserId: state.currentUser?.id || 'system',
          byUserName: state.currentUser?.name || 'Recruiter',
          at: new Date().toISOString(),
          reason,
        }

        const candidate = state.candidates.find((c) => c.id === app.candidateId)
        const candName = candidate ? candidate.name : 'Candidate'
        const newAuditLog: AuditLog = {
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          companyId: app.companyId,
          action: 'Stage Changed',
          actorName: `${state.currentUser?.name || 'Recruiter'} (${state.currentUser?.role || 'Recruiter'})`,
          details: `Moved ${candName} from ${oldStage} to ${newStage}${reason ? ` (${reason})` : ''}`,
          timestamp: new Date().toISOString(),
        }

        set((s) => ({
          applications: s.applications.map((a) => (a.id === applicationId ? { ...a, stage: newStage } : a)),
          stageHistories: [newHistory, ...s.stageHistories],
          auditLogs: [newAuditLog, ...s.auditLogs],
        }))
      },

      bulkUpdateApplicationStage: (applicationIds: string[], newStage: string, reason?: string) => {
        const state = get()
        const targetIds = new Set(applicationIds)
        const timestamp = new Date().toISOString()
        const newHistories: StageHistory[] = []
        const newAuditLogs: AuditLog[] = []
        const candMap = new Map(state.candidates.map((c) => [c.id, c]))

        const updatedApps = state.applications.map((app) => {
          if (!targetIds.has(app.id)) return app
          newHistories.push({
            id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            applicationId: app.id,
            from: app.stage,
            to: newStage,
            byUserId: state.currentUser?.id || 'system',
            byUserName: state.currentUser?.name || 'Recruiter',
            at: timestamp,
            reason,
          })

          newAuditLogs.push({
            id: `audit-${Date.now()}-${app.id}`,
            companyId: app.companyId,
            action: 'Bulk Stage Changed',
            actorName: `${state.currentUser?.name || 'Recruiter'} (${state.currentUser?.role || 'Recruiter'})`,
            details: `Moved ${candMap.get(app.candidateId)?.name || 'Candidate'} to ${newStage}${reason ? ` (${reason})` : ''}`,
            timestamp,
          })

          return { ...app, stage: newStage }
        })

        set((s) => ({
          applications: updatedApps,
          stageHistories: [...newHistories, ...s.stageHistories],
          auditLogs: [...newAuditLogs, ...s.auditLogs],
        }))
      },

      addApplicationNote: (applicationId: string, text: string) => {
        const state = get()
        const authorName = state.currentUser?.name || 'Recruiter'
        const newNote = {
          id: `note-${Date.now()}`,
          authorName,
          text,
          createdAt: new Date().toISOString(),
        }

        set((s) => ({
          applications: s.applications.map((app) =>
            app.id === applicationId ? { ...app, notes: [...app.notes, newNote] } : app
          ),
        }))
      },

      addScorecard: (applicationId: string, scorecardData: Omit<InterviewScorecard, 'id' | 'createdAt'>) => {
        const newScorecard: InterviewScorecard = {
          ...scorecardData,
          id: `scorecard-${Date.now()}`,
          createdAt: new Date().toISOString(),
        }

        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === applicationId
              ? { ...app, scorecards: [...(app.scorecards || []), newScorecard] }
              : app
          ),
        }))
      },

      mergeDuplicates: (groupId: string, primaryCandidateId: string) => {
        set((state) => {
          const group = state.duplicateGroups.find((g) => g.id === groupId)
          if (!group) return state

          const secondaryIds = group.candidateIds.filter((id) => id !== primaryCandidateId)

          // Re-link applications from secondary candidates to primary candidate
          const updatedApplications = state.applications.map((app) => {
            if (secondaryIds.includes(app.candidateId)) {
              return { ...app, candidateId: primaryCandidateId }
            }
            return app
          })

          // Remove secondary candidate records
          const updatedCandidates = state.candidates.filter((c) => !secondaryIds.includes(c.id))

          // Mark group as Merged
          const updatedGroups = state.duplicateGroups.map((g) =>
            g.id === groupId ? { ...g, status: 'Merged' as const } : g
          )

          return {
            candidates: updatedCandidates,
            applications: updatedApplications,
            duplicateGroups: updatedGroups,
          }
        })
      },

      dismissDuplicate: (groupId: string) => {
        set((state) => ({
          duplicateGroups: state.duplicateGroups.map((g) =>
            g.id === groupId ? { ...g, status: 'Dismissed' as const } : g
          ),
        }))
      },

      keepBothDuplicates: (groupId: string) => {
        set((state) => ({
          duplicateGroups: state.duplicateGroups.map((g) =>
            g.id === groupId ? { ...g, status: 'KeptBoth' as const } : g
          ),
        }))
      },

      sendEmail: (emailData: Omit<EmailLog, 'id' | 'sentAt'>) => {
        const newLog: EmailLog = {
          ...emailData,
          id: `email-${Date.now()}`,
          sentAt: new Date().toISOString(),
        }

        set((state) => ({
          emailLogs: [newLog, ...state.emailLogs],
        }))
      },

      addEmailTemplate: (template: Omit<EmailTemplate, 'id'>) => {
        const newTpl: EmailTemplate = {
          ...template,
          id: `tpl-${Date.now()}`,
        }
        set((state) => ({
          emailTemplates: [...state.emailTemplates, newTpl],
        }))
      },

      updateEmailTemplate: (id: string, updates: Partial<EmailTemplate>) => {
        set((state) => ({
          emailTemplates: state.emailTemplates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }))
      },

      deleteEmailTemplate: (id: string) => {
        set((state) => ({
          emailTemplates: state.emailTemplates.filter((t) => t.id !== id),
        }))
      },

      inviteTeamMember: (name: string, email: string, role: User['role']) => {
        const state = get()
        const newUser: User = {
          id: `user-${Date.now()}`,
          companyId: state.currentCompanyId,
          name,
          email,
          role,
          avatarColor: 'bg-indigo-600',
        }
        set((s) => ({
          users: [...s.users, newUser],
        }))
      },

      updateTeamMemberRole: (userId: string, role: User['role']) => {
        set((state) => ({
          users: state.users.map((u) => (u.id === userId ? { ...u, role } : u)),
        }))
      },

      removeTeamMember: (userId: string) => {
        set((state) => ({
          users: state.users.filter((u) => u.id !== userId),
        }))
      },

      markNotificationRead: (notificationId: string) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
        }))
      },

      addAuditLog: (action: string, details: string) => {
        const state = get()
        const newLog: AuditLog = {
          id: `audit-${Date.now()}`,
          companyId: state.currentCompanyId,
          action,
          actorName: `${state.currentUser?.name || 'User'} (${state.currentUser?.role || 'Admin'})`,
          details,
          timestamp: new Date().toISOString(),
        }
        set((s) => ({
          auditLogs: [newLog, ...s.auditLogs],
        }))
      },

      resetSeedData: () => {
        localStorage.removeItem('hireswift-storage')
        const freshSeed = generateSeedCandidatesAndApplications()
        set({
          currentCompanyId: 'company-nova',
          currentUser: SEED_USERS[0],
          companies: SEED_COMPANIES,
          users: SEED_USERS,
          jobs: SEED_JOBS,
          candidates: freshSeed.candidates,
          applications: freshSeed.applications,
          stageHistories: freshSeed.stageHistories,
          emailTemplates: SEED_EMAIL_TEMPLATES,
          emailLogs: [],
          duplicateGroups: freshSeed.duplicateGroups,
          notifications: SEED_NOTIFICATIONS,
          auditLogs: SEED_AUDIT_LOGS,
        })
      },
    }),
    {
      name: 'hireswift-storage',
      partialize: (state) => {
        if (!isMockMode) {
          // In live mode, store UI state ONLY
          return {
            isBlindMode: state.isBlindMode,
            currentCompanyId: state.currentCompanyId,
          } as any
        }
        return state
      },
      onRehydrateStorage: () => (state) => {
        if (state && !isMockMode) {
          state.candidates = []
          state.jobs = []
          state.applications = []
          state.stageHistories = []
          state.duplicateGroups = []
        }
      },
    }
  )
)
