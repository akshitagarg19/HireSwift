import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAppStore } from '@/store'
import { api, USE_MOCK, SkillGapItem } from '@/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { BarChart3, AlertCircle, TrendingUp, MapPin, GraduationCap, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'
import { Job, Application, Candidate } from '@/types'

export const InsightsPage: React.FC = () => {
  const { currentCompanyId, candidates, jobs, applications } = useAppStore()

  const [selectedJobId, setSelectedJobId] = useState<string>('all')

  // Live state
  const [liveJobs, setLiveJobs] = useState<Job[]>([])
  const [liveApplications, setLiveApplications] = useState<Application[]>([])
  const [liveSkillGap, setLiveSkillGap] = useState<SkillGapItem[]>([])
  const [loading, setLoading] = useState(!USE_MOCK)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = useCallback(async () => {
    if (USE_MOCK) return
    setLoading(true)
    setError(null)
    try {
      const [jList, aList] = await Promise.all([
        api.getJobs(),
        api.getApplications(selectedJobId !== 'all' ? selectedJobId : undefined),
      ])
      setLiveJobs(jList)
      setLiveApplications(aList)

      const targetJobId = selectedJobId !== 'all' ? selectedJobId : (jList[0]?.id || '')
      if (targetJobId) {
        const gapRes = await api.getJobSkillGap(targetJobId)
        setLiveSkillGap(gapRes.skills)
      } else {
        setLiveSkillGap([])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve analytics and skill-gap insights.')
    } finally {
      setLoading(false)
    }
  }, [selectedJobId])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  const companyJobs = USE_MOCK
    ? jobs.filter((j) => j.companyId === currentCompanyId)
    : liveJobs

  const activeApps = USE_MOCK
    ? (selectedJobId === 'all'
        ? applications.filter((a) => a.companyId === currentCompanyId)
        : applications.filter((a) => a.companyId === currentCompanyId && a.jobId === selectedJobId))
    : liveApplications

  // 1. Pipeline Funnel Counts from GET /applications
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {
      applied: 0,
      shortlisted: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    }
    activeApps.forEach((a) => {
      const st = a.stage?.toLowerCase() || 'applied'
      if (counts[st] !== undefined) {
        counts[st]++
      } else {
        counts.applied++
      }
    })
    return [
      { stage: 'Applied', count: counts.applied, fill: '#2563EB' },
      { stage: 'Shortlisted', count: counts.shortlisted, fill: '#7C3AED' },
      { stage: 'Interview', count: counts.interview, fill: '#F59E0B' },
      { stage: 'Offer', count: counts.offer, fill: '#16A34A' },
      { stage: 'Rejected', count: counts.rejected, fill: '#DC2626' },
    ]
  }, [activeApps])

  // 2. Skill-Gap from GET /jobs/{id}/skill-gap
  const skillGapChartData = useMemo(() => {
    if (!USE_MOCK) {
      return liveSkillGap.map((s) => ({
        skill: s.name,
        applicants: s.applicants_count,
        coverage: s.coverage_pct,
        required: s.required,
      }))
    }
    const skillFrequency: Record<string, number> = {}
    candidates
      .filter((c) => c.companyId === currentCompanyId)
      .forEach((c) => {
        c.skills.forEach((s) => {
          skillFrequency[s] = (skillFrequency[s] || 0) + 1
        })
      })
    return Object.entries(skillFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([skill, count]) => ({
        skill,
        applicants: count,
        coverage: Math.round((count / (candidates.length || 1)) * 100),
        required: true,
      }))
  }, [liveSkillGap, candidates, currentCompanyId])

  // 3. Dynamic Data Callouts
  const totalAppsCount = activeApps.length
  const shortlistedCount = activeApps.filter((a) => a.stage === 'shortlisted').length
  const interviewCount = activeApps.filter((a) => a.stage === 'interview').length
  const offerCount = activeApps.filter((a) => a.stage === 'offer').length

  const COLORS = ['#4F46E5', '#14B8A6', '#F59E0B', '#EC4899', '#8B5CF6']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Talent Pool Insights & Analytics
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Skill-gap analytics from job requirements and live pipeline stage conversions from applications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted">Scope:</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="h-8 px-3 rounded-lg border border-border bg-white text-xs font-semibold text-text"
          >
            <option value="all">All Jobs Combined</option>
            {companyJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error State with Retry */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-800 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchInsights}>
            Retry
          </Button>
        </div>
      )}

      {/* Dynamic Key Data Callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Total Applications
          </div>
          <p className="text-2xl font-extrabold text-blue-900">{totalAppsCount}</p>
          <p className="text-[11px] text-blue-700">Candidates in hiring process</p>
        </div>

        <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-purple-900 font-bold text-xs uppercase">
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
            Shortlisted Pool
          </div>
          <p className="text-2xl font-extrabold text-purple-900">{shortlistedCount}</p>
          <p className="text-[11px] text-purple-700">Advanced from resume screening</p>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            Interview Stage
          </div>
          <p className="text-2xl font-extrabold text-amber-900">{interviewCount}</p>
          <p className="text-[11px] text-amber-700">Currently undergoing interviews</p>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            Offers Extended
          </div>
          <p className="text-2xl font-extrabold text-emerald-900">{offerCount}</p>
          <p className="text-[11px] text-emerald-700">Final hiring stage reached</p>
        </div>
      </div>

      {totalAppsCount === 0 && !loading ? (
        <EmptyState
          icon={<BarChart3 className="w-8 h-8 text-primary" />}
          title="No analytics available"
          description="Upload resumes or create job applications to generate recruitment funnel and skill-gap metrics."
        />
      ) : (
        /* Charts Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Pipeline Stage Conversion Funnel from GET /applications */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text">Pipeline Stage Conversion Funnel</h3>
              <Badge variant="outline" size="sm">GET /applications</Badge>
            </div>
            <p className="text-xs text-muted">
              Applicant volume across each of the 5 recruitment pipeline stages.
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageCounts} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]}>
                    {stageCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Skill-Gap Coverage from GET /jobs/{id}/skill-gap */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text">Skill-Gap Coverage & Applicants</h3>
              <Badge variant="outline" size="sm">GET /jobs/{'{id}'}/skill-gap</Badge>
            </div>
            <p className="text-xs text-muted">
              Coverage percentage and applicant count for key competencies.
            </p>
            <div className="h-64">
              {skillGapChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted">
                  No skill-gap data available for selected job.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillGapChartData} layout="vertical" margin={{ top: 5, right: 20, left: 35, bottom: 5 }}>
                    <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="skill" type="category" tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: any) => [`${value}% coverage`, 'Coverage']} />
                    <Bar dataKey="coverage" fill="#14B8A6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
