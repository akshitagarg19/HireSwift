import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { Avatar } from '@/components/ui/Avatar'
import { SkillChip } from '@/components/ui/SkillChip'
import { Badge } from '@/components/ui/Badge'
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
} from 'lucide-react'
import { matchScore } from '@/lib/scoring'
import { Candidate } from '@/types'

export const ComparePage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { currentCompanyId, candidates, jobs, companies, updateApplicationStage, applications } = useAppStore()

  const company = companies.find((c) => c.id === currentCompanyId) || companies[0]
  const companyJobs = jobs.filter((j) => j.companyId === currentCompanyId)
  const companyCandidates = candidates.filter((c) => c.companyId === currentCompanyId)

  // Target job
  const [selectedJobId, setSelectedJobId] = useState<string>(companyJobs[0]?.id || '')
  const activeJob = companyJobs.find((j) => j.id === selectedJobId)

  // Selected candidate IDs (from URL or defaults)
  const initialIds = (searchParams.get('candidateIds') || '').split(',').filter(Boolean)
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialIds.length >= 2 ? initialIds.slice(0, 4) : [companyCandidates[0]?.id, companyCandidates[1]?.id].filter(Boolean)
  )

  const selectedCandidates = selectedIds
    .map((id) => companyCandidates.find((c) => c.id === id))
    .filter((c): c is Candidate => Boolean(c))

  // Compute live match score and breakdowns for each compared candidate
  const evaluatedComparisons = selectedCandidates.map((cand) => {
    const existingApp = applications.find((a) => a.jobId === selectedJobId && a.candidateId === cand.id)
    const match = activeJob
      ? matchScore(cand, activeJob, company.settings.scoringWeights, company.settings.skillSynonyms)
      : {
          score: 70,
          breakdown: { skills: 70, experience: 70, education: 70, semantic: 70 },
          matchedSkills: cand.skills.slice(0, 3),
          missingSkills: [],
          explanation: '',
          evidenceSnippets: [],
        }

    return {
      candidate: cand,
      score: existingApp ? existingApp.matchScore : match.score,
      breakdown: existingApp ? existingApp.breakdown : match.breakdown,
      matchedSkills: existingApp ? existingApp.matchedSkills : match.matchedSkills,
      missingSkills: existingApp ? existingApp.missingSkills : match.missingSkills,
      explanation: match.explanation,
      appId: existingApp?.id,
    }
  })

  // Find best value per metric for highlighting
  const highestScore = Math.max(...evaluatedComparisons.map((c) => c.score), 0)
  const highestCgpa = Math.max(...selectedCandidates.map((c) => c.cgpa), 0)
  const highestExp = Math.max(...selectedCandidates.map((c) => c.experienceYears), 0)
  const mostSkillsMatched = Math.max(...evaluatedComparisons.map((c) => c.matchedSkills.length), 0)

  // Recommendation pick
  const topPick = evaluatedComparisons.slice().sort((a, b) => b.score - a.score)[0]

  const handleAddCandidate = (candId: string) => {
    if (!candId) return
    if (selectedIds.includes(candId)) {
      toast.info('Candidate already in comparison.')
      return
    }
    if (selectedIds.length >= 4) {
      toast.error('Compare supports up to 4 candidates at once.')
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

  const handleShortlistCandidate = (candId: string, name: string) => {
    const app = applications.find((a) => a.jobId === selectedJobId && a.candidateId === candId)
    if (app) {
      updateApplicationStage(app.id, 'shortlisted', 'Shortlisted from Candidate Comparison')
      toast.success(`Shortlisted ${name}!`)
    } else {
      toast.info(`${name} shortlisted`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Side-by-Side Candidate Comparison
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Compare academic metrics, skills overlap, and experience across top contenders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label className="text-[11px] font-semibold text-muted block mb-0.5">Target Job:</label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-white text-xs font-semibold text-text"
            >
              {companyJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>

          {selectedIds.length < 4 && (
            <div>
              <label className="text-[11px] font-semibold text-muted block mb-0.5">Add Candidate:</label>
              <select
                onChange={(e) => {
                  handleAddCandidate(e.target.value)
                  e.target.value = ''
                }}
                defaultValue=""
                className="h-9 px-3 rounded-lg border border-border bg-white text-xs text-text"
              >
                <option value="" disabled>
                  + Add Candidate...
                </option>
                {companyCandidates
                  .filter((c) => !selectedIds.includes(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.college})
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* AI Recommendation Banner */}
      {topPick && (
        <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-5 shadow-soft flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                HireSwift AI Hiring Recommendation
              </span>
              <Badge variant="success" size="sm">
                Rank #1
              </Badge>
            </div>
            <h3 className="text-sm font-bold text-text">
              We recommend prioritizing {topPick.candidate.name} ({topPick.score}% fit)
            </h3>
            <p className="text-xs text-indigo-950 leading-relaxed">
              {topPick.candidate.name} leads with highest skills fit ({topPick.breakdown.skills}%) matching{' '}
              {topPick.matchedSkills.length} required skills. Academic CGPA {topPick.candidate.cgpa}/10 from{' '}
              {topPick.candidate.college} provides the strongest foundation for the {activeJob?.title} opening.
            </p>
          </div>
        </div>
      )}

      {/* Comparison Grid Table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          {/* Sticky Header with Candidates */}
          <thead>
            <tr className="border-b border-border bg-gray-50/80">
              <th className="p-4 w-44 font-bold text-text uppercase tracking-wider">Metric</th>
              {evaluatedComparisons.map(({ candidate, score }) => (
                <th key={candidate.id} className="p-4 min-w-[240px] align-top">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar name={candidate.name} size="md" isBlind={company.settings.blindMode} />
                        <div>
                          <div className="font-bold text-sm text-text">
                            {company.settings.blindMode ? 'Candidate ' + candidate.id.slice(-4) : candidate.name}
                          </div>
                          <div className="text-[11px] text-muted">{candidate.college}</div>
                        </div>
                      </div>
                      {selectedIds.length > 2 && (
                        <button
                          onClick={() => handleRemoveCandidate(candidate.id)}
                          className="text-muted hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <ScoreRing score={score} size="md" />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleShortlistCandidate(candidate.id, candidate.name)}
                      >
                        Shortlist
                      </Button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {/* ROW: Match Score */}
            <tr className="hover:bg-gray-50/50">
              <td className="p-4 font-semibold text-text">Overall Match Score</td>
              {evaluatedComparisons.map(({ candidate, score }) => {
                const isBest = score === highestScore
                return (
                  <td key={candidate.id} className={`p-4 ${isBest ? 'bg-emerald-50/50 font-bold' : ''}`}>
                    <span className={isBest ? 'text-emerald-700 font-bold' : ''}>{score}%</span>
                    {isBest && <Badge variant="success" size="sm" className="ml-2">Top Score</Badge>}
                  </td>
                )
              })}
            </tr>

            {/* ROW: College & Degree */}
            <tr className="hover:bg-gray-50/50">
              <td className="p-4 font-semibold text-text">College & Branch</td>
              {selectedCandidates.map((c) => (
                <td key={c.id} className="p-4">
                  <div className="font-semibold">{c.college}</div>
                  <div className="text-muted text-[11px]">{c.degree} in {c.branch}</div>
                </td>
              ))}
            </tr>

            {/* ROW: CGPA */}
            <tr className="hover:bg-gray-50/50">
              <td className="p-4 font-semibold text-text">College CGPA</td>
              {selectedCandidates.map((c) => {
                const isBest = c.cgpa === highestCgpa
                return (
                  <td key={c.id} className={`p-4 ${isBest ? 'bg-emerald-50/50 font-bold' : ''}`}>
                    <span className={isBest ? 'text-emerald-700 font-bold' : ''}>{c.cgpa} / 10</span>
                    {isBest && <Badge variant="success" size="sm" className="ml-2">Highest</Badge>}
                  </td>
                )
              })}
            </tr>

            {/* ROW: Class 10th / 12th % */}
            <tr className="hover:bg-gray-50/50">
              <td className="p-4 font-semibold text-text">10th & 12th Boards</td>
              {selectedCandidates.map((c) => (
                <td key={c.id} className="p-4">
                  <div>12th: <strong>{c.twelfthPercent}%</strong></div>
                  <div className="text-muted">10th: <strong>{c.tenthPercent}%</strong></div>
                </td>
              ))}
            </tr>

            {/* ROW: Matched Skills */}
            <tr className="hover:bg-gray-50/50">
              <td className="p-4 font-semibold text-text">Matched Skills</td>
              {evaluatedComparisons.map(({ candidate, matchedSkills }) => {
                const isBest = matchedSkills.length === mostSkillsMatched
                return (
                  <td key={candidate.id} className={`p-4 ${isBest ? 'bg-emerald-50/30' : ''}`}>
                    <div className="flex flex-wrap gap-1">
                      {matchedSkills.map((s) => (
                        <SkillChip key={s} name={s} status="matched" size="sm" />
                      ))}
                    </div>
                  </td>
                )
              })}
            </tr>

            {/* ROW: Missing Skills */}
            <tr className="hover:bg-gray-50/50">
              <td className="p-4 font-semibold text-text">Missing Skills</td>
              {evaluatedComparisons.map(({ candidate, missingSkills }) => (
                <td key={candidate.id} className="p-4">
                  {missingSkills.length === 0 ? (
                    <span className="text-emerald-600 font-medium">None (All Present)</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {missingSkills.map((s) => (
                        <SkillChip key={s} name={s} status="missing" size="sm" />
                      ))}
                    </div>
                  )}
                </td>
              ))}
            </tr>

            {/* ROW: Experience */}
            <tr className="hover:bg-gray-50/50">
              <td className="p-4 font-semibold text-text">Industry Experience</td>
              {selectedCandidates.map((c) => {
                const isBest = c.experienceYears === highestExp && highestExp > 0
                return (
                  <td key={c.id} className={`p-4 ${isBest ? 'bg-emerald-50/50 font-bold' : ''}`}>
                    <div>{c.experienceYears === 0 ? 'Fresher' : `${c.experienceYears} Years`}</div>
                    <div className="text-muted text-[11px]">Batch {c.gradYear}</div>
                  </td>
                )
              })}
            </tr>

            {/* ROW: Location */}
            <tr className="hover:bg-gray-50/50">
              <td className="p-4 font-semibold text-text">Location</td>
              {selectedCandidates.map((c) => (
                <td key={c.id} className="p-4 text-text">
                  {c.location}
                </td>
              ))}
            </tr>

            {/* ROW: Expected CTC */}
            <tr className="hover:bg-gray-50/50">
              <td className="p-4 font-semibold text-text">Expected CTC</td>
              {selectedCandidates.map((c) => (
                <td key={c.id} className="p-4 font-semibold text-text">
                  ₹{String(c.customFields['cf-ctc'] || '12')} LPA
                </td>
              ))}
            </tr>

            {/* ROW: Notice Period */}
            <tr className="hover:bg-gray-50/50">
              <td className="p-4 font-semibold text-text">Notice Period</td>
              {selectedCandidates.map((c) => {
                const notice = String(c.customFields['cf-notice'] || '30 Days')
                const isFast = notice === 'Immediate' || notice === '15 Days'
                return (
                  <td key={c.id} className={`p-4 ${isFast ? 'bg-emerald-50/50 font-bold text-emerald-800' : ''}`}>
                    {notice}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
