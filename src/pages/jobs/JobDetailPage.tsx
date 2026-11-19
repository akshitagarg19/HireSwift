import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { Avatar } from '@/components/ui/Avatar'
import { SkillChip } from '@/components/ui/SkillChip'
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
  ExternalLink,
  Save,
  Check,
} from 'lucide-react'

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    jobs,
    candidates,
    applications,
    companies,
    currentCompanyId,
    updateCompanySettings,
    rematchTalentPool,
    updateApplicationStage,
    updateJob,
  } = useAppStore()

  const job = jobs.find((j) => j.id === id)
  const company = companies.find((c) => c.id === currentCompanyId) || companies[0]

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

  if (!job) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-border">
        <h2 className="text-lg font-bold text-text">Job Not Found</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/app/jobs')}>
          Back to Jobs
        </Button>
      </div>
    )
  }

  // Applications for this job
  const jobApplications = applications.filter((a) => a.jobId === job.id)
  const candidateMap = new Map(candidates.map((c) => [c.id, c]))

  // Ranked candidates: sorted by matchScore descending
  const rankedList = [...jobApplications]
    .map((app) => ({
      app,
      candidate: candidateMap.get(app.candidateId)!,
    }))
    .filter((item) => Boolean(item.candidate))
    .sort((a, b) => b.app.matchScore - a.app.matchScore)

  // Handle slider weight changes (re-ranks candidates for this job only)
  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    const updated = { ...weights, [key]: value }
    setWeights(updated)

    // Save to this specific job and trigger live re-rank for this job only
    updateJob(job.id, {
      scoringWeights: updated,
    })
  }

  const handleRematch = () => {
    setIsRematching(true)
    setTimeout(() => {
      rematchTalentPool(job.id)
      setIsRematching(false)
      toast.success('Successfully scored entire talent pool against this job!')
    }, 400)
  }

  const handleShortlist = (appId: string, candidateName: string) => {
    updateApplicationStage(appId, 'shortlisted', 'Directly shortlisted from Job Ranking')
    toast.success(`Shortlisted ${candidateName}!`)
  }

  // Calculate skill gap metrics for the Insights tab
  const totalApplicants = rankedList.length
  const skillSupplyCount: Record<string, number> = {}
  job.requirements.requiredSkills.forEach((s) => (skillSupplyCount[s] = 0))

  rankedList.forEach(({ candidate }) => {
    candidate.skills.forEach((s) => {
      if (skillSupplyCount[s] !== undefined) {
        skillSupplyCount[s]++
      }
    })
  })

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
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {rankedList.length} Applicants
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Sliders className="w-4 h-4" />}
            onClick={() => setShowWeightPanel(!showWeightPanel)}
          >
            {showWeightPanel ? 'Hide Sliders' : 'Scoring Weights'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={`w-4 h-4 ${isRematching ? 'animate-spin' : ''}`} />}
            onClick={handleRematch}
            isLoading={isRematching}
          >
            Re-match Talent Pool
          </Button>
        </div>
      </div>

      {/* Slide-down scoring weights adjustment banner */}
      {showWeightPanel && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-5 shadow-soft animate-in fade-in-0 duration-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Live Scoring Sliders (Affects All Rankings Instantly)
              </h3>
              <p className="text-xs text-muted">
                Adjust the importance of skills, experience, education, and semantic similarity. Total: {weights.skills + weights.experience + weights.education + weights.semantic}%
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setWeights({ skills: 45, experience: 30, education: 10, semantic: 15 })
                updateCompanySettings(company.id, {
                  scoringWeights: { skills: 45, experience: 30, education: 10, semantic: 15 },
                })
                toast.success('Reset to standard weights')
              }}
            >
              Reset to Preset
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-border p-1">
          <TabsTrigger value="ranked">Ranked Candidates ({rankedList.length})</TabsTrigger>
          <TabsTrigger value="requirements">Requirements & JD</TabsTrigger>
          <TabsTrigger value="insights">Skill Gap Insights</TabsTrigger>
        </TabsList>

        {/* TAB 1: Ranked Candidates */}
        <TabsContent value="ranked" className="space-y-3 mt-4">
          {rankedList.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-border">
              <Users className="w-10 h-10 text-muted mx-auto mb-2" />
              <h3 className="text-base font-semibold text-text">No candidates applied yet</h3>
              <p className="text-xs text-muted mt-1">
                Click "Re-match Talent Pool" above or upload resumes to score candidates.
              </p>
            </div>
          ) : (
            rankedList.map(({ app, candidate }, rank) => (
              <div
                key={app.id}
                onClick={() => navigate(`/app/candidates/${candidate.id}`)}
                className="bg-card hover:bg-gray-50/70 border border-border hover:border-indigo-200 rounded-xl p-4 shadow-card transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Left info */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className="w-6 text-center text-xs font-bold text-muted">
                    #{rank + 1}
                  </div>
                  <Avatar name={candidate.name} size="md" isBlind={company.settings.blindMode} />
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text text-sm group-hover:text-primary transition-colors">
                        {company.settings.blindMode ? 'Candidate ' + candidate.id.slice(-4) : candidate.name}
                      </span>
                      <Badge variant="outline" size="sm">
                        {app.stage}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>{candidate.college}</span>
                      <span>•</span>
                      <span>CGPA: <strong className="text-text">{candidate.cgpa}</strong></span>
                      <span>•</span>
                      <span>{candidate.experienceYears}y exp</span>
                      <span>•</span>
                      <span>{candidate.location}</span>
                    </div>

                    <p className="text-xs text-muted italic line-clamp-1">
                      💡 {app.explanation}
                    </p>
                  </div>
                </div>

                {/* Right: Score Ring + Breakdown + Actions */}
                <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] text-muted">Match Breakdown</div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-text mt-0.5">
                      <span title="Skills Score">Skills {app.breakdown.skills}%</span>
                      <span>•</span>
                      <span title="Experience Score">Exp {app.breakdown.experience}%</span>
                      <span>•</span>
                      <span title="Education Score">Edu {app.breakdown.education}%</span>
                    </div>
                  </div>

                  <ScoreRing score={app.matchScore} size="md" />

                  {app.stage === 'applied' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleShortlist(app.id, candidate.name)}
                    >
                      Shortlist
                    </Button>
                  )}
                  {app.stage === 'shortlisted' && (
                    <Badge variant="success" size="md">Shortlisted</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* TAB 2: Requirements & JD */}
        <TabsContent value="requirements" className="space-y-6 mt-4">
          <div className="bg-card rounded-xl border border-border p-6 shadow-soft space-y-4">
            <h2 className="text-base font-bold text-text">Job Description</h2>
            <div className="text-sm text-text whitespace-pre-line leading-relaxed bg-gray-50 p-4 rounded-lg border border-border">
              {job.jdText}
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <h3 className="text-sm font-bold text-text">Configured Screening Criteria</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted mb-1">Required Skills</div>
                  <div className="flex flex-wrap gap-1">
                    {job.requirements.requiredSkills.map((s) => (
                      <SkillChip key={s} name={s} status="required" />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted mb-1">Preferred Skills</div>
                  <div className="flex flex-wrap gap-1">
                    {job.requirements.preferredSkills.map((s) => (
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
                  <div className="text-muted">Min 10th/12th %</div>
                  <div className="font-bold text-sm text-text mt-0.5">{job.requirements.minTenth}% / {job.requirements.minTwelfth}%</div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: Skill Gap Insights */}
        <TabsContent value="insights" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl border border-border p-6 shadow-soft space-y-4">
            <div>
              <h2 className="text-base font-bold text-text">Skill Supply in Applicant Pool</h2>
              <p className="text-xs text-muted">
                Percentage of current applicants possessing each required skill.
              </p>
            </div>

            <div className="space-y-3">
              {job.requirements.requiredSkills.map((skill) => {
                const count = skillSupplyCount[skill] || 0
                const percent = totalApplicants > 0 ? Math.round((count / totalApplicants) * 100) : 0

                return (
                  <div key={skill} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{skill}</span>
                      <span className="text-muted">
                        {count} of {totalApplicants} applicants ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          percent >= 60 ? 'bg-emerald-500' : percent >= 30 ? 'bg-indigo-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
