import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { api, USE_MOCK } from '@/api'
import { Job } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'
import {
  Briefcase,
  Plus,
  Search,
  MapPin,
  Clock,
  MoreVertical,
  Trash2,
  Play,
  Pause,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'

export const JobsPage: React.FC = () => {
  const navigate = useNavigate()
  const { currentCompanyId, currentUser, jobs, applications, updateJob, deleteJob } = useAppStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Paused' | 'Closed'>('All')
  const [jobToDelete, setJobToDelete] = useState<string | null>(null)

  // In live mode, fetch jobs strictly from API with error/retry handling
  const [liveJobs, setLiveJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(!USE_MOCK)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    if (USE_MOCK) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.getJobs()
      setLiveJobs(res)
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve jobs from backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const companyJobs = USE_MOCK
    ? jobs.filter((j) => j.companyId === currentCompanyId)
    : liveJobs

  const filteredJobs = companyJobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.department.toLowerCase().includes(search.toLowerCase()) ||
      job.location.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'All' || job.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Calculate counts per job
  const getJobMetrics = (jobId: string) => {
    const jobApps = applications.filter((a) => a.jobId === jobId)
    const applied = jobApps.filter((a) => a.stage === 'applied').length
    const shortlisted = jobApps.filter((a) => a.stage === 'shortlisted' || a.stage === 'oa').length
    const interview = jobApps.filter((a) => a.stage === 'interview').length
    const offer = jobApps.filter((a) => a.stage === 'offer').length
    const total = jobApps.length
    return { applied, shortlisted, interview, offer, total }
  }

  const handleToggleStatus = (jobId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Paused' : 'Active'
    updateJob(jobId, { status: nextStatus })
    toast.success(`Job marked as ${nextStatus}`)
  }

  const handleDelete = () => {
    if (!jobToDelete) return
    deleteJob(jobToDelete)
    setJobToDelete(null)
    toast.success('Job posting deleted')
  }

  const canEdit = currentUser?.role === 'Admin' || currentUser?.role === 'Recruiter'

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={Boolean(jobToDelete)}
        onOpenChange={(open) => !open && setJobToDelete(null)}
        title="Delete Job Opening"
        description="Are you sure you want to delete this job? All associated candidate applications and rankings for this job will be permanently removed."
        confirmText="Delete Job"
        onConfirm={handleDelete}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Job Openings</h1>
          <p className="text-sm text-muted mt-0.5">
            Manage your hiring positions, applicant quotas, and criteria.
          </p>
        </div>

        {canEdit && (
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/app/jobs/new')}
          >
            Create New Job
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-border shadow-soft">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs by title or department..."
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['All', 'Active', 'Paused', 'Closed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-indigo-50 text-primary font-semibold'
                  : 'text-muted hover:text-text hover:bg-gray-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Error State with Retry */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-800 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchJobs}>
            Retry
          </Button>
        </div>
      )}

      {/* Jobs Grid / List */}
      <div className="space-y-3">
        {filteredJobs.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="w-6 h-6" />}
            title="No job postings found"
            description={search ? 'Try adjusting your search criteria.' : 'Create your first job posting to start receiving applicants.'}
            action={
              canEdit ? (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => navigate('/app/jobs/new')}
                >
                  Create New Job
                </Button>
              ) : undefined
            }
          />
        ) : (
          filteredJobs.map((job) => {
            const metrics = getJobMetrics(job.id)

            return (
              <div
                key={job.id}
                onClick={() => navigate(`/app/jobs/${job.id}`)}
                className="bg-card hover:bg-gray-50/70 border border-border hover:border-indigo-200 rounded-xl p-5 shadow-card transition-all cursor-pointer group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Job Header & Meta */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-base font-bold text-text group-hover:text-primary transition-colors">
                        {job.title}
                      </h2>
                      <Badge
                        variant={job.status === 'Active' ? 'success' : job.status === 'Paused' ? 'warning' : 'secondary'}
                        size="sm"
                      >
                        {job.status}
                      </Badge>
                      <span className="text-xs text-muted bg-gray-100 px-2 py-0.5 rounded-md">
                        {job.department}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {job.type}
                      </span>
                      <span>
                        Min Exp: <strong className="text-text">{job.requirements.minExperience} yrs</strong>
                      </span>
                      {job.requirements.minCgpa > 0 && (
                        <span>
                          Min CGPA: <strong className="text-text">{job.requirements.minCgpa}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stage Metrics Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="px-3 py-1.5 rounded-lg bg-blue-50/60 border border-blue-100 text-center">
                      <div className="text-xs font-bold text-blue-700">{metrics.applied}</div>
                      <div className="text-[10px] text-blue-600">Applied</div>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-purple-50/60 border border-purple-100 text-center">
                      <div className="text-xs font-bold text-purple-700">{metrics.shortlisted}</div>
                      <div className="text-[10px] text-purple-600">Shortlisted</div>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-amber-50/60 border border-amber-100 text-center">
                      <div className="text-xs font-bold text-amber-700">{metrics.interview}</div>
                      <div className="text-[10px] text-amber-600">Interview</div>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-center">
                      <div className="text-xs font-bold text-emerald-700">{metrics.offer}</div>
                      <div className="text-[10px] text-emerald-600">Offered</div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <>
                          <button
                            title={job.status === 'Active' ? 'Pause Job' : 'Activate Job'}
                            onClick={() => handleToggleStatus(job.id, job.status)}
                            className="p-2 text-muted hover:text-text rounded-lg hover:bg-gray-100"
                          >
                            {job.status === 'Active' ? (
                              <Pause className="w-4 h-4 text-amber-600" />
                            ) : (
                              <Play className="w-4 h-4 text-emerald-600" />
                            )}
                          </button>
                          <button
                            title="Delete Job"
                            onClick={() => setJobToDelete(job.id)}
                            className="p-2 text-muted hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <ChevronRight className="w-5 h-5 text-muted group-hover:text-primary transition-colors ml-1" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
