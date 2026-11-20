import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import {
  Search,
  Briefcase,
  User,
  ArrowRight,
  UploadCloud,
  Users,
  Kanban,
  Scale,
  BarChart3,
  Mail,
  Copy,
  Settings,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate()
  const { currentCompanyId, candidates, jobs } = useAppStore()
  const [query, setQuery] = useState('')

  // Close on Escape or select
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  const companyJobs = jobs.filter((j) => j.companyId === currentCompanyId)
  const companyCandidates = candidates.filter((c) => c.companyId === currentCompanyId)

  const quickPages = [
    { label: 'Candidate Directory', path: '/app/candidates', icon: Users, keywords: 'candidates directory talent table' },
    { label: '5-Stage Pipeline Kanban', path: '/app/pipeline', icon: Kanban, keywords: 'pipeline kanban stages moves' },
    { label: 'Upload & Parse Resumes', path: '/app/upload', icon: UploadCloud, keywords: 'upload resumes parse bulk' },
    { label: 'Active Job Openings', path: '/app/jobs', icon: Briefcase, keywords: 'jobs openings positions jd' },
    { label: 'Side-by-Side Candidate Compare', path: '/app/compare', icon: Scale, keywords: 'compare comparison side by side' },
    { label: 'Skill Gap & Pipeline Insights', path: '/app/insights', icon: BarChart3, keywords: 'insights analytics charts metrics' },
    { label: 'Bulk Email Outreach', path: '/app/emails', icon: Mail, keywords: 'emails mail bulk template shortlisted' },
    { label: 'Duplicate Detection & Merging', path: '/app/duplicates', icon: Copy, keywords: 'duplicates merge fuzzy' },
    { label: 'Hiring Settings & Scoring Weights', path: '/app/settings', icon: Settings, keywords: 'settings weights scoring blind' },
  ]

  const matchedPages = query.trim()
    ? quickPages.filter(
        (p) =>
          p.label.toLowerCase().includes(query.toLowerCase()) ||
          p.keywords.includes(query.toLowerCase())
      )
    : quickPages.slice(0, 4)

  const filteredJobs = query.trim()
    ? companyJobs.filter(
        (j) =>
          j.title.toLowerCase().includes(query.toLowerCase()) ||
          j.department.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 4)
    : companyJobs.slice(0, 3)

  const filteredCandidates = query.trim()
    ? companyCandidates.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.college.toLowerCase().includes(query.toLowerCase()) ||
          c.skills.some((s) => s.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 5)
    : companyCandidates.slice(0, 4)

  const handleSelect = (path: string) => {
    onOpenChange(false)
    setQuery('')
    navigate(path)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} maxWidth="lg" className="p-0 overflow-hidden">
      <div className="flex items-center px-4 border-b border-border bg-white">
        <Search className="w-5 h-5 text-muted mr-3 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search candidates, skills, colleges, or jobs... (Esc to close)"
          className="w-full h-12 text-sm text-text placeholder:text-muted focus:outline-none bg-transparent"
          autoFocus
        />
      </div>

      <div className="max-h-96 overflow-y-auto p-3 space-y-4">
        {/* Quick Navigation Section */}
        {matchedPages.length > 0 && (
          <div>
            <div className="px-2 py-1 text-xs font-semibold text-muted uppercase tracking-wider">
              Navigation ({matchedPages.length})
            </div>
            <div className="mt-1 space-y-1">
              {matchedPages.map((page) => {
                const PageIcon = page.icon
                return (
                  <button
                    key={page.path}
                    onClick={() => handleSelect(page.path)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-sm text-text hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <PageIcon className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium">{page.label}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Jobs section */}
        <div>
          <div className="px-2 py-1 text-xs font-semibold text-muted uppercase tracking-wider">
            Jobs ({filteredJobs.length})
          </div>
          <div className="mt-1 space-y-1">
            {filteredJobs.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted">No jobs matching "{query}"</p>
            ) : (
              filteredJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => handleSelect(`/app/jobs/${job.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-sm text-text hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <div className="font-medium">{job.title}</div>
                      <div className="text-xs text-muted">{job.department} • {job.location}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Candidates section */}
        <div>
          <div className="px-2 py-1 text-xs font-semibold text-muted uppercase tracking-wider">
            Candidates ({filteredCandidates.length})
          </div>
          <div className="mt-1 space-y-1">
            {filteredCandidates.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted">No candidates matching "{query}"</p>
            ) : (
              filteredCandidates.map((cand) => (
                <button
                  key={cand.id}
                  onClick={() => handleSelect(`/app/candidates/${cand.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-sm text-text hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-accent shrink-0" />
                    <div>
                      <div className="font-medium">{cand.name}</div>
                      <div className="text-xs text-muted">
                        {cand.college} • {cand.skills.slice(0, 3).join(', ')}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-border bg-gray-50 flex items-center justify-between text-xs text-muted">
        <span>Use navigation keys to browse</span>
        <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-border rounded text-[10px] font-mono">ESC</kbd> to exit</span>
      </div>
    </Modal>
  )
}
