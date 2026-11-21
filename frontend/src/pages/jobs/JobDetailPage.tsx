import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { api, USE_MOCK } from '@/api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { Avatar } from '@/components/ui/Avatar'
import { SkillChip } from '@/components/ui/SkillChip'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Sliders,
  RefreshCw,
  Sparkles,
  MapPin,
  Clock,
  Briefcase,
  Users,
  CheckCircle,
  Save,
  Check,
  Edit2,
  Info,
  X,
  AlertTriangle,
} from 'lucide-react'
import { JobRankingCandidate, SkillGapItem } from '@/api'
import { Job } from '@/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    jobs,
    candidates,
    applications,
    companies,
    currentCompanyId,
    rematchTalentPool,
    updateApplicationStage,
    updateJob,
    isBlindMode,
  } = useAppStore()

  const storeJob = jobs.find((j) => j.id === id)
  const [liveJob, setLiveJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(!USE_MOCK)
  const [error, setError] = useState<string | null>(null)

  const company = USE_MOCK
    ? (companies.find((c) => c.id === currentCompanyId) || companies[0])
    : { name: 'HireSwift Demo', settings: { scoringWeights: { skills: 40, experience: 25, education: 20, semantic: 15 }, customFields: [] } }

  // Live rankings from API
  const [rankingData, setRankingData] = useState<JobRankingCandidate[]>([])
  const [skillGapData, setSkillGapData] = useState<SkillGapItem[]>([])

  const fetchJobData = useCallback(async () => {
    if (!id) return
    if (USE_MOCK) {
      if (storeJob) {
        api.getJobRanking(storeJob.id).then((res) => setRankingData(res.candidates))
        api.getJobSkillGap(storeJob.id).then((res) => setSkillGapData(res.skills))
      }
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [fetchedJob, rankingRes, skillGapRes] = await Promise.all([
        api.getJob(id),
        api.getJobRanking(id),
        api.getJobSkillGap(id),
      ])
      setLiveJob(fetchedJob)
      setRankingData(rankingRes.candidates)
      setSkillGapData(skillGapRes.skills)
    } catch (err: any) {
      setError(err.message || 'Failed to load job details and rankings.')
    } finally {
      setLoading(false)
    }
  }, [id, storeJob])

  useEffect(() => {
    fetchJobData()
  }, [fetchJobData])

  const job = USE_MOCK ? storeJob : liveJob

  // Local weights state for live slider adjustments
  const [weights, setWeights] = useState({
    skills: job?.scoringWeights?.skills ?? company.settings.scoringWeights.skills,
    experience: job?.scoringWeights?.experience ?? company.settings.scoringWeights.experience,
    education: job?.scoringWeights?.education ?? company.settings.scoringWeights.education,
    semantic: job?.scoringWeights?.semantic ?? company.settings.scoringWeights.semantic,
  })

  const [activeTab, setActiveTab] = useState('ranked')
  const [isRematching, setIsRematching] = useState(false)
  const [showWeightPanel, setShowWeightPanel] = useState(false)
  const [weightsIgnoredByServer, setWeightsIgnoredByServer] = useState(false)

  // Editable requirements state
  const [isEditingReqs, setIsEditingReqs] = useState(false)
  const [editReqSkills, setEditReqSkills] = useState<string[]>(job?.requirements?.requiredSkills || [])
  const [editPrefSkills, setEditPrefSkills] = useState<string[]>(job?.requirements?.preferredSkills || [])
  const [editMinExp, setEditMinExp] = useState(job?.requirements?.minExperience || 2)
  const [editMinCgpa, setEditMinCgpa] = useState(job?.requirements?.minCgpa || 7.0)
  const [editLocation, setEditLocation] = useState(job?.location || 'Bengaluru')

  // Expanded candidate breakdown popover ID
  const [expandedBreakdownId, setExpandedBreakdownId] = useState<string | null>(null)

  const isInitialMount = useRef(true)

  // Debounce slider changes (300ms) and send custom weights query parameters
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (!job?.id) return

    const timer = setTimeout(async () => {
      try {
        const queryWeights = {
          weights_skills: Number((weights.skills / 100).toFixed(2)),
          weights_experience: Number((weights.experience / 100).toFixed(2)),
          weights_education: Number((weights.education / 100).toFixed(2)),
          weights_semantic: Number((weights.semantic / 100).toFixed(2)),
        }
        const res = await api.getJobRanking(job.id, queryWeights)
        setRankingData(res.candidates)

        const applied = res.weights_applied
        if (!applied) {
          setWeightsIgnoredByServer(true)
        } else {
          const matchSkills = Math.abs((applied.skills ?? 0) - queryWeights.weights_skills) < 0.05
          const matchExp = Math.abs((applied.experience ?? 0) - queryWeights.weights_experience) < 0.05
          if (matchSkills && matchExp) {
            setWeightsIgnoredByServer(false)
          } else {
            setWeightsIgnoredByServer(true)
          }
        }
      } catch {
        // preserve current ranking on error
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [weights, job?.id])

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-border">
        <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted">Loading job details and rankings...</p>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-border space-y-4">
        <h2 className="text-lg font-bold text-text">{error ? 'Error Loading Job' : 'Job Not Found'}</h2>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex items-center justify-center gap-3">
          {error && (
            <Button variant="primary" size="sm" onClick={fetchJobData}>
              Retry
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/app/jobs')}>
            Back to Jobs
          </Button>
        </div>
      </div>
    )
  }

  // Handle slider weight changes (re-ranks candidates for this job only)
  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    const updated = { ...weights, [key]: value }
    setWeights(updated)
    updateJob(job.id, {
      scoringWeights: updated,
    })
  }

  const handleRematch = async () => {
    if (!job?.id) return
    setIsRematching(true)
    try {
      if (!USE_MOCK) {
        try {
          await api.rematchJob(job.id)
        } catch {
          // If server lacks rematch endpoint, fallback to refreshing rankings
        }
      } else {
        rematchTalentPool(job.id)
      }
      const [rankingRes, skillGapRes] = await Promise.all([
        api.getJobRanking(job.id),
        api.getJobSkillGap(job.id),
      ])
      setRankingData(rankingRes.candidates)
      setSkillGapData(skillGapRes.skills)
      toast.success('Ranking refreshed from the server')
    } catch (err: any) {
      toast.error(err.message || 'Failed to refresh ranking.')
    } finally {
      setIsRematching(false)
    }
  }

  const handleShortlist = (appId: string, candidateName: string) => {
    api.moveApplication(appId, 'shortlisted', 'Directly shortlisted from Job Ranking')
      .then(() => {
        toast.success(`Shortlisted ${candidateName}!`)
        api.getJobRanking(job.id).then((res) => setRankingData(res.candidates))
      })
      .catch((err) => toast.error(err.message))
  }

  const handleSaveRequirements = async () => {
    try {
      await api.patchJob(job.id, {
        location: editLocation,
        requirements: {
          ...job.requirements,
          requiredSkills: editReqSkills,
          preferredSkills: editPrefSkills,
          minExperience: editMinExp,
          minCgpa: editMinCgpa,
        },
      })
      setIsEditingReqs(false)
      toast.success('Job criteria updated and applicants re-ranked!')
      api.getJobRanking(job.id).then((res) => setRankingData(res.candidates))
      api.getJobSkillGap(job.id).then((res) => setSkillGapData(res.skills))
    } catch (err: any) {
      toast.error(err.message || 'Failed to save job requirements')
    }
  }

  // Funnel numbers matching the table
  const totalApplicants = rankingData.length
  const appliedCount = rankingData.filter((c) => c.stage === 'applied').length
  const shortlistedCount = rankingData.filter((c) => c.stage === 'shortlisted').length
  const interviewCount = rankingData.filter((c) => c.stage === 'interview').length
  const offerCount = rankingData.filter((c) => c.stage === 'offer').length
  const rejectedCount = rankingData.filter((c) => c.stage === 'rejected').length

  const funnelData = [
    { name: 'Applied', count: appliedCount, fill: '#2563EB' },
    { name: 'Shortlisted', count: shortlistedCount, fill: '#7C3AED' },
    { name: 'Interview', count: interviewCount, fill: '#F59E0B' },
    { name: 'Offer', count: offerCount, fill: '#16A34A' },
    { name: 'Rejected', count: rejectedCount, fill: '#DC2626' },
  ]

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/app/jobs')}
          >
            Jobs
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-text">{job.title}</h1>
              <Badge variant={job.status === 'Active' ? 'success' : 'warning'}>{job.status}</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted mt-1">
              <span>{job.department}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {job.location}
              </span>
              <span>•</span>
              <span>{totalApplicants} Total Applications</span>
            </div>
          </div>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Sliders className="w-3.5 h-3.5" />}
            onClick={() => setShowWeightPanel(!showWeightPanel)}
          >
            {showWeightPanel ? 'Hide Weights' : 'Adjust Weights'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRematching ? 'animate-spin' : ''}`} />}
            onClick={handleRematch}
            isLoading={isRematching}
          >
            Re-match Pool
          </Button>
        </div>
      </div>

      {/* Expandable Scoring Weight Sliders for this specific job */}
      {showWeightPanel && (
        <div className="bg-indigo-50/60 rounded-xl border border-indigo-200 p-4 space-y-3 animate-in fade-in-0 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              Job-Specific Scoring Weights (Re-ranks this job only)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-lg border border-border">
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Skills Fit</span>
                <span className="text-primary">{weights.skills}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={weights.skills}
                onChange={(e) => handleWeightChange('skills', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="bg-white p-3 rounded-lg border border-border">
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Experience</span>
                <span className="text-primary">{weights.experience}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={weights.experience}
                onChange={(e) => handleWeightChange('experience', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="bg-white p-3 rounded-lg border border-border">
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Education & CGPA</span>
                <span className="text-primary">{weights.education}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={weights.education}
                onChange={(e) => handleWeightChange('education', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="bg-white p-3 rounded-lg border border-border">
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Semantic Cosine</span>
                <span className="text-primary">{weights.semantic}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={weights.semantic}
                onChange={(e) => handleWeightChange('semantic', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>

          {weightsIgnoredByServer && (
            <div
              className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-center gap-2"
              data-testid="weights-ignored-notice"
            >
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>This server ignored custom weights; ranking is unchanged.</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-border p-1">
          <TabsTrigger value="ranked">Ranked Candidates ({rankingData.length})</TabsTrigger>
          <TabsTrigger value="requirements">Requirements & JD</TabsTrigger>
          <TabsTrigger value="insights">Skill Gap & Funnel Insights</TabsTrigger>
        </TabsList>

        {/* TAB 1: Ranked Candidates from GET /jobs/{id}/ranking */}
        <TabsContent value="ranked" className="space-y-3 mt-4">
          {rankingData.length === 0 ? (
            <EmptyState
              title="No applicants scored for this job yet"
              description="Click 'Re-match Pool' above or upload resumes to score candidates."
            />
          ) : (
            rankingData.map((item, rank) => {
              const { candidate, application_id, match_score, breakdown, matched_skills, missing_skills, explanation, stage } = item
              const isExpanded = expandedBreakdownId === application_id
              const totalReqSkills = job.requirements?.requiredSkills?.length || 0
              const candName = candidate?.name || 'Candidate'
              const candId = candidate?.id || item.candidate_id || application_id
              const displayName = isBlindMode ? `Candidate #${candId}` : candName
              const displayCollege = isBlindMode ? '[Hidden College]' : (candidate?.college || 'College')
              const displayLocation = isBlindMode ? '[Hidden Location]' : (candidate?.location || 'India')

              return (
                <div
                  key={application_id || item.candidate_id}
                  className="bg-card border border-border hover:border-indigo-200 rounded-xl p-4 shadow-card transition-all space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left candidate info */}
                    <div
                      className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/app/candidates/${candId}`)}
                    >
                      <div className="w-6 text-center text-xs font-bold text-muted">
                        #{rank + 1}
                      </div>
                      <Avatar name={candName} size="md" isBlind={isBlindMode} />
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-text text-sm hover:text-primary transition-colors">
                            {displayName}
                          </span>
                          <Badge variant="outline" size="sm">
                            {stage}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted">
                          <span>{displayCollege}</span>
                          <span>•</span>
                          <span>CGPA: <strong className="text-text">{candidate?.cgpa ?? '-'}</strong></span>
                          <span>•</span>
                          <span>{candidate?.experienceYears ?? 0}y exp</span>
                          <span>•</span>
                          <span>{displayLocation}</span>
                        </div>

                        <p className="text-xs text-muted italic line-clamp-1">
                          💡 {explanation}
                        </p>
                      </div>
                    </div>

                    {/* Middle Score Bar */}
                    <div className="w-48 shrink-0 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-text">Match Score</span>
                        <span className="font-extrabold text-primary">{match_score != null ? `${match_score}/100` : '-'}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            match_score != null && match_score >= 80 ? 'bg-emerald-500' : match_score != null && match_score >= 60 ? 'bg-indigo-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${match_score ?? 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Right: Breakdown Popover Toggle + Action Button */}
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedBreakdownId(isExpanded ? null : application_id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                          isExpanded
                            ? 'bg-indigo-50 text-primary border-indigo-300'
                            : 'bg-white text-muted hover:text-text border-border'
                        }`}
                      >
                        <Info className="w-3.5 h-3.5 text-primary" />
                        <span>Breakdown ({matched_skills.length}/{totalReqSkills})</span>
                      </button>

                      {stage !== 'shortlisted' && (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                          onClick={() => handleShortlist(application_id, candidate?.name || 'Candidate')}
                        >
                          Shortlist
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Breakdown Popover Panel per Plan (Matched skills green, missing red) */}
                  {isExpanded && (
                    <div className="p-3.5 rounded-lg bg-gray-50/80 border border-border space-y-3 animate-in fade-in-0 duration-150">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-xs font-bold text-text uppercase tracking-wider">
                          Scoring Breakdown & Competency Alignment
                        </span>
                        <button onClick={() => setExpandedBreakdownId(null)} className="text-muted hover:text-text">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Dimension scores */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2 rounded bg-white border border-border">
                          <div className="text-[10px] text-muted">Skills Coverage</div>
                          <div className="font-bold text-text">{breakdown?.skills != null ? `${breakdown.skills}%` : '-'}</div>
                        </div>
                        <div className="p-2 rounded bg-white border border-border">
                          <div className="text-[10px] text-muted">Experience Fit</div>
                          <div className="font-bold text-text">{breakdown?.experience != null ? `${breakdown.experience}%` : '-'}</div>
                        </div>
                        <div className="p-2 rounded bg-white border border-border">
                          <div className="text-[10px] text-muted">Education & CGPA</div>
                          <div className="font-bold text-text">{breakdown?.education != null ? `${breakdown.education}%` : '-'}</div>
                        </div>
                        <div className="p-2 rounded bg-white border border-border">
                          <div className="text-[10px] text-muted">Semantic Alignment</div>
                          <div className="font-bold text-text">{breakdown?.semantic != null ? `${breakdown.semantic}%` : '-'}</div>
                        </div>
                      </div>

                      {/* Skills Alignment: Matched Green, Missing Red */}
                      <div className="space-y-2 pt-1">
                        <div>
                          <span className="text-[11px] font-bold text-emerald-800 block mb-1">
                            Matched Skills ({matched_skills.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {matched_skills.map((s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200"
                              >
                                ✓ {s}
                              </span>
                            ))}
                            {matched_skills.length === 0 && (
                              <span className="text-xs text-muted italic">None of the required skills matched</span>
                            )}
                          </div>
                        </div>

                        {missing_skills.length > 0 && (
                          <div>
                            <span className="text-[11px] font-bold text-rose-800 block mb-1">
                              Missing Competencies ({missing_skills.length}):
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {missing_skills.map((s) => (
                                <span
                                  key={s}
                                  className="px-2 py-0.5 rounded text-xs bg-rose-50 text-rose-800 font-semibold border border-rose-200"
                                >
                                  ✕ {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </TabsContent>

        {/* TAB 2: Requirements & JD (Editable on save via PATCH /jobs/{id}) */}
        <TabsContent value="requirements" className="space-y-6 mt-4">
          <div className="bg-card rounded-xl border border-border p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-text">Job Description & Competencies</h2>
                <p className="text-xs text-muted">Edit requirements and save to trigger immediate candidate re-ranking.</p>
              </div>

              {isEditingReqs ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditingReqs(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" leftIcon={<Save className="w-3.5 h-3.5" />} onClick={handleSaveRequirements}>
                    Save Changes
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" leftIcon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => setIsEditingReqs(true)}>
                  Edit Requirements
                </Button>
              )}
            </div>

            {/* Editable Fields Mode */}
            {isEditingReqs ? (
              <div className="space-y-4 p-4 rounded-xl bg-gray-50 border border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Job Location</label>
                    <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Min Experience (Years)</label>
                    <Input
                      type="number"
                      value={editMinExp}
                      onChange={(e) => setEditMinExp(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Required Skills (comma-separated)
                  </label>
                  <Input
                    value={editReqSkills.join(', ')}
                    onChange={(e) =>
                      setEditReqSkills(
                        e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Preferred Skills (comma-separated)
                  </label>
                  <Input
                    value={editPrefSkills.join(', ')}
                    onChange={(e) =>
                      setEditPrefSkills(
                        e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Minimum CGPA</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editMinCgpa}
                    onChange={(e) => setEditMinCgpa(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="space-y-4">
                <div className="text-sm text-text whitespace-pre-line leading-relaxed bg-gray-50 p-4 rounded-lg border border-border max-h-60 overflow-y-auto font-mono text-xs">
                  {job.jdText}
                </div>

                <div className="pt-2 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-bold text-muted mb-1">Required Skills</div>
                      <div className="flex flex-wrap gap-1">
                        {(job.requirements.requiredSkills || []).map((s: string) => (
                          <SkillChip key={s} name={s} status="required" />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-muted mb-1">Preferred Skills</div>
                      <div className="flex flex-wrap gap-1">
                        {(job.requirements.preferredSkills || []).map((s: string) => (
                          <SkillChip key={s} name={s} status="preferred" />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                    <div className="p-3 bg-gray-50 rounded-lg border border-border">
                      <div className="text-muted">Min Experience</div>
                      <div className="font-bold text-sm text-text mt-0.5">{job.requirements.minExperience} Years</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-border">
                      <div className="text-muted">Min CGPA</div>
                      <div className="font-bold text-sm text-text mt-0.5">{job.requirements.minCgpa} / 10</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-border">
                      <div className="text-muted">Target Grad Batches</div>
                      <div className="font-bold text-sm text-text mt-0.5">{job.requirements.gradYears.join(', ')}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-border">
                      <div className="text-muted">Location</div>
                      <div className="font-bold text-sm text-text mt-0.5">{job.location}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 3: Skill Gap Insights & Funnel Chart */}
        <TabsContent value="insights" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Skill Gap Chart */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-soft space-y-4">
              <div>
                <h3 className="text-sm font-bold text-text">Skill Supply in Applicant Pool</h3>
                <p className="text-xs text-muted">
                  Coverage of required competencies among current applicants from GET /jobs/{job.id}/skill-gap.
                </p>
              </div>

              <div className="space-y-3">
                {skillGapData.map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        {item.name}
                        {item.required && <Badge variant="secondary" size="sm">Required</Badge>}
                      </span>
                      <span className="text-muted">
                        {item.applicants_count} of {totalApplicants} ({item.coverage_pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.coverage_pct >= 60
                            ? 'bg-emerald-500'
                            : item.coverage_pct >= 30
                            ? 'bg-indigo-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${item.coverage_pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline Funnel (Numbers strictly match the table) */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text">Job Recruitment Funnel</h3>
                  <p className="text-xs text-muted">Current stage distribution ({totalApplicants} Total)</p>
                </div>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
