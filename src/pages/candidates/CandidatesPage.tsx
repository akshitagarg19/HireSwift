import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppStore } from '@/store'
import { isReadOnlyViewer } from '@/lib/permissions'
import { api, CandidateFilterParams } from '@/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { toast } from 'sonner'
import {
  Search,
  Filter,
  Download,
  Mail,
  Scale,
  Sparkles,
  ChevronDown,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  MoreVertical,
  CheckSquare,
  Square,
  Bookmark,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { Candidate, Application } from '@/types'

export interface SkillFilter {
  name: string
  mode: 'all' | 'any' | 'none' // all = AND, any = OR, none = NOT
}

export const CandidatesPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    currentCompanyId,
    currentUser,
    candidates,
    applications,
    companies,
    duplicateGroups,
    bulkUpdateApplicationStage,
  } = useAppStore()

  const company = companies.find((c) => c.id === currentCompanyId) || companies[0]
  const isReadOnly = isReadOnlyViewer(currentUser?.role)

  // Duplicate candidate ID set
  const duplicateCandidateIds = useMemo(() => {
    const set = new Set<string>()
    duplicateGroups
      .filter((g) => g.companyId === currentCompanyId && g.status === 'Pending')
      .forEach((g) => g.candidateIds.forEach((id) => set.add(id)))
    return set
  }, [duplicateGroups, currentCompanyId])

  // Parse Initial URL Query Parameters
  const initialQ = searchParams.get('q') || searchParams.get('search') || ''
  const initialCgpa = parseFloat(searchParams.get('cgpa_min') || '0') || 0
  const initialTenth = parseInt(searchParams.get('tenth_min') || '0', 10) || 0
  const initialTwelfth = parseInt(searchParams.get('twelfth_min') || '0', 10) || 0
  const initialExpMin = parseFloat(searchParams.get('exp_min') || '0') || 0
  const initialExpMax = parseFloat(searchParams.get('exp_max') || '10') || 10
  const initialCity = searchParams.get('city') || 'All'
  const initialBatch = searchParams.get('grad_year') ? parseInt(searchParams.get('grad_year')!, 10) : null
  const initialUnknown = searchParams.get('include_unknown') === 'true'
  const initialStage = searchParams.get('stage')

  // Parse initial skills
  const initialSkillsList: SkillFilter[] = useMemo(() => {
    const list: SkillFilter[] = []
    const all = searchParams.get('skills_all')?.split(',').filter(Boolean) || []
    const any = searchParams.get('skills_any')?.split(',').filter(Boolean) || []
    const none = searchParams.get('skills_none')?.split(',').filter(Boolean) || []

    all.forEach((s) => list.push({ name: s, mode: 'all' }))
    any.forEach((s) => list.push({ name: s, mode: 'any' }))
    none.forEach((s) => list.push({ name: s, mode: 'none' }))
    return list
  }, [searchParams])

  // Filter states
  const [textSearch, setTextSearch] = useState(initialQ)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ)
  const [minCgpa, setMinCgpa] = useState<number>(initialCgpa)
  const [minTenth, setMinTenth] = useState<number>(initialTenth)
  const [minTwelfth, setMinTwelfth] = useState<number>(initialTwelfth)
  const [skillFilters, setSkillFilters] = useState<SkillFilter[]>(initialSkillsList)
  const [minExp, setMinExp] = useState<number>(initialExpMin)
  const [maxExp, setMaxExp] = useState<number>(initialExpMax)
  const [selectedCity, setSelectedCity] = useState<string>(initialCity)
  const [selectedBatch, setSelectedBatch] = useState<number | null>(initialBatch)
  const [includeUnknown, setIncludeUnknown] = useState<boolean>(initialUnknown)
  const [selectedStages, setSelectedStages] = useState<string[]>(initialStage ? [initialStage] : [])

  // Sync stage from URL query parameter
  useEffect(() => {
    const stageParam = searchParams.get('stage')
    if (stageParam && !selectedStages.includes(stageParam)) {
      setSelectedStages([stageParam])
    }
  }, [searchParams])

  // UI state
  const [showFilterSidebar, setShowFilterSidebar] = useState(true)
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([])
  const [bulkStageModalOpen, setBulkStageModalOpen] = useState(false)
  const [targetStage, setTargetStage] = useState('shortlisted')
  const [sortBy, setSortBy] = useState<'score' | 'cgpa' | 'exp' | 'name'>('score')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const pageSize = 12

  // Debounce search query input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(textSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [textSearch])

  // Column visibility state (including custom fields)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    company.settings.customFields.forEach((cf) => {
      initial[cf.id] = true
    })
    return initial
  })
  const [showColumnChooser, setShowColumnChooser] = useState(false)

  // Company candidates & application lookup
  const companyCandidates = useMemo(
    () => candidates.filter((c) => c.companyId === currentCompanyId),
    [candidates, currentCompanyId]
  )

  const candidateAppMap = useMemo(() => {
    const map = new Map<string, Application>()
    applications.forEach((app) => {
      if (app.companyId === currentCompanyId) {
        if (!map.has(app.candidateId) || app.matchScore > (map.get(app.candidateId)?.matchScore || 0)) {
          map.set(app.candidateId, app)
        }
      }
    })
    return map
  }, [applications, currentCompanyId])

  // Distinct values for sidebar pickers
  const availableSkills = useMemo(() => {
    const set = new Set<string>()
    companyCandidates.forEach((c) => c.skills.forEach((s) => set.add(s)))
    return Array.from(set).sort()
  }, [companyCandidates])

  const availableCities = useMemo(() => {
    const set = new Set<string>()
    companyCandidates.forEach((c) => set.add(c.location))
    return ['All', ...Array.from(set).sort()]
  }, [companyCandidates])

  const availableBatches = useMemo(() => {
    const set = new Set<number>()
    companyCandidates.forEach((c) => set.add(c.gradYear))
    return Array.from(set).sort((a, b) => b - a)
  }, [companyCandidates])

  // Sync state to URL search parameters
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())
    if (minCgpa > 0) params.set('cgpa_min', String(minCgpa))
    if (minTenth > 0) params.set('tenth_min', String(minTenth))
    if (minTwelfth > 0) params.set('twelfth_min', String(minTwelfth))
    if (minExp > 0) params.set('exp_min', String(minExp))
    if (maxExp < 10) params.set('exp_max', String(maxExp))
    if (selectedCity && selectedCity !== 'All') params.set('city', selectedCity)
    if (selectedBatch) params.set('grad_year', String(selectedBatch))
    if (includeUnknown) params.set('include_unknown', 'true')
    if (selectedStages.length > 0) params.set('stage', selectedStages[0])

    const skillsAll = skillFilters.filter((s) => s.mode === 'all').map((s) => s.name)
    const skillsAny = skillFilters.filter((s) => s.mode === 'any').map((s) => s.name)
    const skillsNone = skillFilters.filter((s) => s.mode === 'none').map((s) => s.name)

    if (skillsAll.length > 0) params.set('skills_all', skillsAll.join(','))
    if (skillsAny.length > 0) params.set('skills_any', skillsAny.join(','))
    if (skillsNone.length > 0) params.set('skills_none', skillsNone.join(','))

    if (page > 1) params.set('page', String(page))

    setSearchParams(params, { replace: true })
  }, [
    debouncedQuery,
    minCgpa,
    minTenth,
    minTwelfth,
    minExp,
    maxExp,
    selectedCity,
    selectedBatch,
    includeUnknown,
    selectedStages,
    skillFilters,
    page,
  ])

  // Skill Chip mode toggler
  const toggleSkillMode = (skillName: string) => {
    setSkillFilters((prev) =>
      prev.map((s) => {
        if (s.name !== skillName) return s
        const nextMode: 'all' | 'any' | 'none' =
          s.mode === 'all' ? 'any' : s.mode === 'any' ? 'none' : 'all'
        return { ...s, mode: nextMode }
      })
    )
  }

  const addSkillFilter = (skillName: string, mode: 'all' | 'any' | 'none' = 'all') => {
    if (skillFilters.some((s) => s.name.toLowerCase() === skillName.toLowerCase())) return
    setSkillFilters([...skillFilters, { name: skillName, mode }])
  }

  const removeSkillFilter = (skillName: string) => {
    setSkillFilters(skillFilters.filter((s) => s.name.toLowerCase() !== skillName.toLowerCase()))
  }

  // Filter candidate pool
  const filteredCandidates = useMemo(() => {
    return companyCandidates.filter((cand) => {
      const app = candidateAppMap.get(cand.id)
      const score = app ? app.matchScore : 0
      const stage = app ? app.stage : 'applied'

      // Unknown inclusion handling
      const isUnknownCgpa = cand.cgpa <= 0
      const isUnknownExp = cand.experienceYears === undefined || cand.experienceYears < 0
      if (!includeUnknown) {
        if (minCgpa > 0 && isUnknownCgpa) return false
        if (minExp > 0 && isUnknownExp) return false
      }

      // Keyword Search
      if (debouncedQuery.trim()) {
        const query = debouncedQuery.toLowerCase()
        const matchesName = cand.name.toLowerCase().includes(query)
        const matchesCollege = cand.college.toLowerCase().includes(query)
        const matchesSkill = cand.skills.some((s) => s.toLowerCase().includes(query))
        if (!matchesName && !matchesCollege && !matchesSkill) return false
      }

      // Academic thresholds
      if (minCgpa > 0 && !isUnknownCgpa && cand.cgpa < minCgpa) return false
      if (minTenth > 0 && cand.tenthPercent < minTenth) return false
      if (minTwelfth > 0 && cand.twelfthPercent < minTwelfth) return false

      // Experience Range
      if (minExp > 0 && !isUnknownExp && cand.experienceYears < minExp) return false
      if (maxExp < 10 && cand.experienceYears > maxExp) return false

      // City / Location
      if (selectedCity !== 'All' && cand.location.toLowerCase() !== selectedCity.toLowerCase()) {
        return false
      }

      // Graduation Batch
      if (selectedBatch && cand.gradYear !== selectedBatch) return false

      // Stage Filter
      if (selectedStages.length > 0 && !selectedStages.includes(stage)) return false

      // SKILL FILTERS: ALL (AND), ANY (OR), NONE (NOT)
      const candSkillsLower = cand.skills.map((s) => s.toLowerCase())

      const skillsAll = skillFilters.filter((s) => s.mode === 'all')
      if (skillsAll.length > 0) {
        const hasAll = skillsAll.every((req) =>
          candSkillsLower.some((s) => s.includes(req.name.toLowerCase()))
        )
        if (!hasAll) return false
      }

      const skillsAny = skillFilters.filter((s) => s.mode === 'any')
      if (skillsAny.length > 0) {
        const hasAny = skillsAny.some((req) =>
          candSkillsLower.some((s) => s.includes(req.name.toLowerCase()))
        )
        if (!hasAny) return false
      }

      const skillsNone = skillFilters.filter((s) => s.mode === 'none')
      if (skillsNone.length > 0) {
        const hasNone = skillsNone.some((forbidden) =>
          candSkillsLower.some((s) => s.includes(forbidden.name.toLowerCase()))
        )
        if (hasNone) return false
      }

      return true
    })
  }, [
    companyCandidates,
    candidateAppMap,
    debouncedQuery,
    minCgpa,
    minTenth,
    minTwelfth,
    minExp,
    maxExp,
    selectedCity,
    selectedBatch,
    includeUnknown,
    selectedStages,
    skillFilters,
  ])

  // Sorting
  const sortedCandidates = useMemo(() => {
    return [...filteredCandidates].sort((a, b) => {
      const appA = candidateAppMap.get(a.id)
      const appB = candidateAppMap.get(b.id)
      const scoreA = appA?.matchScore || 0
      const scoreB = appB?.matchScore || 0

      let result = 0
      if (sortBy === 'score') result = scoreA - scoreB
      else if (sortBy === 'cgpa') result = a.cgpa - b.cgpa
      else if (sortBy === 'exp') result = a.experienceYears - b.experienceYears
      else if (sortBy === 'name') result = a.name.localeCompare(b.name)

      return sortOrder === 'desc' ? -result : result
    })
  }, [filteredCandidates, candidateAppMap, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(sortedCandidates.length / pageSize) || 1
  const paginatedCandidates = sortedCandidates.slice((page - 1) * pageSize, page * pageSize)

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedCandidateIds.length === paginatedCandidates.length) {
      setSelectedCandidateIds([])
    } else {
      setSelectedCandidateIds(paginatedCandidates.map((c) => c.id))
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedCandidateIds.includes(id)) {
      setSelectedCandidateIds(selectedCandidateIds.filter((cid) => cid !== id))
    } else {
      setSelectedCandidateIds([...selectedCandidateIds, id])
    }
  }

  // Bulk actions
  const handleBulkMoveStage = () => {
    const appIdsToMove: string[] = []
    selectedCandidateIds.forEach((candId) => {
      const app = candidateAppMap.get(candId)
      if (app) appIdsToMove.push(app.id)
    })

    bulkUpdateApplicationStage(appIdsToMove, targetStage, 'Bulk stage migration')
    setBulkStageModalOpen(false)
    setSelectedCandidateIds([])
    toast.success(`Moved ${appIdsToMove.length} candidates to ${targetStage}!`)
  }

  const handleBulkShortlist = () => {
    const appIdsToMove: string[] = []
    selectedCandidateIds.forEach((candId) => {
      const app = candidateAppMap.get(candId)
      if (app) appIdsToMove.push(app.id)
    })

    bulkUpdateApplicationStage(appIdsToMove, 'shortlisted', 'Bulk shortlist')
    setSelectedCandidateIds([])
    toast.success(`Shortlisted ${appIdsToMove.length} candidates!`)
  }

  const handleBulkEmail = () => {
    navigate(`/app/emails?recipientIds=${selectedCandidateIds.join(',')}`)
  }

  // Compare Handler: Strictly enforce 2 to 3 candidates per plan!
  const handleBulkCompare = () => {
    if (selectedCandidateIds.length > 3) {
      toast.error('Comparison is limited to a maximum of 3 candidates.')
      return
    }
    if (selectedCandidateIds.length < 2) {
      toast.error('Select at least 2 candidates to compare.')
      return
    }
    navigate(`/app/compare?candidateIds=${selectedCandidateIds.join(',')}`)
  }

  const clearAllFilters = () => {
    setTextSearch('')
    setDebouncedQuery('')
    setMinCgpa(0)
    setMinTenth(0)
    setMinTwelfth(0)
    setSkillFilters([])
    setMinExp(0)
    setMaxExp(10)
    setSelectedCity('All')
    setSelectedBatch(null)
    setIncludeUnknown(false)
    setSelectedStages([])
    setPage(1)
  }

  const activeFilterCount =
    (debouncedQuery ? 1 : 0) +
    (minCgpa > 0 ? 1 : 0) +
    (minTenth > 0 ? 1 : 0) +
    (minTwelfth > 0 ? 1 : 0) +
    skillFilters.length +
    (minExp > 0 || maxExp < 10 ? 1 : 0) +
    (selectedCity !== 'All' ? 1 : 0) +
    (selectedBatch ? 1 : 0) +
    (includeUnknown ? 1 : 0) +
    selectedStages.length

  return (
    <div className="space-y-4">
      {/* Bulk Stage Modal */}
      <Modal
        open={bulkStageModalOpen}
        onOpenChange={setBulkStageModalOpen}
        title={`Move ${selectedCandidateIds.length} Candidates`}
        description="Select the destination recruitment stage for all selected candidates."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Target Stage</label>
            <select
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-white text-sm text-text"
            >
              {company.settings.pipelineStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setBulkStageModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleBulkMoveStage}>
              Confirm Move
            </Button>
          </div>
        </div>
      </Modal>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Candidate Directory</h1>
          <p className="text-xs text-muted mt-0.5">
            {filteredCandidates.length} of {companyCandidates.length} talent profiles matched
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Table Column Chooser */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
              onClick={() => setShowColumnChooser(!showColumnChooser)}
            >
              Columns
            </Button>
            {showColumnChooser && (
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg border border-border shadow-modal p-2.5 z-30 space-y-2 text-xs">
                <span className="font-bold text-muted uppercase text-[10px] block">
                  Toggle Custom Columns
                </span>
                {company.settings.customFields.length === 0 ? (
                  <p className="text-[11px] text-muted italic">No custom fields defined.</p>
                ) : (
                  company.settings.customFields.map((cf) => (
                    <label key={cf.id} className="flex items-center gap-2 px-1 py-0.5 hover:bg-gray-50 rounded cursor-pointer text-text">
                      <input
                        type="checkbox"
                        checked={Boolean(visibleColumns[cf.id])}
                        onChange={(e) => setVisibleColumns({ ...visibleColumns, [cf.id]: e.target.checked })}
                        className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span className="truncate">{cf.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Filter className="w-3.5 h-3.5" />}
            onClick={() => setShowFilterSidebar(!showFilterSidebar)}
          >
            {showFilterSidebar ? 'Hide Filters' : `Filters (${activeFilterCount})`}
          </Button>
        </div>
      </div>

      {/* Search Bar & Active Filter Chips */}
      <div className="bg-white rounded-xl border border-border p-3 shadow-soft space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={textSearch}
              onChange={(e) => setTextSearch(e.target.value)}
              placeholder='Try Natural Language or search candidates by skill/college (e.g. "IIT Delhi", "Python", "Noida")...'
              className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-border bg-gray-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-text"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDebouncedQuery(textSearch)}
          >
            Parse Query
          </Button>
          {textSearch && (
            <Button variant="ghost" size="sm" onClick={() => { setTextSearch(''); setDebouncedQuery(''); }}>
              Clear
            </Button>
          )}
        </div>

        {/* Active Filter Chips Bar */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
            <span className="text-muted text-[11px] font-semibold mr-1">Active Filters:</span>

            {debouncedQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-primary border border-indigo-200">
                Query: "{debouncedQuery}"
                <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setTextSearch('')} />
              </span>
            )}

            {minCgpa > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-primary border border-indigo-200">
                CGPA ≥ {minCgpa}
                <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setMinCgpa(0)} />
              </span>
            )}

            {/* Skill chips with AND / OR / NOT badge */}
            {skillFilters.map((s) => (
              <span
                key={s.name}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium ${
                  s.mode === 'all'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : s.mode === 'any'
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                <span>{s.name}</span>
                <button
                  type="button"
                  title="Click to toggle: MUST HAVE (AND) -> NICE TO HAVE (OR) -> EXCLUDE (NOT)"
                  onClick={() => toggleSkillMode(s.name)}
                  className="px-1 py-0.2 rounded text-[9px] font-extrabold uppercase bg-white/80 shadow-xs cursor-pointer"
                >
                  {s.mode.toUpperCase()}
                </button>
                <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => removeSkillFilter(s.name)} />
              </span>
            ))}

            {selectedCity !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                City: {selectedCity}
                <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedCity('All')} />
              </span>
            )}

            {selectedBatch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                Batch: {selectedBatch}
                <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedBatch(null)} />
              </span>
            )}

            {includeUnknown && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Include Unknowns
                <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setIncludeUnknown(false)} />
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="text-[11px] text-rose-600 hover:underline ml-2 font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset all
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area: Sidebar + Candidates Table */}
      <div className="flex gap-4 items-start">
        {/* FILTER SIDEBAR */}
        {showFilterSidebar && (
          <aside className="w-64 bg-card rounded-xl border border-border p-4 shadow-soft space-y-4 shrink-0 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Refine Candidates
              </span>
              <button onClick={clearAllFilters} className="text-[11px] text-primary hover:underline">
                Reset
              </button>
            </div>

            {/* Toggle: Include Unknowns */}
            <div className="p-2.5 rounded-lg bg-gray-50 border border-border space-y-1">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-text">Include Unknown Values</span>
                <input
                  type="checkbox"
                  checked={includeUnknown}
                  onChange={(e) => setIncludeUnknown(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
              </label>
              <p className="text-[10px] text-muted leading-tight">
                Includes candidates with unparsed CGPA or zero stated experience.
              </p>
            </div>

            {/* Minimum CGPA */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-text mb-1">
                <span>Min CGPA</span>
                <span className="text-primary">{minCgpa > 0 ? minCgpa : 'Any'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.2"
                value={minCgpa}
                onChange={(e) => setMinCgpa(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Minimum 10th & 12th Board % */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">Min 10th %</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={minTenth || ''}
                  onChange={(e) => setMinTenth(parseInt(e.target.value, 10) || 0)}
                  placeholder="e.g. 75"
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">Min 12th %</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={minTwelfth || ''}
                  onChange={(e) => setMinTwelfth(parseInt(e.target.value, 10) || 0)}
                  placeholder="e.g. 75"
                  className="h-7 text-xs"
                />
              </div>
            </div>

            {/* Skills Picker with Mode (AND / OR / NOT) */}
            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Competency & Skills Filter
              </label>
              <p className="text-[10px] text-muted mb-2">
                Click a skill to add. Toggle chip for <strong>AND</strong> (must have), <strong>OR</strong> (any), or <strong>NOT</strong> (exclude).
              </p>
              <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1 border border-border rounded-lg bg-gray-50/50">
                {availableSkills.map((skill) => {
                  const existing = skillFilters.find((s) => s.name.toLowerCase() === skill.toLowerCase())
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => {
                        if (existing) {
                          toggleSkillMode(skill)
                        } else {
                          addSkillFilter(skill, 'all')
                        }
                      }}
                      className={`px-2 py-0.5 rounded text-xs transition-colors flex items-center gap-1 ${
                        existing
                          ? existing.mode === 'all'
                            ? 'bg-emerald-600 text-white font-bold'
                            : existing.mode === 'any'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-rose-600 text-white font-bold'
                          : 'bg-white border border-border text-muted hover:bg-gray-100 hover:text-text'
                      }`}
                    >
                      <span>{skill}</span>
                      {existing && (
                        <span className="text-[8px] uppercase tracking-tighter opacity-80">
                          {existing.mode}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Experience Range */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-text mb-1">
                <span>Experience (Years)</span>
                <span className="text-primary">{minExp} - {maxExp}y</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={minExp}
                  onChange={(e) => setMinExp(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>

            {/* City / Location Picker */}
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Candidate City</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full h-8 px-2 text-xs rounded-lg border border-border bg-white text-text"
              >
                {availableCities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Graduation Batch */}
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Graduation Batch</label>
              <div className="flex flex-wrap gap-1">
                {availableBatches.map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedBatch(selectedBatch === b ? null : b)}
                    className={`px-2 py-0.5 rounded text-xs border ${
                      selectedBatch === b
                        ? 'bg-primary text-white border-primary font-bold'
                        : 'bg-white text-muted border-border hover:bg-gray-50'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* CANDIDATES TABLE AREA */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Bulk Selection Bar */}
          {selectedCandidateIds.length > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs animate-in fade-in-0 duration-200">
              <span className="font-semibold text-indigo-900">
                {selectedCandidateIds.length} candidate{selectedCandidateIds.length > 1 ? 's' : ''} selected
              </span>

              <div className="flex items-center gap-2">
                {isReadOnly ? (
                  <span className="text-xs text-muted italic">Read-only view (Viewer role)</span>
                ) : (
                  <>
                    <Button variant="primary" size="sm" onClick={handleBulkShortlist}>
                      Shortlist Selected
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setBulkStageModalOpen(true)}>
                      Move Stage
                    </Button>
                    <Button variant="outline" size="sm" leftIcon={<Mail className="w-3 h-3" />} onClick={handleBulkEmail}>
                      Send Email
                    </Button>
                  </>
                )}

                {/* Compare Button: Strictly for 2 to 3 candidates */}
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Scale className="w-3 h-3" />}
                  onClick={handleBulkCompare}
                  disabled={selectedCandidateIds.length < 2 || selectedCandidateIds.length > 3}
                >
                  Compare ({selectedCandidateIds.length})
                </Button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-border text-muted font-semibold">
                    <th className="p-3 w-10">
                      <button onClick={handleSelectAll} className="p-0.5 text-muted hover:text-text">
                        {selectedCandidateIds.length === paginatedCandidates.length && paginatedCandidates.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th
                      className="p-3 cursor-pointer hover:text-text"
                      onClick={() => {
                        setSortBy('name')
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Candidate & College
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3 cursor-pointer hover:text-text"
                      onClick={() => {
                        setSortBy('cgpa')
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Academic CGPA
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-3">Skills</th>
                    <th
                      className="p-3 cursor-pointer hover:text-text"
                      onClick={() => {
                        setSortBy('exp')
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Experience
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-3">Location</th>

                    {/* Custom Fields Headers */}
                    {company.settings.customFields
                      .filter((cf) => visibleColumns[cf.id])
                      .map((cf) => (
                        <th key={cf.id} className="p-3 font-semibold text-text">
                          {cf.name}
                        </th>
                      ))}

                    <th
                      className="p-3 cursor-pointer hover:text-text"
                      onClick={() => {
                        setSortBy('score')
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Match Score
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-3">Stage</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {paginatedCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-10 text-center text-muted">
                        No candidates match the specified filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedCandidates.map((candidate) => {
                      const app = candidateAppMap.get(candidate.id)
                      const isSelected = selectedCandidateIds.includes(candidate.id)
                      const isLowConfidence = candidate.parseConfidence < 70
                      const isDuplicate = duplicateCandidateIds.has(candidate.id)

                      return (
                        <tr
                          key={candidate.id}
                          onClick={() => navigate(`/app/candidates/${candidate.id}`)}
                          className={`hover:bg-gray-50/70 cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/30' : ''
                          }`}
                        >
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => toggleSelect(candidate.id)} className="p-0.5 text-muted hover:text-text">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-primary" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Candidate Name & College */}
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar
                                name={candidate.name}
                                size="sm"
                                isBlind={company.settings.blindMode}
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-text text-xs hover:text-primary">
                                    {company.settings.blindMode ? 'Candidate #' + candidate.id.slice(-4) : candidate.name}
                                  </span>
                                  {/* Duplicate Badge */}
                                  {isDuplicate && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold border border-amber-300">
                                      Duplicate
                                    </span>
                                  )}
                                  {/* Low Confidence Badge */}
                                  {isLowConfidence && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 text-[9px] font-semibold border border-amber-200">
                                      ⚠️ {candidate.parseConfidence}% Conf
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted truncate max-w-[170px]">
                                  {company.settings.blindMode
                                    ? '[Hidden College]'
                                    : candidate.college}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Academic CGPA (with amber highlight if low-confidence or missing) */}
                          <td className={`p-3 ${candidate.cgpa <= 0 ? 'bg-amber-50/40' : ''}`}>
                            <div className="font-semibold text-text">
                              {candidate.cgpa > 0 ? `${candidate.cgpa} / 10` : <span className="text-amber-700 italic">Unknown</span>}
                            </div>
                            <div className="text-[10px] text-muted">
                              10th: {candidate.tenthPercent}% • 12th: {candidate.twelfthPercent}%
                            </div>
                          </td>

                          {/* Skills Chips */}
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {candidate.skills.slice(0, 3).map((s) => (
                                <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-700 font-medium">
                                  {s}
                                </span>
                              ))}
                              {candidate.skills.length > 3 && (
                                <span className="text-[10px] text-muted self-center">
                                  +{candidate.skills.length - 3}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Experience (with amber highlight if unknown) */}
                          <td className={`p-3 ${candidate.experienceYears === undefined ? 'bg-amber-50/40' : ''}`}>
                            <div className="font-medium text-text">
                              {candidate.experienceYears === 0
                                ? 'Fresher'
                                : `${candidate.experienceYears} yrs`}
                            </div>
                            <div className="text-[10px] text-muted">Batch {candidate.gradYear}</div>
                          </td>

                          {/* Location */}
                          <td className="p-3 text-muted">
                            {company.settings.blindMode && company.settings.hiddenFields.includes('location')
                              ? '[Hidden]'
                              : candidate.location}
                          </td>

                          {/* Custom Fields Columns */}
                          {company.settings.customFields
                            .filter((cf) => visibleColumns[cf.id])
                            .map((cf) => (
                              <td key={cf.id} className="p-3 text-muted">
                                {candidate.customFields && candidate.customFields[cf.id] !== undefined
                                  ? String(candidate.customFields[cf.id])
                                  : '—'}
                              </td>
                            ))}

                          {/* Match Score */}
                          <td className="p-3">
                            {app ? (
                              <ScoreRing score={app.matchScore} size="sm" />
                            ) : (
                              <span className="text-muted text-[11px]">—</span>
                            )}
                          </td>

                          {/* Stage */}
                          <td className="p-3">
                            <StatusBadge stage={app?.stage || 'applied'} />
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted bg-gray-50/50">
              <span>
                Showing {sortedCandidates.length === 0 ? 0 : (page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, sortedCandidates.length)} of {sortedCandidates.length} entries
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="px-2 text-xs font-semibold text-text">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
