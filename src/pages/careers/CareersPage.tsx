import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Briefcase, MapPin, Clock, Search, ArrowRight, ExternalLink } from 'lucide-react'

export const CareersPage: React.FC = () => {
  const { companySlug } = useParams<{ companySlug: string }>()
  const navigate = useNavigate()
  const { companies, jobs } = useAppStore()

  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All')

  const company = companies.find((c) => c.slug === companySlug) || companies[0]
  const companyJobs = jobs.filter((j) => j.companyId === company.id && j.status === 'Active')

  const departments = ['All', ...Array.from(new Set(companyJobs.map((j) => j.department)))]

  const filteredJobs = companyJobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.department.toLowerCase().includes(search.toLowerCase()) ||
      job.location.toLowerCase().includes(search.toLowerCase())

    const matchesDept = departmentFilter === 'All' || job.department === departmentFilter
    return matchesSearch && matchesDept
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Top Brand Banner */}
      <header className="bg-white border-b border-border py-4 px-6 sm:px-12">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xl shadow-sm">
              {company.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg font-bold text-text">{company.name}</h1>
              <p className="text-xs text-muted">{company.industry || 'Careers Portal'}</p>
            </div>
          </div>

          <Link
            to="/login"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Recruiter Login <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-background py-12 px-6 border-b border-border text-center">
        <div className="max-w-2xl mx-auto space-y-3">
          <Badge variant="default" size="sm">
            We are hiring!
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text tracking-tight">
            Build the future with {company.name}
          </h2>
          <p className="text-sm text-muted">
            Join our high-impact team. We review every application using objective competency-first scoring.
          </p>
        </div>
      </section>

      {/* Jobs Search & Listing */}
      <main className="max-w-5xl mx-auto py-10 px-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-border shadow-soft">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by role or location..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setDepartmentFilter(dept)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  departmentFilter === dept
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted hover:text-text hover:bg-gray-100'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-3">
          {filteredJobs.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-border">
              <Briefcase className="w-10 h-10 text-muted mx-auto mb-2" />
              <h3 className="text-base font-bold text-text">No active job openings found</h3>
              <p className="text-xs text-muted mt-1">Check back later or adjust your search filter.</p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => navigate(`/careers/${company.slug}/${job.id}`)}
                className="bg-card hover:bg-gray-50/70 rounded-xl border border-border hover:border-indigo-300 p-5 shadow-card transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-text group-hover:text-primary transition-colors">
                      {job.title}
                    </h3>
                    <Badge variant="outline" size="sm">{job.department}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.location}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {job.type}
                    </span>
                    <span>•</span>
                    <span>Min Exp: {job.requirements.minExperience} yrs</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Apply Now
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
