import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { api, USE_MOCK } from '@/api'
import { Candidate, Job, Application } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { Avatar } from '@/components/ui/Avatar'
import { SkillChip } from '@/components/ui/SkillChip'
import { Modal } from '@/components/ui/Modal'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Mail,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  MessageSquare,
  Award,
  BookOpen,
  Edit3,
  Save,
  Check,
  Star,
  Shield,
  Layers,
} from 'lucide-react'
import { matchScore } from '@/lib/scoring'
import { getSkillLearnHint } from '@/lib/skillHints'
import { isReadOnlyViewer } from '@/lib/permissions'
import { DEFAULT_DEMO_COMPANY } from '@/types'
import { ResumeViewer } from '@/components/ResumeViewer'
import { ScorecardPayload, ScorecardRecord } from '@/api'

export const CandidateDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    candidates,
    applications,
    jobs,
    stageHistories,
    companies,
    currentCompanyId,
    currentUser,
    updateCandidate,
    updateApplicationStage,
    addApplicationNote,
    addScorecard,
    isBlindMode,
  } = useAppStore()

  const [liveCandidate, setLiveCandidate] = useState<Candidate | null>(null)
  const [liveJobs, setLiveJobs] = useState<Job[]>([])
  const [liveApplications, setLiveApplications] = useState<Application[]>([])
  const [isLoadingCand, setIsLoadingCand] = useState(!USE_MOCK)
  const [error, setError] = useState<string | null>(null)

  const [selectedJobId, setSelectedJobId] = useState<string>('')

  const fetchCandidate = useCallback(async () => {
    if (!id) return
    if (USE_MOCK) return
    setIsLoadingCand(true)
    setError(null)
    try {
      const [c, jList, aList] = await Promise.all([
        api.getCandidate(id),
        api.getJobs(),
        api.getApplications(),
      ])
      setLiveCandidate(c)
      setLiveJobs(jList)
      const candApps = aList.filter((a) => a.candidateId === id || (a as any).candidate_id === id)
      setLiveApplications(candApps)

      setSelectedJobId((curr) => {
        if (curr) return curr
        if (candApps.length > 0) return candApps[0].jobId
        if (jList.length > 0) return jList[0].id
        return ''
      })
    } catch (err: any) {
      setError(err.message || 'Failed to load candidate.')
    } finally {
      setIsLoadingCand(false)
    }
  }, [id])

  useEffect(() => {
    fetchCandidate()
  }, [fetchCandidate])

  const storeCandidate = candidates.find((c) => c.id === id)
  const candidate = USE_MOCK ? storeCandidate : liveCandidate
  const company = USE_MOCK
    ? (companies.find((c) => c.id === currentCompanyId) || companies[0])
    : DEFAULT_DEMO_COMPANY
  const companyJobs = USE_MOCK ? jobs.filter((j) => j.companyId === currentCompanyId) : liveJobs

  // Find existing applications for this candidate
  const candidateApps = USE_MOCK ? applications.filter((a) => a.candidateId === id) : liveApplications

  useEffect(() => {
    if (USE_MOCK && !selectedJobId) {
      const initial = candidateApps[0]?.jobId || companyJobs[0]?.id || ''
      if (initial) setSelectedJobId(initial)
    }
  }, [candidateApps, companyJobs, selectedJobId])

  // Modals & form state
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [stageModalOpen, setStageModalOpen] = useState(false)
  const [nextStage, setNextStage] = useState('interview')
  const [newNoteText, setNewNoteText] = useState('')

  // Inline edit mode state
  const isReadOnly = USE_MOCK ? isReadOnlyViewer(currentUser?.role) : false
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editCollege, setEditCollege] = useState('')
  const [editCgpa, setEditCgpa] = useState<number>(0)
  const [editExp, setEditExp] = useState<number>(0)
  const [editCustomFields, setEditCustomFields] = useState<Record<string, any>>({})

  // Scorecard evaluation state
  const [serverScorecards, setServerScorecards] = useState<ScorecardRecord[]>([])
  const [interviewerName, setInterviewerName] = useState('')
  const [scorecardRecommendation, setScorecardRecommendation] = useState<
    'Strong Yes' | 'Yes' | 'Neutral' | 'No' | 'Strong No'
  >('Yes')
  const [techRating, setTechRating] = useState(4)
  const [techNotes, setTechNotes] = useState('')
  const [problemRating, setProblemRating] = useState(4)
  const [problemNotes, setProblemNotes] = useState('')
  const [commRating, setCommRating] = useState(4)
  const [commNotes, setCommNotes] = useState('')
  const [scorecardNotes, setScorecardNotes] = useState('')
  const [isSubmittingScorecard, setIsSubmittingScorecard] = useState(false)

  // Active job and application for matching
  const activeJob = companyJobs.find((j) => j.id === selectedJobId)
  const activeApp = candidateApps.find((a) => a.jobId === selectedJobId)

  // Fetch scorecards for active application in live mode
  useEffect(() => {
    if (!activeApp?.id || USE_MOCK) return
    api.getScorecards(activeApp.id)
      .then(setServerScorecards)
      .catch(() => {})
  }, [activeApp?.id])

  if (isLoadingCand) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-border">
        <p className="text-sm text-muted">Loading candidate dossier...</p>
      </div>
    )
  }

  if (error || !candidate) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-border space-y-3">
        <h2 className="text-lg font-bold text-text">{error ? 'Error Loading Candidate' : 'Candidate Not Found'}</h2>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex items-center justify-center gap-2">
          {error && (
            <Button variant="primary" size="sm" onClick={fetchCandidate}>
              Retry
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/app/candidates')}>
            Back to Candidates
          </Button>
        </div>
      </div>
    )
  }

  // Recompute score live if activeApp not yet created or for selected job
  const evaluatedMatch = (activeJob && candidate)
    ? matchScore(candidate, activeJob, company.settings.scoringWeights, company.settings.skillSynonyms)
    : null

  const displayScore = activeApp?.matchScore !== undefined ? activeApp.matchScore : evaluatedMatch?.score ?? null
  const displayBreakdown = activeApp?.breakdown !== undefined ? activeApp.breakdown : evaluatedMatch?.breakdown ?? null
  const displayMatched = activeApp ? activeApp.matchedSkills : evaluatedMatch?.matchedSkills || []
  const displayMissing = activeApp ? activeApp.missingSkills : evaluatedMatch?.missingSkills || []
  const displayExplanation = activeApp ? activeApp.explanation : evaluatedMatch?.explanation || ''

  // Associated stage histories
  const candidateHistory = stageHistories.filter(
    (h) => h.applicationId === activeApp?.id
  )

  const isBlind = isBlindMode
  const displayName = isBlind ? `Candidate #${candidate.id}` : candidate.name
  const displayCollege = isBlind ? '[Hidden College]' : candidate.college
  const displayLocation = isBlind ? '[Hidden Location]' : candidate.location

  // Actions
  const handleShortlist = () => {
    if (!activeApp) return
    updateApplicationStage(activeApp.id, 'shortlisted', 'Shortlisted by reviewer')
    toast.success(`${displayName} moved to Shortlisted!`)
  }

  const handleConfirmReject = () => {
    if (!activeApp) return
    updateApplicationStage(activeApp.id, 'rejected', rejectReason || 'Did not meet requirements')
    setRejectModalOpen(false)
    toast.error(`${displayName} marked as Rejected`)
  }

  const handleConfirmMoveStage = () => {
    if (!activeApp) return
    updateApplicationStage(activeApp.id, nextStage, 'Stage updated from candidate detail')
    setStageModalOpen(false)
    toast.success(`Stage updated to ${nextStage}`)
  }

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNoteText.trim() || !activeApp) return
    addApplicationNote(activeApp.id, newNoteText.trim())
    setNewNoteText('')
    toast.success('Internal note added')
  }

  const handleSaveInlineEdit = async () => {
    const updates: Partial<Candidate> = {
      name: editName || candidate.name,
      college: editCollege || candidate.college,
      cgpa: editCgpa || candidate.cgpa,
      experienceYears: editExp !== undefined ? editExp : candidate.experienceYears,
      customFields: { ...(candidate.customFields || {}), ...editCustomFields },
    }
    updateCandidate(candidate.id, updates)
    try {
      await api.patchCandidate(candidate.id, updates)
    } catch {
      // In mock mode or offline, store was already updated
    }
    if (liveCandidate) {
      setLiveCandidate({ ...liveCandidate, ...updates })
    }
    setIsEditing(false)
    toast.success('Profile updated and scores re-ranked!')
  }

  const handleStartEdit = () => {
    setEditName(candidate.name)
    setEditCollege(candidate.college)
    setEditCgpa(candidate.cgpa ?? 0)
    setEditExp(candidate.experienceYears ?? 0)
    setEditCustomFields({ ...(candidate.customFields || {}) })
    setIsEditing(true)
  }

  const handleSubmitScorecard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeApp) {
      toast.error('No active application found for this job.')
      return
    }

    setIsSubmittingScorecard(true)
    const reviewerName = interviewerName.trim() || 'Evaluator'

    const payload: ScorecardPayload = {
      interviewer_name: reviewerName,
      recommendation: scorecardRecommendation,
      overall_notes: scorecardNotes.trim(),
      criteria: {
        technical_depth: {
          rating: techRating,
          notes: techNotes.trim(),
        },
        problem_solving: {
          rating: problemRating,
          notes: problemNotes.trim(),
        },
        communication: {
          rating: commRating,
          notes: commNotes.trim(),
        },
      },
    }

    let savedToServer = false
    if (!USE_MOCK) {
      try {
        const created = await api.createScorecard(activeApp.id, payload)
        setServerScorecards((prev) => [created, ...prev])
        savedToServer = true
        toast.success('Interview scorecard submitted!')
      } catch {
        savedToServer = false
      }
    }

    if (!savedToServer) {
      addScorecard(activeApp.id, {
        interviewerName: reviewerName,
        overallRecommendation: scorecardRecommendation,
        criteria: [
          { name: 'Technical Depth', rating: techRating, feedback: techNotes.trim() },
          { name: 'Problem Solving', rating: problemRating, feedback: problemNotes.trim() },
          { name: 'Communication', rating: commRating, feedback: commNotes.trim() },
        ],
        notes: scorecardNotes.trim(),
        isDeviceOnly: true,
      } as any)
      if (!USE_MOCK) {
        toast.info('Scorecard saved on this device only (server sync not supported)')
      } else {
        toast.success('Interview scorecard submitted!')
      }
    }

    setIsSubmittingScorecard(false)
    setTechNotes('')
    setProblemNotes('')
    setCommNotes('')
    setScorecardNotes('')
    setInterviewerName('')
  }

  return (
    <div className="space-y-6">
      {/* Reject Modal */}
      <Modal
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        title="Reject Candidate Application"
        description="Provide a reason for rejecting this candidate to maintain audit transparency."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Rejection Reason</label>
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-white text-xs text-text mb-2"
            >
              <option value="Did not meet technical requirements">Did not meet technical requirements</option>
              <option value="Academic criteria (CGPA/10th/12th) below threshold">Academic criteria below threshold</option>
              <option value="Experience level mismatch">Experience level mismatch</option>
              <option value="Notice period too long">Notice period too long</option>
              <option value="Position filled by another candidate">Position filled by another candidate</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmReject}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Move Stage Modal */}
      <Modal
        open={stageModalOpen}
        onOpenChange={setStageModalOpen}
        title="Move Candidate Stage"
        description="Advance or change recruitment stage for this candidate."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Select Next Stage</label>
            <select
              value={nextStage}
              onChange={(e) => setNextStage(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-white text-xs text-text"
            >
              {company.settings.pipelineStages.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setStageModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmMoveStage}>
              Update Stage
            </Button>
          </div>
        </div>
      </Modal>

      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border shadow-soft">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/app/candidates')}
          >
            Candidates
          </Button>

          <div className="flex items-center gap-2.5">
            <Avatar name={candidate.name} size="md" isBlind={isBlind} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-text">{displayName}</h1>
                <StatusBadge stage={activeApp?.stage || 'applied'} />
                {candidate.parseConfidence < 65 && (
                  <Badge variant="warning" size="sm">
                    Low Confidence Parse ({candidate.parseConfidence}%)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">
                {displayCollege} • {candidate.degree} • {displayLocation}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isReadOnly ? (
            <div className="px-3 py-1.5 rounded-lg bg-gray-100 border border-border text-xs text-muted font-medium">
              Viewer Mode (Read-Only)
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Mail className="w-4 h-4" />}
                onClick={() => navigate(`/app/emails?recipientIds=${candidate.id}`)}
              >
                Send Email
              </Button>

              <Button
                variant="outline"
                size="sm"
                leftIcon={<Layers className="w-4 h-4" />}
                onClick={() => setStageModalOpen(true)}
              >
                Move Stage
              </Button>

              {activeApp?.stage !== 'shortlisted' && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                  onClick={handleShortlist}
                >
                  Shortlist
                </Button>
              )}

              <Button
                variant="danger"
                size="sm"
                leftIcon={<XCircle className="w-4 h-4" />}
                onClick={() => setRejectModalOpen(true)}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Two-Column View: Left Profile, Right Match Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Parsed Profile (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Overview Card */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-text">Parsed Candidate Profile</h2>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Save className="w-3.5 h-3.5" />}
                    onClick={handleSaveInlineEdit}
                  >
                    Save Changes
                  </Button>
                </div>
              ) : (
                !isReadOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                    onClick={handleStartEdit}
                  >
                    Edit Profile
                  </Button>
                )
              )}
            </div>

            {/* Editable Fields */}
            {isEditing ? (
              <div className="space-y-4 p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Candidate Name</label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">College</label>
                    <Input value={editCollege} onChange={(e) => setEditCollege(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">CGPA (10 Scale)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editCgpa}
                      onChange={(e) => setEditCgpa(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Experience (Years)</label>
                    <Input
                      type="number"
                      step="0.5"
                      value={editExp}
                      onChange={(e) => setEditExp(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Custom Fields in Edit Mode */}
                {company.settings.customFields.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-xs font-bold text-text block mb-2">Custom Organization Fields</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {company.settings.customFields.map((cf) => (
                        <div key={cf.id}>
                          <label className="block text-[11px] font-semibold text-text mb-1">{cf.name}</label>
                          {cf.type === 'select' && cf.options ? (
                            <select
                              value={editCustomFields[cf.id] || ''}
                              onChange={(e) => setEditCustomFields({ ...editCustomFields, [cf.id]: e.target.value })}
                              className="w-full h-8 px-2 text-xs rounded border border-border bg-white"
                            >
                              <option value="">Select...</option>
                              {cf.options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={editCustomFields[cf.id] || ''}
                              onChange={(e) => setEditCustomFields({ ...editCustomFields, [cf.id]: e.target.value })}
                              placeholder={`Enter ${cf.name}`}
                              className="h-8 text-xs"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Display Profile */
              <div className="space-y-4">
                {/* Academic Performance Strip */}
                <div>
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Academic Record
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-gray-50/70 rounded-lg border border-border">
                      <div className="text-muted text-[11px]">College CGPA</div>
                      <div className="text-base font-bold text-text mt-0.5">{candidate.cgpa} / 10</div>
                      <div className="text-[10px] text-muted">{displayCollege}</div>
                    </div>
                    <div className="p-3 bg-gray-50/70 rounded-lg border border-border">
                      <div className="text-muted text-[11px]">Class 12th Board</div>
                      <div className="text-base font-bold text-text mt-0.5">{candidate.twelfthPercent}%</div>
                      <div className="text-[10px] text-muted">Senior Secondary</div>
                    </div>
                    <div className="p-3 bg-gray-50/70 rounded-lg border border-border">
                      <div className="text-muted text-[11px]">Class 10th Board</div>
                      <div className="text-base font-bold text-text mt-0.5">{candidate.tenthPercent}%</div>
                      <div className="text-[10px] text-muted">Matriculation</div>
                    </div>
                  </div>
                </div>

                {/* Organization Custom Fields */}
                {company.settings.customFields.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                      Organization Custom Fields
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {company.settings.customFields.map((cf) => (
                        <div key={cf.id} className="p-3 bg-gray-50/70 rounded-lg border border-border">
                          <div className="text-muted text-[11px] font-medium">{cf.name}</div>
                          <div className="text-xs font-bold text-text mt-0.5">
                            {candidate.customFields && candidate.customFields[cf.id] !== undefined
                              ? String(candidate.customFields[cf.id])
                              : 'Not provided'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                <div>
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Extracted Technical Skills
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((s) => (
                      <SkillChip key={s} name={s} status="neutral" />
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div>
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Work Experience ({candidate.experienceYears === 0 ? 'Fresher' : `${candidate.experienceYears} Years`})
                  </div>
                  {candidate.experience.length === 0 ? (
                    <p className="text-xs text-muted italic">No prior corporate experience (Fresh Graduate).</p>
                  ) : (
                    candidate.experience.map((exp, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-border bg-gray-50/50 space-y-1">
                        <div className="flex justify-between items-center text-xs font-bold text-text">
                          <span>{exp.title}</span>
                          <span className="text-muted font-normal">{exp.duration}</span>
                        </div>
                        <div className="text-xs font-medium text-primary">{exp.company}</div>
                        <p className="text-xs text-muted mt-1">{exp.description}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Projects */}
                {candidate.projects && candidate.projects.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                      Academic & Engineering Projects
                    </div>
                    <div className="space-y-2">
                      {candidate.projects.map((proj, idx) => (
                        <div key={idx} className="p-3 rounded-lg border border-border bg-gray-50/50">
                          <h4 className="text-xs font-bold text-text">{proj.title}</h4>
                          <p className="text-xs text-muted mt-1">{proj.description}</p>
                          <div className="flex gap-1 mt-2">
                            {proj.technologies.map((t) => (
                              <Badge key={t} variant="secondary" size="sm">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Tabs: Resume View, Notes, Timeline, Scorecards */}
          <Tabs defaultValue="resume" className="bg-card rounded-xl border border-border p-5 shadow-soft">
            <TabsList className="bg-gray-100 p-1">
              <TabsTrigger value="resume">Resume Document</TabsTrigger>
              <TabsTrigger value="notes">Notes ({activeApp?.notes.length || 0})</TabsTrigger>
              <TabsTrigger value="scorecard">
                Scorecards ({USE_MOCK ? activeApp?.scorecards?.length || 0 : serverScorecards.length + (activeApp?.scorecards?.filter((s: any) => s.isDeviceOnly)?.length || 0)})
              </TabsTrigger>
              <TabsTrigger value="timeline">Stage Timeline</TabsTrigger>
              <TabsTrigger value="raw-text">Resume Raw Text</TabsTrigger>
            </TabsList>

            {/* TAB: Original Resume Viewer */}
            <TabsContent value="resume" className="mt-4">
              <ResumeViewer candidate={candidate} isBlind={isBlindMode} />
            </TabsContent>

            {/* TAB: Notes */}
            <TabsContent value="notes" className="space-y-4 mt-4">
              <form onSubmit={handleAddNote} className="space-y-2">
                <Input
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add an internal evaluation note or feedback..."
                  className="text-xs"
                />
                <Button type="submit" variant="secondary" size="sm">
                  Add Note
                </Button>
              </form>

              <div className="space-y-2 pt-2">
                {!activeApp?.notes || activeApp.notes.length === 0 ? (
                  <p className="text-xs text-muted italic">No notes added yet.</p>
                ) : (
                  activeApp.notes.map((note: any) => (
                    <div key={note.id} className="p-3 rounded-lg border border-border bg-gray-50 text-xs">
                      <div className="flex justify-between items-center text-muted text-[10px] mb-1">
                        <span className="font-semibold text-text">{note.authorName}</span>
                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-text">{note.text}</p>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* TAB: Resume Raw Text with Highlights */}
            <TabsContent value="raw-text" className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted px-1">
                <span>Resume Raw Text</span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Matched Skills Highlighted ({displayMatched.length})
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-border font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto text-text" data-testid="resume-text-view">
                {(() => {
                  if (!candidate.resumeText) return 'No resume text available.'
                  if (!displayMatched.length) return candidate.resumeText
                  const escaped = displayMatched.map((s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                  const regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi')
                  const parts = candidate.resumeText.split(regex)
                  return parts.map((part, i) => {
                    const isMatched = displayMatched.some((s: string) => s.toLowerCase() === part.toLowerCase())
                    if (isMatched) {
                      return (
                        <mark
                          key={i}
                          className="bg-emerald-200 text-emerald-950 font-bold px-1 rounded mx-0.5 border border-emerald-300"
                        >
                          {part}
                        </mark>
                      )
                    }
                    return part
                  })
                })()}
              </div>
            </TabsContent>

            {/* TAB: Activity Timeline */}
            <TabsContent value="timeline" className="mt-4 space-y-3">
              {candidateHistory.length === 0 ? (
                <p className="text-xs text-muted italic">No stage history recorded yet.</p>
              ) : (
                candidateHistory.map((hist) => (
                  <div key={hist.id} className="flex items-start gap-3 text-xs border-b border-border pb-2">
                    <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-text">
                        Moved from <span className="capitalize">{hist.from}</span> →{' '}
                        <span className="capitalize text-primary font-bold">{hist.to}</span>
                      </div>
                      <div className="text-muted text-[11px]">
                        By {hist.byUserName || 'Recruiter'} on {new Date(hist.at).toLocaleDateString()}
                      </div>
                      {hist.reason && (
                        <div className="text-amber-700 bg-amber-50 p-1.5 rounded mt-1 text-[11px]">
                          Reason: {hist.reason}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* TAB: Scorecard */}
            <TabsContent value="scorecard" className="mt-4 space-y-4">
              <form onSubmit={handleSubmitScorecard} className="p-4 bg-gray-50 rounded-lg border border-border space-y-3" data-testid="scorecard-form">
                <h4 className="text-xs font-bold text-text uppercase">Submit Structured Interview Scorecard</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">Evaluator / Interviewer Name</label>
                    <Input
                      value={interviewerName}
                      onChange={(e) => setInterviewerName(e.target.value)}
                      placeholder="e.g. Lead Engineer (defaults to Evaluator)"
                      className="text-xs"
                      data-testid="scorecard-interviewer-input"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">Overall Recommendation</label>
                    <select
                      value={scorecardRecommendation}
                      onChange={(e) => setScorecardRecommendation(e.target.value as any)}
                      className="w-full h-8 px-2 text-xs rounded border border-border bg-white"
                      data-testid="scorecard-recommendation-select"
                    >
                      <option value="Strong Yes">Strong Yes</option>
                      <option value="Yes">Yes</option>
                      <option value="Neutral">Neutral</option>
                      <option value="No">No</option>
                      <option value="Strong No">Strong No</option>
                    </select>
                  </div>
                </div>

                {/* Structured Criteria: Technical Depth, Problem Solving, Communication */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="p-3 bg-white rounded-lg border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text">1. Technical Depth</span>
                      <select
                        value={techRating}
                        onChange={(e) => setTechRating(parseInt(e.target.value, 10))}
                        className="h-7 px-2 text-xs rounded border border-border bg-white"
                        data-testid="scorecard-tech-rating"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ (5 - Exceptional)</option>
                        <option value={4}>⭐⭐⭐⭐ (4 - Strong Fit)</option>
                        <option value={3}>⭐⭐⭐ (3 - Meets Bar)</option>
                        <option value={2}>⭐⭐ (2 - Gaps Found)</option>
                        <option value={1}>⭐ (1 - Sub-standard)</option>
                      </select>
                    </div>
                    <Input
                      value={techNotes}
                      onChange={(e) => setTechNotes(e.target.value)}
                      placeholder="Notes on framework depth, system architecture, core domain knowledge..."
                      className="text-xs"
                      data-testid="scorecard-tech-notes"
                    />
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text">2. Problem Solving & Algorithms</span>
                      <select
                        value={problemRating}
                        onChange={(e) => setProblemRating(parseInt(e.target.value, 10))}
                        className="h-7 px-2 text-xs rounded border border-border bg-white"
                        data-testid="scorecard-problem-rating"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ (5 - Exceptional)</option>
                        <option value={4}>⭐⭐⭐⭐ (4 - Strong Fit)</option>
                        <option value={3}>⭐⭐⭐ (3 - Meets Bar)</option>
                        <option value={2}>⭐⭐ (2 - Gaps Found)</option>
                        <option value={1}>⭐ (1 - Sub-standard)</option>
                      </select>
                    </div>
                    <Input
                      value={problemNotes}
                      onChange={(e) => setProblemNotes(e.target.value)}
                      placeholder="Notes on code cleanliness, edge case analysis, debugging process..."
                      className="text-xs"
                      data-testid="scorecard-problem-notes"
                    />
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text">3. Communication & Teamwork</span>
                      <select
                        value={commRating}
                        onChange={(e) => setCommRating(parseInt(e.target.value, 10))}
                        className="h-7 px-2 text-xs rounded border border-border bg-white"
                        data-testid="scorecard-comm-rating"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ (5 - Exceptional)</option>
                        <option value={4}>⭐⭐⭐⭐ (4 - Strong Fit)</option>
                        <option value={3}>⭐⭐⭐ (3 - Meets Bar)</option>
                        <option value={2}>⭐⭐ (2 - Gaps Found)</option>
                        <option value={1}>⭐ (1 - Sub-standard)</option>
                      </select>
                    </div>
                    <Input
                      value={commNotes}
                      onChange={(e) => setCommNotes(e.target.value)}
                      placeholder="Notes on clarity of thought, articulating trade-offs, culture alignment..."
                      className="text-xs"
                      data-testid="scorecard-comm-notes"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text mb-1">Overall Evaluation Notes</label>
                  <Input
                    value={scorecardNotes}
                    onChange={(e) => setScorecardNotes(e.target.value)}
                    placeholder="General summary and next round recommendations..."
                    className="text-xs"
                    data-testid="scorecard-overall-notes"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingScorecard}
                  data-testid="submit-scorecard-btn"
                >
                  Submit Scorecard
                </Button>
              </form>

              {/* Submitted Evaluations List */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
                  Submitted Evaluations
                </h4>
                {(() => {
                  const combined = [
                    ...serverScorecards,
                    ...((activeApp?.scorecards || []).filter((s: any) => s.isDeviceOnly || USE_MOCK)),
                  ]

                  if (combined.length === 0) {
                    return <p className="text-xs text-muted italic">No scorecards submitted yet for this application.</p>
                  }

                  return combined.map((sc: any, idx: number) => {
                    const isDevOnly = sc.isDeviceOnly || !sc.id || sc.id.startsWith('local-')
                    const reviewer = sc.interviewer_name || sc.interviewerName || 'Evaluator'
                    const rec = sc.recommendation || sc.overallRecommendation || 'Neutral'
                    const notes = sc.overall_notes || sc.notes || ''
                    const criteria = sc.criteria || {
                      technical_depth: sc.technical_depth,
                      problem_solving: sc.problem_solving,
                      communication: sc.communication,
                    }

                    return (
                      <div
                        key={sc.id || idx}
                        className="p-3 bg-white rounded-lg border border-border text-xs space-y-2"
                        data-testid="submitted-scorecard-record"
                      >
                        <div className="flex items-center justify-between font-bold text-text">
                          <div className="flex items-center gap-2">
                            <span>{reviewer}</span>
                            {isDevOnly && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Saved on this device only
                              </span>
                            )}
                          </div>
                          <Badge variant={rec.includes('Yes') ? 'success' : rec.includes('No') ? 'danger' : 'warning'} size="sm">
                            {rec}
                          </Badge>
                        </div>

                        {criteria && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 bg-gray-50 rounded text-[11px]">
                            <div>
                              <span className="font-semibold text-muted block">Technical:</span>
                              <span>
                                {criteria.technical_depth?.rating || criteria[0]?.rating || '-'}/5
                                {criteria.technical_depth?.notes ? ` - ${criteria.technical_depth.notes}` : ''}
                              </span>
                            </div>
                            <div>
                              <span className="font-semibold text-muted block">Problem Solving:</span>
                              <span>
                                {criteria.problem_solving?.rating || criteria[1]?.rating || '-'}/5
                                {criteria.problem_solving?.notes ? ` - ${criteria.problem_solving.notes}` : ''}
                              </span>
                            </div>
                            <div>
                              <span className="font-semibold text-muted block">Communication:</span>
                              <span>
                                {criteria.communication?.rating || criteria[2]?.rating || '-'}/5
                                {criteria.communication?.notes ? ` - ${criteria.communication.notes}` : ''}
                              </span>
                            </div>
                          </div>
                        )}

                        {notes && (
                          <p className="text-muted text-[11px]">
                            <strong className="text-text">Overall Notes:</strong> {notes}
                          </p>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT COLUMN: Real-Time Match Card for Selectable Job (1 col) */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-4">
            <div>
              <label className="block text-xs font-bold text-text mb-1">Select Target Job Opening</label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-white text-xs font-medium text-text"
              >
                {companyJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Score Ring */}
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50/70 rounded-xl border border-border">
              <ScoreRing score={displayScore} size="xl" />
              <div className="mt-2 text-center">
                <div className="text-sm font-bold text-text">
                  {displayScore == null
                    ? 'Unscored'
                    : displayScore >= 80
                    ? 'High Fit Candidate'
                    : displayScore >= 60
                    ? 'Moderate Fit'
                    : 'Low Alignment'}
                </div>
                <div className="text-xs text-muted mt-0.5">Automated Match Score</div>
              </div>
            </div>

            {/* Breakdown Bars */}
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-text">Score Component Breakdown</div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Skills Coverage ({company.settings.scoringWeights.skills}%)</span>
                  <span className="font-bold text-text">{displayBreakdown?.skills != null ? `${displayBreakdown.skills}%` : '-'}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${displayBreakdown?.skills ?? 0}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Experience Fit ({company.settings.scoringWeights.experience}%)</span>
                  <span className="font-bold text-text">{displayBreakdown?.experience != null ? `${displayBreakdown.experience}%` : '-'}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${displayBreakdown?.experience ?? 0}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Academic & CGPA ({company.settings.scoringWeights.education}%)</span>
                  <span className="font-bold text-text">{displayBreakdown?.education != null ? `${displayBreakdown.education}%` : '-'}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full" style={{ width: `${displayBreakdown?.education ?? 0}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Semantic Similarity ({company.settings.scoringWeights.semantic}%)</span>
                  <span className="font-bold text-text">{displayBreakdown?.semantic != null ? `${displayBreakdown.semantic}%` : '-'}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-teal-600 rounded-full" style={{ width: `${displayBreakdown?.semantic ?? 0}%` }} />
                </div>
              </div>
            </div>

            {/* Matched vs Missing Skills */}
            <div className="pt-2 border-t border-border space-y-3">
              <div>
                <div className="text-xs font-semibold text-emerald-800 mb-1.5 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Matched Skills ({displayMatched.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {displayMatched.length === 0 ? (
                    <span className="text-xs text-muted">No overlapping skills</span>
                  ) : (
                    displayMatched.map((s: string) => (
                      <SkillChip key={s} name={s} status="matched" size="sm" />
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-rose-800 mb-1.5 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  Missing Skills ({displayMissing.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {displayMissing.length === 0 ? (
                    <span className="text-xs text-emerald-600 font-medium">All required skills present!</span>
                  ) : (
                    displayMissing.map((s: string) => (
                      <SkillChip key={s} name={s} status="missing" size="sm" />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Explanation Note */}
            <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 text-xs text-indigo-950">
              <span className="font-bold block mb-0.5">Scoring Engine Assessment:</span>
              <p className="leading-relaxed">{displayExplanation}</p>
            </div>

            {/* Skill Gap & Learn Hints */}
            {displayMissing.length > 0 && (
              <div className="p-3 bg-white rounded-lg border border-border space-y-2" data-testid="detail-skill-gap-list">
                <div className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Skill Gap &amp; Next Steps for {activeJob?.title}</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {displayMissing.map((ms: string) => (
                    <div key={ms} className="p-2 bg-rose-50/50 rounded border border-rose-100 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-text">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span>Missing for role: {ms}</span>
                      </div>
                      <div className="text-[11px] text-muted mt-0.5">
                        💡 <em>Learn hint:</em> {getSkillLearnHint(ms)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
