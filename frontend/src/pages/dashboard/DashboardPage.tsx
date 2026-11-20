import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Briefcase,
  Users,
  CheckCircle,
  Clock,
  ArrowRight,
  AlertTriangle,
  Copy,
  TrendingUp,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const {
    currentCompanyId,
    companies,
    jobs,
    candidates,
    applications,
    duplicateGroups,
  } = useAppStore()

  const company = companies.find((c) => c.id === currentCompanyId) || companies[0]

  const companyJobs = jobs.filter((j) => j.companyId === currentCompanyId)
  const companyCandidates = candidates.filter((c) => c.companyId === currentCompanyId)
  const companyApplications = applications.filter((a) => a.companyId === currentCompanyId)

  // KPI Metrics
  const openJobsCount = companyJobs.filter((j) => j.status === 'Active').length
  const totalCandidatesCount = companyCandidates.length
  const shortlistedCount = companyApplications.filter(
    (a) => a.stage === 'shortlisted' || a.stage === 'oa'
  ).length
  const avgShortlistDays = 2.4

  // Attention Items
  const needsReviewCount = companyApplications.filter((a) => a.stage === 'applied').length
  const stalledInterviewCount = companyApplications.filter((a) => a.stage === 'interview').length
  const pendingOffersCount = companyApplications.filter((a) => a.stage === 'offer').length

  const pendingDuplicates = duplicateGroups.filter(
    (g) => g.companyId === currentCompanyId && g.status === 'Pending'
  )
  const lowConfidenceParses = companyCandidates.filter((c) => c.parseConfidence < 65)

  // Top Matches this week
  const candidateMap = new Map(companyCandidates.map((c) => [c.id, c]))
  const jobMap = new Map(companyJobs.map((j) => [j.id, j]))

  const topMatches = [...companyApplications]
    .map((app) => ({
      app,
      candidate: candidateMap.get(app.candidateId)!,
      job: jobMap.get(app.jobId),
    }))
    .filter((item) => Boolean(item.candidate && item.job))
    .sort((a, b) => (b.app.matchScore ?? 0) - (a.app.matchScore ?? 0))
    .slice(0, 5)

  // Funnel Data
  const stages = company.settings.pipelineStages
  const funnelData = stages.map((st) => ({
    name: st.name,
    count: companyApplications.filter((a) => a.stage === st.id).length,
    fill: st.color,
  }))

  // Application Trend Data
  const weeklyTrends = [
    { week: 'W1 Oct', count: 18 },
    { week: 'W2 Oct', count: 26 },
    { week: 'W3 Oct', count: 34 },
    { week: 'W4 Oct', count: 42 },
    { week: 'W1 Nov', count: 58 },
    { week: 'W2 Nov', count: companyCandidates.length },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-border shadow-soft">
        <div>
          <h1 className="text-2xl font-bold text-text">Recruitment Command Center</h1>
          <p className="text-xs text-muted mt-0.5">
            Hiring Dashboard for <strong className="text-text">{company.name}</strong>. Here is your hiring velocity overview.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/candidates')}
          >
            Candidate Directory
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/upload')}
          >
            Upload Resumes
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Open Jobs */}
        <div
          onClick={() => navigate('/app/jobs')}
          className="bg-card rounded-xl border border-border p-4 shadow-card hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Active Job Postings</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-primary flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-text mt-2 group-hover:text-primary transition-colors">
            {openJobsCount}
          </div>
          <p className="text-[11px] text-muted mt-1">Across all departments</p>
        </div>

        {/* Card 2: Candidates */}
        <div
          onClick={() => navigate('/app/candidates')}
          className="bg-card rounded-xl border border-border p-4 shadow-card hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Indexed Talent Pool</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-accent flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-text mt-2 group-hover:text-primary transition-colors">
            {totalCandidatesCount}
          </div>
          <p className="text-[11px] text-muted mt-1">Parsed & structured records</p>
        </div>

        {/* Card 3: Shortlisted */}
        <div
          onClick={() => navigate('/app/pipeline')}
          className="bg-card rounded-xl border border-border p-4 shadow-card hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Shortlisted Candidates</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-text mt-2 group-hover:text-primary transition-colors">
            {shortlistedCount}
          </div>
          <p className="text-[11px] text-muted mt-1">Qualified for interview stage</p>
        </div>

        {/* Card 4: Avg Time to Shortlist */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Avg Time to Shortlist</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-text mt-2">
            {avgShortlistDays} Days
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 4x faster than manual review
          </p>
        </div>
      </div>

      {/* Needs Attention / Pipeline Action Strip */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-soft space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Attention Items & Review Priorities
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Attention Item 1: Needs review */}
          <div
            onClick={() => navigate('/app/candidates?stage=applied')}
            className="flex items-center justify-between p-3 rounded-lg bg-blue-50/70 border border-blue-200 hover:bg-blue-100/60 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <div>
                <h4 className="text-xs font-bold text-text group-hover:text-primary transition-colors">
                  Needs review ({needsReviewCount})
                </h4>
                <p className="text-[11px] text-muted">Applications awaiting review</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-primary" />
          </div>

          {/* Attention Item 2: Stalled in interview */}
          <div
            onClick={() => navigate('/app/candidates?stage=interview')}
            className="flex items-center justify-between p-3 rounded-lg bg-amber-50/70 border border-amber-200 hover:bg-amber-100/60 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-700" />
              <div>
                <h4 className="text-xs font-bold text-text group-hover:text-amber-800 transition-colors">
                  Stalled in interview ({stalledInterviewCount})
                </h4>
                <p className="text-[11px] text-muted">Awaiting interview feedback</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-700" />
          </div>

          {/* Attention Item 3: Pending offers */}
          <div
            onClick={() => navigate('/app/candidates?stage=offer')}
            className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 hover:bg-emerald-100/60 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <div>
                <h4 className="text-xs font-bold text-text group-hover:text-emerald-700 transition-colors">
                  Pending offers ({pendingOffersCount})
                </h4>
                <p className="text-[11px] text-muted">Final decision & rollout</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-600" />
          </div>
        </div>

        {/* Secondary conflicts (Duplicates / Low confidence) */}
        {(pendingDuplicates.length > 0 || lowConfidenceParses.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border">
            {pendingDuplicates.length > 0 && (
              <div
                onClick={() => navigate('/app/duplicates')}
                className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-border hover:bg-gray-100/70 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Copy className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-semibold text-text">
                    {pendingDuplicates.length} Duplicate Conflict{pendingDuplicates.length > 1 ? 's' : ''}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted" />
              </div>
            )}

            {lowConfidenceParses.length > 0 && (
              <div
                onClick={() => navigate('/app/upload')}
                className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-border hover:bg-gray-100/70 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-text">
                    {lowConfidenceParses.length} Low-Confidence Parsed Resumes
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Recruitment Funnel */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text">Active Pipeline Funnel</h3>
            <span className="text-xs text-muted">{companyApplications.length} Total Applications</span>
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

        {/* Chart 2: Applications Trend */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text">Candidate Ingestion Trajectory</h3>
            <Badge variant="outline" size="sm">Last 6 Weeks</Badge>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#4F46E5" fill="#EEF2FF" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Matches Section */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Top Candidate Matches This Week
            </h3>
            <p className="text-xs text-muted">Highest scoring candidate applications across all active jobs.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/app/candidates')}>
            View All
          </Button>
        </div>

        <div className="divide-y divide-border">
          {topMatches.map(({ candidate, app, job }, idx) => (
            <div
              key={app.id}
              onClick={() => navigate(`/app/candidates/${candidate.id}`)}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/60 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-5 text-center text-xs font-bold text-muted">#{idx + 1}</span>
                <Avatar name={candidate.name} size="sm" isBlind={company.settings.blindMode} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-text hover:text-primary">
                      {company.settings.blindMode ? 'Candidate #' + candidate.id.slice(-4) : candidate.name}
                    </span>
                    <Badge variant="secondary" size="sm">{job?.title}</Badge>
                  </div>
                  <div className="text-[11px] text-muted truncate mt-0.5">
                    {candidate.college} • CGPA: {candidate.cgpa} • {candidate.skills.slice(0, 3).join(', ')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right hidden sm:block text-[11px] text-muted">
                  Skills: <strong className="text-text">{app.breakdown?.skills != null ? `${app.breakdown.skills}%` : '-'}</strong>
                </div>
                <ScoreRing score={app.matchScore} size="sm" />
                <ArrowRight className="w-4 h-4 text-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
