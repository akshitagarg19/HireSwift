import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { api, USE_MOCK, CompareCandidateItem } from '@/api'
import { Button } from '@/components/ui/Button'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'
import {
  Scale,
  Sparkles,
  CheckCircle,
  Plus,
  Trash2,
  Award,
  ArrowRight,
  Check,
  X,
  Briefcase,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { Candidate, Job } from '@/types'

export const ComparePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { currentCompanyId, candidates, jobs, companies, updateApplicationStage, applications, isBlindMode } = useAppStore()

  const company = USE_MOCK
    ? (companies.find((c) => c.id === currentCompanyId) || companies[0])
    : { name: 'HireSwift Demo', settings: { customFields: [] } }

  // Live state
  const [liveJobs, setLiveJobs] = useState<Job[]>([])
  const [liveCandidates, setLiveCandidates] = useState<Candidate[]>([])
  const [apiComparison, setApiComparison] = useState<CompareCandidateItem[]>([])
  const [loading, setLoading] = useState(!USE_MOCK)
  const [error, setError] = useState<string | null>(null)

  const companyJobs = USE_MOCK
    ? jobs.filter((j) => j.companyId === currentCompanyId)
    : liveJobs

  // Target job
  const [selectedJobId, setSelectedJobId] = useState<string>('')

  // Selected candidate IDs: strictly 2 to 3 candidates per plan!
  const initialIds = (searchParams.get('candidateIds') || searchParams.get('ids') || '').split(',').filter(Boolean)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialIds.length >= 2) {
      return initialIds.slice(0, 3)
    }
    return []
  })

  // Load jobs and candidates in live mode
  useEffect(() => {
    if (!USE_MOCK) {
      Promise.all([api.getJobs(), api.getCandidates({ page_size: 100 })])
        .then(([jList, cList]) => {
          setLiveJobs(jList)
          setLiveCandidates(cList.items)
          if (jList.length > 0 && !selectedJobId) {
            setSelectedJobId(jList[0].id)
          }
          if (selectedIds.length < 2 && cList.items.length >= 2) {
            setSelectedIds([cList.items[0].id, cList.items[1].id])
          }
        })
        .catch((err: any) => {
          setError(err.message || 'Failed to initialize comparison data.')
        })
    } else {
      const cCands = candidates.filter((c) => c.companyId === currentCompanyId)
      if (selectedIds.length < 2 && cCands.length >= 2) {
        setSelectedIds([cCands[0].id, cCands[1].id])
      }
      const cJobs = jobs.filter((j) => j.companyId === currentCompanyId)
      if (cJobs.length > 0 && !selectedJobId) {
        setSelectedJobId(cJobs[0].id)
      }
    }
  }, [USE_MOCK])

  // Fetch comparison from API in live mode
  const fetchComparison = useCallback(async () => {
    if (USE_MOCK) return
    if (selectedIds.length < 2) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.compareCandidates(selectedIds, selectedJobId || undefined)
      setApiComparison(res.candidates)
    } catch (err: any) {
      setError(err.message || 'Failed to compare candidates.')
    } finally {
      setLoading(false)
    }
  }, [selectedIds, selectedJobId])

  useEffect(() => {
    fetchComparison()
  }, [fetchComparison])

  const companyCandidates = USE_MOCK
    ? candidates.filter((c) => c.companyId === currentCompanyId)
    : liveCandidates

  const activeJob = companyJobs.find((j) => j.id === selectedJobId)

  // Keep URL in sync
  useEffect(() => {
    if (selectedIds.length > 0) {
      setSearchParams({ candidateIds: selectedIds.join(',') }, { replace: true })
    }
  }, [selectedIds, setSearchParams])

  const selectedCandidates = USE_MOCK
    ? selectedIds
        .map((id) => companyCandidates.find((c) => c.id === id))
        .filter((c): c is Candidate => Boolean(c))
    : apiComparison.map((item) => item.candidate)

  // Compute comparisons via API in live mode, or store in mock mode
  const evaluatedComparisons = USE_MOCK
    ? selectedCandidates.map((cand) => {
        const existingApp = applications.find((a) => a.jobId === selectedJobId && a.candidateId === cand.id)
        const match = activeJob && existingApp
          ? {
              score: existingApp.matchScore,
              breakdown: existingApp.breakdown,
              matchedSkills: existingApp.matchedSkills || cand.skills.slice(0, 3),
              missingSkills: existingApp.missingSkills || [],
              explanation: existingApp.explanation || 'Competency evaluated.',
            }
          : {
              score: null,
              breakdown: null,
              matchedSkills: cand.skills.slice(0, 3),
              missingSkills: [],
              explanation: '',
            }

        return {
          candidate: cand,
          score: existingApp ? existingApp.matchScore : match.score,
          breakdown: match.breakdown,
          matchedSkills: match.matchedSkills,
          missingSkills: match.missingSkills,
          explanation: match.explanation,
          appId: existingApp?.id,
        }
      })
    : apiComparison.map((item) => ({
        candidate: item.candidate,
        score: item.match_score,
        breakdown: item.breakdown,
        matchedSkills: item.matched_skills || [],
        missingSkills: item.missing_skills || [],
        explanation: 'Assessed against JD requirements',
        appId: undefined,
      }))

  // Find best value per metric for highlighting best in each row
  const highestScore = Math.max(...evaluatedComparisons.map((c) => c.score ?? 0), 0)
  const highestCgpa = Math.max(...selectedCandidates.map((c) => c.cgpa ?? 0), 0)
  const highestExp = Math.max(...selectedCandidates.map((c) => c.experienceYears ?? 0), 0)
  const mostSkillsMatched = Math.max(...evaluatedComparisons.map((c) => c.matchedSkills.length), 0)

  // Top overall recommendation pick
  const topPick = evaluatedComparisons.slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]

  const handleAddCandidate = (candId: string) => {
    if (!candId) return
    if (selectedIds.includes(candId)) {
      toast.info('Candidate already in comparison.')
      return
    }
    // STRICT CHECK: Maximum of 3 candidates per plan!
    if (selectedIds.length >= 3) {
      toast.error('Comparison is limited to a maximum of 3 candidates.')
      return
    }
    setSelectedIds([...selectedIds, candId])
  }

  const handleRemoveCandidate = (candId: string) => {
    if (selectedIds.length <= 2) {
      toast.info('Comparison requires at least 2 candidates.')
      return
    }
    setSelectedIds(selectedIds.filter((id) => id !== candId))
  }

  const handleShortlistCandidate = (appId?: string, name?: string) => {
    if (!appId) {
      toast.info(`Candidate ${name || ''} has no open application for this job.`)
      return
    }
    api.moveApplication(appId, 'shortlisted', 'Shortlisted from Candidate Head-to-Head Comparison')
      .then(() => toast.success(`Shortlisted ${name}!`))
      .catch((err) => toast.error(err.message))
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-text">Candidate Head-to-Head Comparison</h1>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Side-by-Side Candidate Comparison: Compare 2 to 3 candidates across competencies, academic thresholds, and experience.
          </p>
        </div>

        {/* Target Job Selector & Candidate Adder */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-border px-2.5 py-1.5 rounded-lg text-xs">
            <Briefcase className="w-3.5 h-3.5 text-muted" />
            <span className="text-muted font-medium">JD:</span>
            <select
              aria-label="Target Job for Comparison"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="bg-transparent font-bold text-text focus:outline-none cursor-pointer"
            >
              {companyJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>

          {selectedIds.length < 3 && (
            <select
              aria-label="Add candidate to compare"
              onChange={(e) => {
                if (e.target.value) {
                  handleAddCandidate(e.target.value)
                  e.target.value = ''
                }
              }}
              defaultValue=""
              className="h-8 px-2 text-xs rounded-lg border border-border bg-white text-text font-medium cursor-pointer"
            >
              <option value="" disabled>+ Add candidate to compare...</option>
              {companyCandidates
                .filter((c) => !selectedIds.includes(c.id))
                .slice(0, 15)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.college} • {c.cgpa} CGPA)
                  </option>
                ))}
            </select>
          )}

          {selectedIds.length >= 3 && (
            <span className="text-xs text-muted font-semibold bg-gray-100 px-2 py-1 rounded">
              Max 3 Candidates
            </span>
          )}
        </div>
      </div>

      {/* Error state with Retry */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-800 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchComparison}>
            Retry
          </Button>
        </div>
      )}

      {/* Top AI Decision Card */}
      {topPick && (
        <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-white rounded-xl border border-indigo-100 p-4 shadow-soft flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                  HireSwift AI Hiring Recommendation for {activeJob?.title}
                </span>
                <Badge variant="default" size="sm">Top Fit ({topPick.score}%)</Badge>
              </div>
              <h3 className="text-base font-extrabold text-text mt-0.5">
                {isBlindMode ? 'Candidate #' + topPick.candidate.id : topPick.candidate.name}
              </h3>
              <p className="text-xs text-muted">{topPick.explanation}</p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<CheckCircle className="w-4 h-4" />}
            onClick={() => handleShortlistCandidate(topPick.appId, topPick.candidate.name)}
          >
            Shortlist {isBlindMode ? 'Top Pick' : topPick.candidate.name.split(' ')[0]}
          </Button>
        </div>
      )}

      {/* Side-by-Side Dimensional Comparison Matrix */}
      {evaluatedComparisons.length === 0 ? (
        <EmptyState
          icon={<Scale className="w-8 h-8 text-primary" />}
          title="No candidates selected for comparison"
          description="Select 2 to 3 candidates from your talent pool to evaluate them head-to-head."
        />
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="p-4 border-b border-border bg-gray-50/50">
            <h3 className="text-sm font-bold text-text">Criteria & Fit Breakdown</h3>
            <p className="text-xs text-muted">Direct side-by-side comparison. Green badge highlights the top-ranking value in each dimension.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-gray-50/30">
                  <th className="p-4 w-48 font-semibold text-muted">Evaluation Dimension</th>
                  {evaluatedComparisons.map(({ candidate, appId }) => (
                    <th key={candidate.id} className="p-4 min-w-[240px]">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={candidate.name} size="sm" isBlind={isBlindMode} />
                          <div>
                            <div className="font-bold text-text text-sm">
                              {isBlindMode ? 'Candidate #' + candidate.id : candidate.name}
                            </div>
                            <div className="text-[11px] text-muted">
                              {isBlindMode ? '[Hidden Location]' : candidate.location}
                            </div>
                          </div>
                        </div>

                        {selectedIds.length > 2 && (
                          <button
                            onClick={() => handleRemoveCandidate(candidate.id)}
                            className="p-1 text-muted hover:text-rose-600 rounded transition-colors"
                            title="Remove from comparison"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

            <tbody className="divide-y divide-border">
              {/* Row 1: Match Score (Highlighted) */}
              <tr className="bg-indigo-50/20">
                <td className="p-4 font-bold text-text">Overall JD Match</td>
                {evaluatedComparisons.map(({ candidate, score }) => {
                  const isBest = score === highestScore && score > 0
                  return (
                    <td key={candidate.id} className={`p-4 ${isBest ? 'bg-emerald-50/40' : ''}`}>
                      <div className="flex items-center gap-2">
                        <ScoreRing score={score} size="sm" />
                        <span className="font-extrabold text-sm text-text">{score != null ? `${score}/100` : '-'}</span>
                        {isBest && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                            Best Fit
                          </span>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>

              {/* Row 2: Academic CGPA (Highlighted) */}
              <tr>
                <td className="p-4 font-semibold text-text">College CGPA</td>
                {selectedCandidates.map((cand) => {
                  const isBest = cand.cgpa === highestCgpa && cand.cgpa > 0
                  return (
                    <td key={cand.id} className={`p-4 ${isBest ? 'bg-emerald-50/40' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text">{cand.cgpa} / 10</span>
                        {isBest && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                            Top Academic
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted mt-0.5">
                        {isBlindMode ? '[Hidden College]' : `${cand.college} (${cand.degree})`}
                      </div>
                    </td>
                  )
                })}
              </tr>

              {/* Row 3: Class 10th & 12th Board % */}
              <tr>
                <td className="p-4 font-semibold text-text">Schooling Scores</td>
                {selectedCandidates.map((cand) => (
                  <td key={cand.id} className="p-4">
                    <div className="font-medium text-text">10th: {cand.tenthPercent}%</div>
                    <div className="font-medium text-text mt-0.5">12th: {cand.twelfthPercent}%</div>
                  </td>
                ))}
              </tr>

              {/* Row 4: Experience Years (Highlighted) */}
              <tr>
                <td className="p-4 font-semibold text-text">Experience Level</td>
                {selectedCandidates.map((cand) => {
                  const isBest = cand.experienceYears === highestExp
                  return (
                    <td key={cand.id} className={`p-4 ${isBest ? 'bg-emerald-50/40' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text">
                          {cand.experienceYears === 0 ? 'Fresher (0 yrs)' : `${cand.experienceYears} Years`}
                        </span>
                        {isBest && highestExp > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                            Highest Exp
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted mt-0.5">Graduated in {cand.gradYear}</div>
                    </td>
                  )
                })}
              </tr>

              {/* Row 5: Matched Skills Coverage */}
              <tr>
                <td className="p-4 font-semibold text-text">Matched Skills</td>
                {evaluatedComparisons.map(({ candidate, matchedSkills }) => {
                  const isBest = matchedSkills.length === mostSkillsMatched && mostSkillsMatched > 0
                  return (
                    <td key={candidate.id} className={`p-4 ${isBest ? 'bg-emerald-50/40' : ''}`}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="font-bold text-emerald-700">{matchedSkills.length} matched</span>
                        {isBest && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                            Most Coverage
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {matchedSkills.map((s) => (
                          <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                  )
                })}
              </tr>

              {/* Row 6: Missing Skills Gap */}
              <tr>
                <td className="p-4 font-semibold text-text">Missing Skill Gaps</td>
                {evaluatedComparisons.map(({ candidate, missingSkills }) => (
                  <td key={candidate.id} className="p-4">
                    {missingSkills.length === 0 ? (
                      <span className="text-emerald-600 font-medium text-xs">No required skill gaps</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {missingSkills.map((s) => (
                          <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 font-medium border border-rose-200">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                ))}
              </tr>

              {/* Row 7: Action Row */}
              <tr className="bg-gray-50/50">
                <td className="p-4 font-bold text-text">Pipeline Action</td>
                {evaluatedComparisons.map(({ candidate, appId }) => (
                  <td key={candidate.id} className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleShortlistCandidate(appId, candidate.name)}
                      >
                        Shortlist
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/app/candidates/${candidate.id}`)}
                      >
                        View Full Dossier
                      </Button>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  )
}
