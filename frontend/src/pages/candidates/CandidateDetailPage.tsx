import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { api, USE_MOCK } from '@/api'
import { Candidate } from '@/types'
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
import { isReadOnlyViewer } from '@/lib/permissions'

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
  const [isLoadingCand, setIsLoadingCand] = useState(!USE_MOCK)
  const [error, setError] = useState<string | null>(null)

  const fetchCandidate = useCallback(async () => {
    if (!id) return
    if (USE_MOCK) return
    setIsLoadingCand(true)
    setError(null)
    try {
      const c = await api.getCandidate(id)
      setLiveCandidate(c)
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
  const company = companies.find((c) => c.id === currentCompanyId) || companies[0]
  const companyJobs = jobs.filter((j) => j.companyId === currentCompanyId)

  // Find existing applications for this candidate
  const candidateApps = applications.filter((a) => a.candidateId === id)
  const initialJobId = candidateApps[0]?.jobId || companyJobs[0]?.id || ''
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId)

  // Modals & form state
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [stageModalOpen, setStageModalOpen] = useState(false)
  const [nextStage, setNextStage] = useState('interview')
  const [newNoteText, setNewNoteText] = useState('')

  // Inline edit mode state
  const isReadOnly = isReadOnlyViewer(currentUser?.role)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editCollege, setEditCollege] = useState('')
  const [editCgpa, setEditCgpa] = useState<number>(0)
  const [editExp, setEditExp] = useState<number>(0)
  const [editCustomFields, setEditCustomFields] = useState<Record<string, any>>({})

  // Scorecard evaluation state
  const [scorecardRating, setScorecardRating] = useState(4)
  const [scorecardRecommendation, setScorecardRecommendation] = useState<
    'Strong Yes' | 'Yes' | 'Neutral' | 'No' | 'Strong No'
  >('Yes')
  const [scorecardNotes, setScorecardNotes] = useState('')

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

  // Active job and application for matching
  const activeJob = companyJobs.find((j) => j.id === selectedJobId)
  const activeApp = candidateApps.find((a) => a.jobId === selectedJobId)

  // Recompute score live if activeApp not yet created or for selected job
  const evaluatedMatch = activeJob
    ? matchScore(candidate, activeJob, company.settings.scoringWeights, company.settings.skillSynonyms)
    : null

  const displayScore = activeApp ? activeApp.matchScore : evaluatedMatch?.score || 0
  const displayBreakdown = activeApp ? activeApp.breakdown : evaluatedMatch?.breakdown || { skills: 0, experience: 0, education: 0, semantic: 0 }
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

  const handleSubmitScorecard = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeApp) return

    addScorecard(activeApp.id, {
      interviewerName: currentUser?.name || 'Evaluator',
      overallRecommendation: scorecardRecommendation,
      criteria: [
        { name: 'Technical Depth', rating: scorecardRating, feedback: 'Strong foundational concepts' },
        { name: 'Problem Solving & DSA', rating: Math.max(1, scorecardRating - 1), feedback: 'Good approach' },
        { name: 'Communication & Culture Fit', rating: 4, feedback: 'Articulate and clear' },
      ],
      notes: scorecardNotes,
    })

    setScorecardNotes('')
    toast.success('Interview scorecard submitted!')
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
          <Tabs defaultValue="notes" className="bg-card rounded-xl border border-border p-5 shadow-soft">
            <TabsList className="bg-gray-100 p-1">
              <TabsTrigger value="notes">Notes ({activeApp?.notes.length || 0})</TabsTrigger>
              <TabsTrigger value="resume">Resume Raw Text</TabsTrigger>
              <TabsTrigger value="timeline">Stage Timeline</TabsTrigger>
              <TabsTrigger value="scorecard">Scorecards</TabsTrigger>
            </TabsList>

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
                  activeApp.notes.map((note) => (
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
            <TabsContent value="resume" className="mt-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-border font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto text-text">
                {candidate.resumeText}
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
              <form onSubmit={handleSubmitScorecard} className="p-4 bg-gray-50 rounded-lg border border-border space-y-3">
                <h4 className="text-xs font-bold text-text uppercase">Submit Interview Scorecard</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">Overall Recommendation</label>
                    <select
                      value={scorecardRecommendation}
                      onChange={(e) => setScorecardRecommendation(e.target.value as any)}
                      className="w-full h-8 px-2 text-xs rounded border border-border bg-white"
                    >
                      <option value="Strong Yes">Strong Yes</option>
                      <option value="Yes">Yes</option>
                      <option value="Neutral">Neutral</option>
                      <option value="No">No</option>
                      <option value="Strong No">Strong No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">Rating (1 to 5 Stars)</label>
                    <select
                      value={scorecardRating}
                      onChange={(e) => setScorecardRating(parseInt(e.target.value, 10))}
                      className="w-full h-8 px-2 text-xs rounded border border-border bg-white"
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ (5 - Exceptional)</option>
                      <option value={4}>⭐⭐⭐⭐ (4 - Strong Fit)</option>
                      <option value={3}>⭐⭐⭐ (3 - Meets Expectations)</option>
                      <option value={2}>⭐⭐ (2 - Gaps Identified)</option>
                      <option value={1}>⭐ (1 - Unqualified)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text mb-1">Evaluation Notes</label>
                  <Input
                    value={scorecardNotes}
                    onChange={(e) => setScorecardNotes(e.target.value)}
                    placeholder="Candidate demonstrated clean coding practices and modular architecture..."
                    className="text-xs"
                  />
                </div>

                <Button type="submit" variant="primary" size="sm">
                  Submit Scorecard
                </Button>
              </form>

              {/* Existing scorecards */}
              {activeApp?.scorecards && activeApp.scorecards.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-muted">Submitted Evaluations:</h4>
                  {activeApp.scorecards.map((sc) => (
                    <div key={sc.id} className="p-3 bg-white rounded-lg border border-border text-xs space-y-1">
                      <div className="flex justify-between font-bold text-text">
                        <span>{sc.interviewerName}</span>
                        <Badge variant="success" size="sm">{sc.overallRecommendation}</Badge>
                      </div>
                      <p className="text-muted text-[11px]">{sc.notes}</p>
                    </div>
                  ))}
                </div>
              )}
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
                  {displayScore >= 80 ? 'High Fit Candidate' : displayScore >= 60 ? 'Moderate Fit' : 'Low Alignment'}
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
                  <span className="font-bold text-text">{displayBreakdown.skills}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${displayBreakdown.skills}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Experience Fit ({company.settings.scoringWeights.experience}%)</span>
                  <span className="font-bold text-text">{displayBreakdown.experience}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${displayBreakdown.experience}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Academic & CGPA ({company.settings.scoringWeights.education}%)</span>
                  <span className="font-bold text-text">{displayBreakdown.education}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full" style={{ width: `${displayBreakdown.education}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Semantic Similarity ({company.settings.scoringWeights.semantic}%)</span>
                  <span className="font-bold text-text">{displayBreakdown.semantic}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-teal-600 rounded-full" style={{ width: `${displayBreakdown.semantic}%` }} />
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
                    displayMatched.map((s) => (
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
                    displayMissing.map((s) => (
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
          </div>
        </div>
      </div>
    </div>
  )
}
