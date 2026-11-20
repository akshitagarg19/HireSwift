import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAppStore } from '@/store'
import { api, USE_MOCK, SkillGapItem } from '@/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  BarChart3,
  AlertCircle,
  TrendingUp,
  MapPin,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Printer,
  Download,
  FileSpreadsheet,
} from 'lucide-react'
import { Job, Application, Candidate } from '@/types'

export const InsightsPage: React.FC = () => {
  const { currentCompanyId, candidates, jobs, applications } = useAppStore()

  const [selectedJobId, setSelectedJobId] = useState<string>('all')

  // Live state (strictly from API in live mode)
  const [liveJobs, setLiveJobs] = useState<Job[]>([])
  const [liveApplications, setLiveApplications] = useState<Application[]>([])
  const [liveCandidates, setLiveCandidates] = useState<Candidate[]>([])
  const [liveSkillGap, setLiveSkillGap] = useState<SkillGapItem[]>([])
  const [loading, setLoading] = useState(!USE_MOCK)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = useCallback(async () => {
    if (USE_MOCK) return
    setLoading(true)
    setError(null)
    try {
      const [jList, aList, cList] = await Promise.all([
        api.getJobs(),
        api.getApplications(selectedJobId !== 'all' ? selectedJobId : undefined),
        api.getCandidates({ page_size: 100 }),
      ])
      setLiveJobs(jList)
      setLiveApplications(aList)
      setLiveCandidates(cList.items)

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

  // 3. Talent Pool Gap: skills required by open jobs vs count of candidates having them
  const talentPoolGapData = useMemo(() => {
    const candidateList = USE_MOCK ? candidates : liveCandidates
    const jobList = USE_MOCK ? jobs : liveJobs

    // Collect skills required by open jobs
    const skillMap = new Map<string, { jobsCount: number; jobs: string[] }>()
    jobList.forEach((j) => {
      const skillsList: string[] = (j.requirements?.requiredSkills || (j as any).required_skills || [])
      skillsList.forEach((skill: string) => {
        const canonical = skill.trim()
        const existing = skillMap.get(canonical) || { jobsCount: 0, jobs: [] }
        existing.jobsCount++
        if (!existing.jobs.includes(j.title)) existing.jobs.push(j.title)
        skillMap.set(canonical, existing)
      })
    })

    return Array.from(skillMap.entries())
      .map(([skill, meta]) => {
        const candidateCount = candidateList.filter((c) =>
          c.skills.some((s) => s.toLowerCase() === skill.toLowerCase())
        ).length
        const total = candidateList.length
        const coveragePct = total > 0 ? Math.round((candidateCount / total) * 100) : 0
        const gapCount = Math.max(0, total - candidateCount)

        return {
          skill,
          jobsRequiringCount: meta.jobsCount,
          jobsList: meta.jobs.join(', '),
          candidateCount,
          totalCandidates: total,
          coveragePct,
          gapCount,
        }
      })
      .sort((a, b) => a.coveragePct - b.coveragePct)
  }, [liveCandidates, liveJobs, candidates, jobs])

  // CSV Export for Talent Pool Gap Table
  const handleExportGapCsv = () => {
    const rows = [
      ['Skill', 'Jobs Requiring Count', 'Jobs Requiring List', 'Matching Candidates', 'Total Talent Pool', 'Pool Coverage %', 'Talent Deficit Count'],
      ...talentPoolGapData.map((row) => [
        `"${row.skill.replace(/"/g, '""')}"`,
        row.jobsRequiringCount,
        `"${row.jobsList.replace(/"/g, '""')}"`,
        row.candidateCount,
        row.totalCandidates,
        `${row.coveragePct}%`,
        row.gapCount,
      ]),
    ]
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'talent_pool_skill_gap.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Downloaded Talent Pool Gap CSV report!')
  }

  // Print view
  const handlePrint = () => {
    window.print()
  }

  // 4. Dynamic Data Callouts
  const totalAppsCount = activeApps.length
  const shortlistedCount = activeApps.filter((a) => a.stage === 'shortlisted').length
  const interviewCount = activeApps.filter((a) => a.stage === 'interview').length
  const offerCount = activeApps.filter((a) => a.stage === 'offer').length

  return (
    <div className="space-y-6" data-testid="insights-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border shadow-soft print:hidden">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Talent Pool Insights &amp; Analytics
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
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between print:hidden">
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
              <h3 className="text-sm font-bold text-text">Skill-Gap Coverage &amp; Applicants</h3>
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

      {/* ========================================================= */}
      {/* TALENT POOL GAP: Skills Required by Open Jobs vs Candidates */}
      {/* ========================================================= */}
      <div className="bg-white rounded-xl border border-border shadow-soft p-5 space-y-4" data-testid="talent-pool-gap-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-text">Talent Pool Gap Analysis</h3>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Skills required across all active job requisitions vs candidate supply in the talent pool.
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExportGapCsv}
              data-testid="export-gap-csv-btn"
            >
              Export Gap CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrint}
              data-testid="print-gap-view-btn"
            >
              Print / PDF View
            </Button>
          </div>
        </div>

        {talentPoolGapData.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted">
            No active jobs with specified required skills to evaluate talent pool gap.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs" data-testid="talent-pool-gap-table">
              <thead>
                <tr className="border-b border-border bg-slate-50/70 text-muted font-semibold">
                  <th className="p-3">Required Competency</th>
                  <th className="p-3 text-center">Jobs Requiring</th>
                  <th className="p-3 text-center">Candidates with Skill</th>
                  <th className="p-3 text-center">Total Pool</th>
                  <th className="p-3">Pool Coverage</th>
                  <th className="p-3 text-center">Talent Deficit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {talentPoolGapData.map((row) => {
                  const isLow = row.coveragePct < 40
                  const isModerate = row.coveragePct >= 40 && row.coveragePct < 70
                  return (
                    <tr key={row.skill} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-text">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isLow ? 'bg-rose-500' : isModerate ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span>{row.skill}</span>
                        </div>
                        <span className="text-[10px] text-muted font-normal block mt-0.5 truncate max-w-xs">
                          {row.jobsList}
                        </span>
                      </td>

                      <td className="p-3 text-center font-semibold text-text">
                        {row.jobsRequiringCount}
                      </td>

                      <td className="p-3 text-center font-bold text-indigo-700">
                        {row.candidateCount}
                      </td>

                      <td className="p-3 text-center text-muted">
                        {row.totalCandidates}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isLow ? 'bg-rose-500' : isModerate ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${row.coveragePct}%` }}
                            />
                          </div>
                          <span className="font-bold text-text text-[11px]">{row.coveragePct}%</span>
                        </div>
                      </td>

                      <td className="p-3 text-center font-bold text-rose-700">
                        {row.gapCount > 0 ? `-${row.gapCount}` : 'None (100%)'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
