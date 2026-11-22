import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppStore } from '@/store'
import { api, JobRankingCandidate, SkillGapItem } from '@/api/client'
import { Candidate, Job, Application } from '@/types'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SkillChip } from '@/components/ui/SkillChip'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Drawer } from '@/components/ui/Drawer'
import { getSkillLearnHint } from '@/lib/skillHints'
import { toast } from 'sonner'
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
  Search,
  Scale,
  BarChart3,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  FileText,
  XCircle,
  GraduationCap,
  Layers,
  HelpCircle,
  X,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const isBlindMode = useAppStore((s) => s.isBlindMode)

  // Remote data state (strictly loaded from API)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [applications, setApplications] = useState<Application[]>([])
  const [totalCandidates, setTotalCandidates] = useState<number>(0)
  const [sampleCandidates, setSampleCandidates] = useState<Candidate[]>([])

  // Ranking & Skill Gap for selected job
  const [rankingLoading, setRankingLoading] = useState(false)
  const [rankingList, setRankingList] = useState<JobRankingCandidate[]>([])
  const [skillGap, setSkillGap] = useState<SkillGapItem[]>([])

  // Selection for side-by-side comparison (2 to 3 candidates)
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([])

  // Global search state
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Candidate[]>([])
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Candidate Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerCandidate, setDrawerCandidate] = useState<Candidate | null>(null)
  const [drawerJobId, setDrawerJobId] = useState<string>('')

  // 1. Initial Dashboard Load (Jobs, Applications, Candidate counts)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    Promise.all([
      api.getJobs(),
      api.getApplications(),
      api.getCandidates({ page_size: 1 }),
      api.getCandidates({ page_size: 100 }),
    ])
      .then(([jobsData, appsData, countData, candsData]) => {
        if (!active) return
        setJobs(jobsData)
        setApplications(appsData)
        setTotalCandidates(countData.total)
        setSampleCandidates(candsData.items)

        if (jobsData.length > 0) {
          const initialJob = jobsData[0].id
          setSelectedJobId((prev) => prev || initialJob)
          setDrawerJobId((prev) => prev || initialJob)
        }
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err?.message || 'Failed to connect to recruitment API. Check network or server status.')
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [retryCount])

  // 2. Fetch Ranking & Skill Gap whenever selectedJobId changes
  useEffect(() => {
    if (!selectedJobId) return
    let active = true
    setRankingLoading(true)

    Promise.all([
      api.getJobRanking(selectedJobId).catch(() => ({ candidates: [] })),
      api.getJobSkillGap(selectedJobId).catch(() => ({ skills: [], total_applicants: 0 })),
    ])
      .then(([rankingData, skillGapData]) => {
        if (!active) return
        setRankingList(rankingData.candidates || [])
        setSkillGap(skillGapData.skills || [])
        setRankingLoading(false)
      })
      .catch(() => {
        if (!active) return
        setRankingLoading(false)
      })

    return () => {
      active = false
    }
  }, [selectedJobId])

  // 3. Debounced Global Search (300 ms)
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const timer = setTimeout(() => {
      api.getCandidates({ q: trimmed, page_size: 6 })
        .then((res) => {
          setSearchResults(res.items)
          setSearchDropdownOpen(true)
          setIsSearching(false)
        })
        .catch(() => {
          setSearchResults([])
          setIsSearching(false)
        })
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle Search Input KeyPress (Enter navigates to candidates list)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setSearchDropdownOpen(false)
      navigate(`/app/candidates?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  // Open drawer for a candidate
  const openDrawer = (candidate: Candidate, targetJobId?: string) => {
    setDrawerCandidate(candidate)
    if (targetJobId) {
      setDrawerJobId(targetJobId)
    } else if (selectedJobId) {
      setDrawerJobId(selectedJobId)
    }
    setDrawerOpen(true)
    setSearchDropdownOpen(false)
  }

  // Row selection handler with strict 3 candidate limit
  const toggleSelectCandidate = (candidateId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedCandidateIds.includes(candidateId)) {
      setSelectedCandidateIds(selectedCandidateIds.filter((id) => id !== candidateId))
    } else {
      if (selectedCandidateIds.length >= 3) {
        toast.error('Comparison is limited to a maximum of 3 candidates.')
        return
      }
      setSelectedCandidateIds([...selectedCandidateIds, candidateId])
    }
  }

  // Navigate to Compare page with selected candidates and job
  const handleCompareClick = () => {
    if (selectedCandidateIds.length < 2) {
      toast.error('Select at least 2 candidates to compare.')
      return
    }
    if (selectedCandidateIds.length > 3) {
      toast.error('Comparison is limited to a maximum of 3 candidates.')
      return
    }
    const params = new URLSearchParams()
    params.set('ids', selectedCandidateIds.join(','))
    if (selectedJobId) {
      params.set('job_id', selectedJobId)
    }
    navigate(`/app/compare?${params.toString()}`)
  }

  // Derived metrics from loaded applications and candidates
  const activeJobsCount = jobs.filter((j) => (j.status as string)?.toLowerCase() === 'active').length

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {
      applied: 0,
      shortlisted: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    }
    applications.forEach((app) => {
      const st = (app.stage || 'applied').toLowerCase()
      if (counts[st] !== undefined) {
        counts[st]++
      } else {
        counts.applied++
      }
    })
    return counts
  }, [applications])

  // Attention Items calculation
  const duplicatesCount = useMemo(() => {
    return sampleCandidates.filter((c) => Boolean(c.isDuplicate)).length
  }, [sampleCandidates])

  const lowConfidenceCount = useMemo(() => {
    return sampleCandidates.filter((c) => c.parseConfidence < 70).length
  }, [sampleCandidates])

  const unknownCgpaCount = useMemo(() => {
    return sampleCandidates.filter((c) => c.cgpa == null).length
  }, [sampleCandidates])

  // Missing skills from skill gap (top 5 missing or lowest coverage)
  const missingSkillsSummary = useMemo(() => {
    return skillGap
      .filter((s) => s.coverage_pct < 60)
      .slice(0, 5)
  }, [skillGap])

  // Funnel data for Recharts
  const funnelChartData = useMemo(() => {
    return [
      { name: 'Applied', count: stageCounts.applied, color: '#6366f1' },
      { name: 'Shortlisted', count: stageCounts.shortlisted, color: '#3b82f6' },
      { name: 'Interview', count: stageCounts.interview, color: '#8b5cf6' },
      { name: 'Offer', count: stageCounts.offer, color: '#10b981' },
      { name: 'Rejected', count: stageCounts.rejected, color: '#ef4444' },
    ]
  }, [stageCounts])

  // Active Job Object
  const currentJob = jobs.find((j) => j.id === selectedJobId) || jobs[0]

  // Drawer candidate match data
  const drawerRankingItem = useMemo(() => {
    if (!drawerCandidate) return null
    return rankingList.find((r) => r.candidate_id === drawerCandidate.id)
  }, [drawerCandidate, rankingList])

  // -------------------------------------------------------------
  // RENDER: Loading Skeleton
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="space-y-6" data-testid="dashboard-loading">
        <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-5 rounded-xl border border-border">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-44 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // RENDER: Error Panel with Retry
  // -------------------------------------------------------------
  if (error) {
    return (
      <div className="space-y-6" data-testid="dashboard-error">
        <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-red-900 shadow-soft">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h2 className="text-lg font-bold">Failed to load Recruiter Dashboard</h2>
              <p className="text-sm text-red-700 leading-relaxed">{error}</p>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                  onClick={() => setRetryCount((k) => k + 1)}
                  data-testid="retry-button"
                >
                  Retry Connection
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="recruiter-dashboard">
      {/* ========================================================= */}
      {/* TOP BAR: GLOBAL SEARCH & PRIMARY ACTIONS */}
      {/* ========================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-border shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text tracking-tight">Recruiter Dashboard</h1>
            <Badge variant="secondary" size="sm" className="hidden sm:inline-flex">
              Live Overview
            </Badge>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Real-time pipeline analytics, candidate competency rankings, and side-by-side comparison.
          </p>
        </div>

        {/* Global Search Box (Debounced 300ms) */}
        <div className="flex-1 max-w-md relative" ref={searchContainerRef}>
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              role="searchbox"
              aria-label="Global candidate search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => searchQuery.trim() && setSearchDropdownOpen(true)}
              placeholder="Search candidate by name, college, skills... (Press Enter)"
              className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text"
              data-testid="global-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchQuery('')
                  setSearchResults([])
                  setSearchDropdownOpen(false)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {searchDropdownOpen && (
            <div
              className="absolute left-0 right-0 mt-1.5 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              data-testid="search-results-dropdown"
            >
              <div className="px-3.5 py-2 bg-slate-50 border-b border-border flex items-center justify-between text-[11px] font-semibold text-muted">
                <span>
                  {isSearching ? 'Searching...' : `Found ${searchResults.length} matching candidates`}
                </span>
                <span className="text-xs">Esc to close</span>
              </div>

              {searchResults.length === 0 && !isSearching ? (
                <div className="p-4 text-center text-xs text-muted">
                  No candidates matching &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-border">
                  {searchResults.map((cand) => (
                    <div
                      key={cand.id}
                      onClick={() => openDrawer(cand)}
                      className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                      data-testid={`search-result-${cand.id}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={cand.name} size="sm" isBlind={isBlindMode} />
                        <div className="truncate">
                          <div className="text-xs font-semibold text-text truncate">
                            {isBlindMode ? `Candidate #${cand.id}` : cand.name}
                          </div>
                          <div className="text-[11px] text-muted truncate">
                            {isBlindMode ? '[Hidden College]' : cand.college || 'College N/A'} •{' '}
                            {cand.cgpa != null ? `CGPA ${cand.cgpa}` : 'CGPA: -'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {cand.skills.slice(0, 2).map((s) => (
                          <span
                            key={s}
                            className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium"
                          >
                            {s}
                          </span>
                        ))}
                        {cand.skills.length > 2 && (
                          <span className="text-[10px] text-muted">+{cand.skills.length - 2}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div
                onClick={() => {
                  setSearchDropdownOpen(false)
                  navigate(`/app/candidates?q=${encodeURIComponent(searchQuery.trim())}`)
                }}
                className="p-2.5 bg-slate-50 hover:bg-indigo-50 border-t border-border text-center text-xs font-medium text-primary cursor-pointer transition-colors"
              >
                View all results in Candidate Directory &rarr;
              </div>
            </div>
          )}
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/jobs/new')}
            leftIcon={<Briefcase className="w-3.5 h-3.5" />}
          >
            Create Job
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/upload')}
            leftIcon={<FileText className="w-3.5 h-3.5" />}
          >
            Upload Resumes
          </Button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* KPI METRIC CARDS (ALL LINKED TO RELEVANT PAGES) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Candidates */}
        <div
          onClick={() => navigate('/app/candidates')}
          className="bg-card rounded-xl border border-border p-3.5 shadow-card hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between"
          data-testid="kpi-total-candidates"
        >
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-semibold">Total Pool</span>
            <Users className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-extrabold text-text mt-2 group-hover:text-primary transition-colors">
            {totalCandidates}
          </div>
          <span className="text-[10px] text-muted mt-1">Candidates &rarr;</span>
        </div>

        {/* Active Jobs */}
        <div
          onClick={() => navigate('/app/jobs')}
          className="bg-card rounded-xl border border-border p-3.5 shadow-card hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between"
          data-testid="kpi-open-jobs"
        >
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-semibold">Open Jobs</span>
            <Briefcase className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-extrabold text-text mt-2 group-hover:text-blue-600 transition-colors">
            {activeJobsCount}
          </div>
          <span className="text-[10px] text-muted mt-1">Open roles &rarr;</span>
        </div>

        {/* Applied */}
        <div
          onClick={() => navigate('/app/pipeline?stage=applied')}
          className="bg-card rounded-xl border border-border p-3.5 shadow-card hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between"
          data-testid="kpi-applied"
        >
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-semibold">Applied</span>
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-extrabold text-text mt-2">
            {stageCounts.applied}
          </div>
          <span className="text-[10px] text-muted mt-1">Stage 1 &rarr;</span>
        </div>

        {/* Shortlisted */}
        <div
          onClick={() => navigate('/app/pipeline?stage=shortlisted')}
          className="bg-card rounded-xl border border-border p-3.5 shadow-card hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between"
          data-testid="kpi-shortlisted"
        >
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-semibold">Shortlisted</span>
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-extrabold text-text mt-2">
            {stageCounts.shortlisted}
          </div>
          <span className="text-[10px] text-muted mt-1">Stage 2 &rarr;</span>
        </div>

        {/* Interview */}
        <div
          onClick={() => navigate('/app/pipeline?stage=interview')}
          className="bg-card rounded-xl border border-border p-3.5 shadow-card hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between"
          data-testid="kpi-interview"
        >
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-semibold">Interview</span>
            <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-extrabold text-text mt-2">
            {stageCounts.interview}
          </div>
          <span className="text-[10px] text-muted mt-1">Stage 3 &rarr;</span>
        </div>

        {/* Offer */}
        <div
          onClick={() => navigate('/app/pipeline?stage=offer')}
          className="bg-card rounded-xl border border-border p-3.5 shadow-card hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between"
          data-testid="kpi-offer"
        >
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-semibold">Offer</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-extrabold text-text mt-2 text-emerald-700">
            {stageCounts.offer}
          </div>
          <span className="text-[10px] text-muted mt-1">Offers &rarr;</span>
        </div>

        {/* Duplicates Flagged */}
        <div
          onClick={() => navigate('/app/duplicates')}
          className="bg-card rounded-xl border border-border p-3.5 shadow-card hover:border-amber-300 transition-all cursor-pointer group flex flex-col justify-between"
          data-testid="kpi-duplicates"
        >
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-semibold">Duplicates</span>
            <Copy className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-extrabold text-amber-700 mt-2">
            {duplicatesCount}
          </div>
          <span className="text-[10px] text-muted mt-1">Review &rarr;</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN TWO-COLUMN WORKSPACE: RANKING TABLE & ANALYTICS */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: TOP RANKED CANDIDATES FOR JOB */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-border shadow-soft p-5">
            {/* Job Selector & Compare Button Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-text shrink-0">Rankings for Job:</span>
                {jobs.length === 0 ? (
                  <span className="text-xs text-muted">No jobs available</span>
                ) : (
                  <select
                    aria-label="Select Job to View Rankings"
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="text-xs font-medium bg-slate-50 border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text max-w-xs"
                    data-testid="dashboard-job-selector"
                  >
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} ({j.department})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Compare Selected Button (2 to 3 candidates) */}
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={selectedCandidateIds.length < 2 || selectedCandidateIds.length > 3}
                  onClick={handleCompareClick}
                  leftIcon={<Scale className="w-3.5 h-3.5" />}
                  data-testid="dashboard-compare-btn"
                >
                  Compare selected ({selectedCandidateIds.length})
                </Button>
                {selectedCandidateIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCandidateIds([])}
                    className="text-xs text-muted"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Empty or Loaded Table */}
            {jobs.length === 0 ? (
              <EmptyState
                icon={<Briefcase className="w-8 h-8 text-primary" />}
                title="No Active Job Postings"
                description="Create a job to automatically evaluate competency matches and rank candidates."
                action={
                  <Button variant="primary" size="sm" onClick={() => navigate('/app/jobs/new')}>
                    Create Job
                  </Button>
                }
              />
            ) : totalCandidates === 0 ? (
              <EmptyState
                icon={<FileText className="w-8 h-8 text-primary" />}
                title="No Candidates Found"
                description="Upload candidate resumes into the talent pool to view ranked competency matches."
                action={
                  <Button variant="primary" size="sm" onClick={() => navigate('/app/upload')}>
                    Upload Resumes
                  </Button>
                }
              />
            ) : rankingLoading ? (
              <div className="p-8 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : rankingList.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">
                No evaluated candidates for this job yet.
              </div>
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-left border-collapse" data-testid="dashboard-ranking-table">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-semibold text-muted bg-slate-50/50">
                      <th className="py-2.5 px-3 w-10 text-center">
                        <span className="sr-only">Select</span>
                      </th>
                      <th className="py-2.5 px-3 w-12 text-center">Rank</th>
                      <th className="py-2.5 px-3">Candidate</th>
                      <th className="py-2.5 px-3 text-center">Match Score</th>
                      <th className="py-2.5 px-3">Skills Match</th>
                      <th className="py-2.5 px-3 text-center">Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {rankingList.slice(0, 10).map((item, idx) => {
                      const isSelected = selectedCandidateIds.includes(item.candidate_id)
                      const candObj =
                        item.candidate ||
                        sampleCandidates.find((c) => c.id === item.candidate_id) || {
                          id: item.candidate_id,
                          name: item.name || `Candidate ${item.candidate_id}`,
                          college: item.college || 'University',
                          degree: 'B.Tech',
                          branch: 'Computer Science',
                          skills: [...(item.matched_skills || []), ...(item.missing_skills || [])],
                          cgpa: null,
                          experienceYears: null,
                          parseConfidence: 95,
                        }

                      return (
                        <tr
                          key={item.candidate_id}
                          onClick={() => openDrawer(candObj as Candidate, selectedJobId)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors group"
                          data-testid={`ranking-row-${item.candidate_id}`}
                        >
                          {/* Checkbox */}
                          <td
                            className="py-3 px-3 text-center"
                            onClick={(e) => toggleSelectCandidate(item.candidate_id, e)}
                          >
                            <input
                              type="checkbox"
                              aria-label={`Select ${candObj.name} for comparison`}
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                              data-testid={`checkbox-${item.candidate_id}`}
                            />
                          </td>

                          {/* Rank */}
                          <td className="py-3 px-3 text-center font-bold text-muted text-xs">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
                                idx === 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : idx === 1
                                  ? 'bg-slate-200 text-slate-800'
                                  : idx === 2
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'text-muted'
                              }`}
                            >
                              #{idx + 1}
                            </span>
                          </td>

                          {/* Candidate Profile */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={candObj.name} size="sm" isBlind={isBlindMode} />
                              <div>
                                <div className="font-semibold text-text group-hover:text-primary transition-colors">
                                  {isBlindMode ? `Candidate #${item.candidate_id}` : candObj.name}
                                </div>
                                <div className="text-[11px] text-muted truncate max-w-[180px]">
                                  {isBlindMode ? '[Hidden College]' : candObj.college || 'College N/A'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Match Score */}
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-2">
                              <ScoreRing score={item.match_score} size="sm" />
                              <span className="font-bold text-xs text-text">
                                {item.match_score != null ? `${item.match_score}%` : '-'}
                              </span>
                            </div>
                          </td>

                          {/* Matched & Missing Skill Chips */}
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap items-center gap-1 max-w-xs">
                              {(item.matched_skills || []).slice(0, 2).map((s) => (
                                <SkillChip key={s} name={s} status="matched" size="sm" />
                              ))}
                              {(item.missing_skills || []).slice(0, 1).map((s) => (
                                <SkillChip key={s} name={s} status="missing" size="sm" />
                              ))}
                              {(item.matched_skills?.length || 0) + (item.missing_skills?.length || 0) > 3 && (
                                <span className="text-[10px] text-muted font-medium">
                                  +{((item.matched_skills?.length || 0) + (item.missing_skills?.length || 0)) - 3}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Stage */}
                          <td className="py-3 px-3 text-center">
                            <StatusBadge stage={item.stage || 'applied'} />
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

        {/* RIGHT COLUMN: FUNNEL, SKILL GAP SUMMARY & NEEDS ATTENTION */}
        <div className="space-y-4">
          {/* Pipeline Funnel Mini-Chart */}
          <div className="bg-white rounded-xl border border-border shadow-soft p-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                  Pipeline Stage Velocity
                </h3>
              </div>
              <Link to="/app/pipeline" className="text-[11px] font-semibold text-primary hover:underline">
                View Kanban &rarr;
              </Link>
            </div>

            <div className="h-44 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {funnelChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Skill Gap Summary for Selected Job */}
          <div className="bg-white rounded-xl border border-border shadow-soft p-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                  Skill Gap Summary
                </h3>
              </div>
              <Link to="/app/insights" className="text-[11px] font-semibold text-primary hover:underline">
                Full Insights &rarr;
              </Link>
            </div>

            <p className="text-[11px] text-muted mt-2">
              Top missing competencies across candidate pool for <strong>{currentJob?.title || 'Selected Job'}</strong>:
            </p>

            {missingSkillsSummary.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted">
                Pool exhibits strong coverage across required skills.
              </div>
            ) : (
              <div className="space-y-2 mt-3">
                {missingSkillsSummary.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span className="font-semibold text-text">{item.name}</span>
                      {item.required && (
                        <span className="text-[10px] text-rose-700 bg-rose-50 px-1 rounded font-medium">
                          Required
                        </span>
                      )}
                    </div>
                    <span className="text-muted text-[11px]">
                      {item.coverage_pct}% coverage ({item.applicants_count} candidates)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* "Needs Attention" Card */}
          <div className="bg-white rounded-xl border border-border shadow-soft p-5" data-testid="needs-attention-card">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                Needs Attention
              </h3>
            </div>

            <div className="space-y-3 mt-3">
              {/* Duplicates */}
              <div
                onClick={() => navigate('/app/duplicates')}
                className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/60 hover:bg-amber-100/60 border border-amber-200/70 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Copy className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="text-xs font-medium text-amber-900">
                    Flagged duplicate profiles
                  </span>
                </div>
                <Badge variant="warning" size="sm">
                  {duplicatesCount}
                </Badge>
              </div>

              {/* Low Parse Confidence */}
              <div
                onClick={() => navigate('/app/candidates?include_unknown=true')}
                className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/60 hover:bg-rose-100/60 border border-rose-200/70 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-rose-700 shrink-0" />
                  <span className="text-xs font-medium text-rose-900">
                    Low parse confidence (&lt;70%)
                  </span>
                </div>
                <Badge variant="danger" size="sm">
                  {lowConfidenceCount}
                </Badge>
              </div>

              {/* Unknown CGPA */}
              <div
                onClick={() => navigate('/app/candidates?include_unknown=true')}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-border cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-slate-700 shrink-0" />
                  <span className="text-xs font-medium text-slate-800">
                    Unknown / Unstated CGPA
                  </span>
                </div>
                <Badge variant="secondary" size="sm">
                  {unknownCgpaCount}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CANDIDATE SLIDE-OVER DRAWER WITH AI EXPLAINABILITY */}
      {/* ========================================================= */}
      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={
          <div className="flex items-center gap-2">
            <span>Candidate Profile</span>
            {drawerCandidate && drawerCandidate.parseConfidence < 70 && (
              <Badge variant="warning" size="sm">
                Low Confidence ({drawerCandidate.parseConfidence}%)
              </Badge>
            )}
          </div>
        }
        description="Detailed competency qualifications, AI score breakdown, and skill gap."
        width="xl"
      >
        {drawerCandidate && (
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)]" data-testid="dashboard-candidate-drawer">
            {/* Header: Avatar, Name, College, Contact */}
            <div className="flex items-start gap-4 pb-5 border-b border-border">
              <Avatar name={drawerCandidate.name} size="xl" isBlind={isBlindMode} />
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-text">
                  {isBlindMode ? `Candidate #${drawerCandidate.id}` : drawerCandidate.name}
                </h2>
                <p className="text-xs text-muted">
                  {isBlindMode ? '[Hidden College]' : drawerCandidate.college} • {drawerCandidate.degree} (
                  {drawerCandidate.branch})
                </p>
                <div className="text-[11px] text-muted flex flex-wrap gap-x-3 gap-y-1 pt-1">
                  <span>📍 {isBlindMode ? '[Hidden Location]' : drawerCandidate.location || 'N/A'}</span>
                  <span>✉️ {isBlindMode ? '[Hidden Email]' : drawerCandidate.email || 'N/A'}</span>
                  <span>📞 {isBlindMode ? '[Hidden Phone]' : drawerCandidate.phone || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Academic & Experience Overview */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-border p-3 rounded-lg text-center">
                <span className="text-[11px] text-muted block">CGPA</span>
                <span className="text-sm font-bold text-text">
                  {drawerCandidate.cgpa != null ? `${drawerCandidate.cgpa} / 10` : '-'}
                </span>
              </div>
              <div className="bg-slate-50 border border-border p-3 rounded-lg text-center">
                <span className="text-[11px] text-muted block">Experience</span>
                <span className="text-sm font-bold text-text">
                  {drawerCandidate.experienceYears != null ? `${drawerCandidate.experienceYears}y` : '-'}
                </span>
              </div>
              <div className="bg-slate-50 border border-border p-3 rounded-lg text-center">
                <span className="text-[11px] text-muted block">10th / 12th Board</span>
                <span className="text-sm font-bold text-text">
                  {drawerCandidate.tenthPercent != null ? `${drawerCandidate.tenthPercent}%` : '-'} /{' '}
                  {drawerCandidate.twelfthPercent != null ? `${drawerCandidate.twelfthPercent}%` : '-'}
                </span>
              </div>
            </div>

            {/* AI MATCH FOR TARGET JOB PANEL */}
            <div className="bg-slate-50 rounded-xl border border-border p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-bold text-text uppercase tracking-wide">
                    Match Analysis for {currentJob?.title || 'Selected Role'}
                  </h4>
                </div>
                <ScoreRing score={drawerRankingItem?.match_score} size="md" />
              </div>

              {/* Four Breakdown Bars */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-semibold text-text block">
                  Weighted Score Breakdown
                </span>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <div className="flex justify-between text-muted text-[11px] mb-0.5">
                      <span>Skills Competency (40%)</span>
                      <span className="font-bold text-text">
                        {drawerRankingItem?.breakdown?.skills != null
                          ? `${drawerRankingItem.breakdown.skills}%`
                          : '-'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${drawerRankingItem?.breakdown?.skills ?? 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-muted text-[11px] mb-0.5">
                      <span>Experience Fit (25%)</span>
                      <span className="font-bold text-text">
                        {drawerRankingItem?.breakdown?.experience != null
                          ? `${drawerRankingItem.breakdown.experience}%`
                          : '-'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${drawerRankingItem?.breakdown?.experience ?? 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-muted text-[11px] mb-0.5">
                      <span>Education Background (20%)</span>
                      <span className="font-bold text-text">
                        {drawerRankingItem?.breakdown?.education != null
                          ? `${drawerRankingItem.breakdown.education}%`
                          : '-'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 rounded-full"
                        style={{ width: `${drawerRankingItem?.breakdown?.education ?? 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-muted text-[11px] mb-0.5">
                      <span>Semantic Relevance (15%)</span>
                      <span className="font-bold text-text">
                        {drawerRankingItem?.breakdown?.semantic != null
                          ? `${drawerRankingItem.breakdown.semantic}%`
                          : '-'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full"
                        style={{ width: `${drawerRankingItem?.breakdown?.semantic ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Matched vs Missing Skills */}
              <div className="space-y-2 pt-2">
                <div>
                  <span className="text-[11px] font-semibold text-emerald-800 block mb-1">
                    Matched Skills ({drawerRankingItem?.matched_skills?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {drawerRankingItem?.matched_skills?.length ? (
                      drawerRankingItem.matched_skills.map((s) => (
                        <SkillChip key={s} name={s} status="matched" size="sm" />
                      ))
                    ) : (
                      <span className="text-xs text-muted">No overlapping skills</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-rose-800 block mb-1">
                    Missing Skills ({drawerRankingItem?.missing_skills?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {drawerRankingItem?.missing_skills?.length ? (
                      drawerRankingItem.missing_skills.map((s) => (
                        <SkillChip key={s} name={s} status="missing" size="sm" />
                      ))
                    ) : (
                      <span className="text-xs text-emerald-700 font-medium">All role skills matched!</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Explanation Text */}
              {drawerRankingItem?.explanation && (
                <div className="p-3 bg-white border border-border rounded-lg text-xs text-slate-700 leading-relaxed">
                  <strong>Evaluation Note:</strong> {drawerRankingItem.explanation}
                </div>
              )}

              {/* Skill Gap and Learn Hints */}
              {drawerRankingItem?.missing_skills && drawerRankingItem.missing_skills.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <span className="text-[11px] font-bold text-text uppercase tracking-wider block">
                    Skill Gap &amp; Next Steps
                  </span>
                  <div className="space-y-1.5">
                    {drawerRankingItem.missing_skills.map((ms) => (
                      <div key={ms} className="p-2 bg-white rounded border border-border text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-text">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
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

            {/* Candidate Extracted Skills */}
            <div>
              <span className="text-xs font-semibold text-text block mb-1.5">
                All Extracted Profile Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {drawerCandidate.skills.map((s) => (
                  <SkillChip key={s} name={s} status="neutral" size="sm" />
                ))}
              </div>
            </div>

            {/* Action to view full profile */}
            <div className="pt-4 border-t border-border flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setDrawerOpen(false)
                  navigate(`/app/candidates/${drawerCandidate.id}`)
                }}
                rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                View Full Candidate Profile
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
