import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppStore } from '@/store'
import { isReadOnlyViewer } from '@/lib/permissions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { Avatar } from '@/components/ui/Avatar'
import { SkillChip } from '@/components/ui/SkillChip'
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
} from 'lucide-react'
import { Candidate, Application } from '@/types'
import { hasSkillWithSynonyms } from '@/lib/scoring'

export const CandidatesPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    currentCompanyId,
    currentUser,
    candidates,
    applications,
    companies,
    bulkUpdateApplicationStage,
  } = useAppStore()

  const company = companies.find((c) => c.id === currentCompanyId) || companies[0]
  const isReadOnly = isReadOnlyViewer(currentUser?.role)

  // URL Query Parameters initialization
  const stageParam = searchParams.get('stage')
  const searchParam = searchParams.get('q') || searchParams.get('search') || ''

  // Filter states
  const [nlSearch, setNlSearch] = useState('')
  const [textSearch, setTextSearch] = useState(searchParam)
  const [minCgpa, setMinCgpa] = useState<number>(0)
  const [minTenth, setMinTenth] = useState<number>(0)
  const [minTwelfth, setMinTwelfth] = useState<number>(0)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [minExp, setMinExp] = useState<number>(0)
  const [maxExp, setMaxExp] = useState<number>(10)
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedBatches, setSelectedBatches] = useState<number[]>([])
  const [selectedStages, setSelectedStages] = useState<string[]>(stageParam ? [stageParam] : [])
  const [minScore, setMinScore] = useState<number>(0)
  const [customFieldFilters, setCustomFieldFilters] = useState<Record<string, string>>({})

  // Update selected stage when URL changes
  useEffect(() => {
    const stage = searchParams.get('stage')
    if (stage) {
      setSelectedStages([stage])
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

  // Extract all distinct filter choices
  const availableSkills = useMemo(() => {
    const set = new Set<string>()
    companyCandidates.forEach((c) => c.skills.forEach((s) => set.add(s)))
    return Array.from(set).sort()
  }, [companyCandidates])

  const availableLocations = useMemo(() => {
    const set = new Set<string>()
    companyCandidates.forEach((c) => set.add(c.location))
    return Array.from(set).sort()
  }, [companyCandidates])

  const availableBatches = useMemo(() => {
    const set = new Set<number>()
    companyCandidates.forEach((c) => set.add(c.gradYear))
    return Array.from(set).sort((a, b) => b - a)
  }, [companyCandidates])

  // Natural Language Search Parser
  const handleNaturalLanguageSearch = (query: string) => {
    setNlSearch(query)
    if (!query.trim()) return

    const lower = query.toLowerCase()

    // 1. Check CGPA pattern: "cgpa above 8", "cgpa > 7.5", "8+ cgpa"
    const cgpaMatch = lower.match(/(?:cgpa|gpa)\s*(?:above|>|over|min)?\s*(\d+(?:\.\d+)?)/)
    if (cgpaMatch && cgpaMatch[1]) {
      setMinCgpa(parseFloat(cgpaMatch[1]))
    }

    // 2. Check year pattern: "2025 grads", "batch 2024", "2025"
    const yearMatches = lower.match(/\b(202[0-6])\b/g)
    if (yearMatches) {
      setSelectedBatches(yearMatches.map(Number))
    }

    // 3. Check locations: "delhi", "bengaluru", "pune", "mumbai"
    const foundLocations: string[] = []
    availableLocations.forEach((loc) => {
      if (lower.includes(loc.toLowerCase())) {
        foundLocations.push(loc)
      }
    })
    if (foundLocations.length > 0) {
      setSelectedLocations(foundLocations)
    }

    // 4. Check skills: "python", "react", "docker"
    const foundSkills: string[] = []
    availableSkills.forEach((skill) => {
      if (lower.includes(skill.toLowerCase())) {
        foundSkills.push(skill)
      }
    })
    if (foundSkills.length > 0) {
      setSelectedSkills(foundSkills)
    }

    toast.success('Natural language query parsed into filter criteria!')
  }

  // Saved Filter Presets
  const applyPreset = (presetName: string) => {
    if (presetName === 'tier1_coders') {
      setMinCgpa(8.0)
      setSelectedSkills(['Python', 'Data Structures', 'Java'])
      setMinScore(75)
      toast.info('Applied "Top Tier-1 Coders" preset')
    } else if (presetName === 'immediate_freshers') {
      setMinExp(0)
      setMaxExp(1)
      setSelectedBatches([2024, 2025])
      toast.info('Applied "2024-2025 Freshers" preset')
    } else if (presetName === 'high_matches') {
      setMinScore(80)
      setSelectedStages(['applied', 'shortlisted'])
      toast.info('Applied "High Match Rate (80%+)" preset')
    }
  }

  const clearAllFilters = () => {
    setNlSearch('')
    setTextSearch('')
    setMinCgpa(0)
    setMinTenth(0)
    setMinTwelfth(0)
    setSelectedSkills([])
    setMinExp(0)
    setMaxExp(10)
    setSelectedLocations([])
    setSelectedBatches([])
    setSelectedStages([])
    setMinScore(0)
    setCustomFieldFilters({})
    toast.info('All filters cleared')
  }

  // Active filters count
  const activeFilterCount =
    (minCgpa > 0 ? 1 : 0) +
    (minTenth > 0 ? 1 : 0) +
    (minTwelfth > 0 ? 1 : 0) +
    selectedSkills.length +
    (minExp > 0 || maxExp < 10 ? 1 : 0) +
    selectedLocations.length +
    selectedBatches.length +
    selectedStages.length +
    (minScore > 0 ? 1 : 0) +
    Object.keys(customFieldFilters).length

  // Filter candidates logic (Exact and combinable)
  const filteredCandidates = useMemo(() => {
    return companyCandidates.filter((cand) => {
      const app = candidateAppMap.get(cand.id)
      const score = app ? app.matchScore : 0
      const stage = app ? app.stage : 'applied'

      // Text search
      if (textSearch.trim()) {
        const query = textSearch.toLowerCase()
        const matchesName = cand.name.toLowerCase().includes(query)
        const matchesCollege = cand.college.toLowerCase().includes(query)
        const matchesSkill = cand.skills.some((s) => s.toLowerCase().includes(query))
        if (!matchesName && !matchesCollege && !matchesSkill) return false
      }

      // CGPA
      if (minCgpa > 0 && cand.cgpa < minCgpa) return false

      // 10th / 12th
      if (minTenth > 0 && cand.tenthPercent < minTenth) return false
      if (minTwelfth > 0 && cand.twelfthPercent < minTwelfth) return false

      // Experience range
      if (cand.experienceYears < minExp || cand.experienceYears > maxExp) return false

      // Graduation batch
      if (selectedBatches.length > 0 && !selectedBatches.includes(cand.gradYear)) return false

      // Location
      if (selectedLocations.length > 0 && !selectedLocations.includes(cand.location)) return false

      // Skills (synonym-aware matching!)
      if (selectedSkills.length > 0) {
        const hasAllSelected = selectedSkills.every((reqSkill) =>
          hasSkillWithSynonyms(cand.skills, reqSkill, company.settings.skillSynonyms)
        )
        if (!hasAllSelected) return false
      }

      // Score
      if (minScore > 0 && score < minScore) return false

      // Pipeline Stage
      if (selectedStages.length > 0 && !selectedStages.includes(stage)) return false

      // Custom fields
      for (const [cfId, val] of Object.entries(customFieldFilters)) {
        if (val && String(cand.customFields[cfId]) !== val) {
          return false
        }
      }

      return true
    })
  }, [
    companyCandidates,
    candidateAppMap,
    textSearch,
    minCgpa,
    minTenth,
    minTwelfth,
    minExp,
    maxExp,
    selectedBatches,
    selectedLocations,
    selectedSkills,
    minScore,
    selectedStages,
    customFieldFilters,
    company.settings.skillSynonyms,
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
    // Navigate to email composer with preloaded candidate IDs
    navigate(`/app/emails?recipientIds=${selectedCandidateIds.join(',')}`)
  }

  const handleBulkCompare = () => {
    if (selectedCandidateIds.length > 4) {
      toast.error('Compare supports up to 4 candidates at a time.')
      return
    }
    navigate(`/app/compare?candidateIds=${selectedCandidateIds.join(',')}`)
  }

  const handleExportCSV = () => {
    const rows = [
      ['Name', 'Email', 'Phone', 'College', 'CGPA', 'Experience (Yrs)', 'Location', 'Skills', 'Match Score'],
      ...filteredCandidates.map((c) => {
        const score = candidateAppMap.get(c.id)?.matchScore || ''
        return [
          `"${c.name}"`,
          `"${c.email}"`,
          `"${c.phone}"`,
          `"${c.college}"`,
          c.cgpa,
          c.experienceYears,
          `"${c.location}"`,
          `"${c.skills.join(', ')}"`,
          score,
        ]
      }),
    ]

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${company.name.toLowerCase().replace(' ', '_')}_candidates.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Exported candidates to CSV')
  }

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

      {/* Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Candidate Directory</h1>
          <p className="text-xs text-muted mt-0.5">
            {filteredCandidates.length} of {companyCandidates.length} candidates match current filters
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Saved Filters Dropdown */}
          <div className="relative group">
            <Button variant="outline" size="sm" leftIcon={<Bookmark className="w-3.5 h-3.5" />}>
              Saved Presets
            </Button>
            <div className="hidden group-hover:block absolute right-0 mt-1 w-52 bg-white rounded-lg border border-border shadow-modal py-1 z-30">
              <button
                onClick={() => applyPreset('tier1_coders')}
                className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-50 text-text"
              >
                Top Tier-1 Coders (8+ CGPA)
              </button>
              <button
                onClick={() => applyPreset('immediate_freshers')}
                className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-50 text-text"
              >
                2024-2025 Freshers (0-1y)
              </button>
              <button
                onClick={() => applyPreset('high_matches')}
                className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-50 text-text"
              >
                High Match Rate (80%+)
              </button>
            </div>
          </div>

          <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={handleExportCSV}>
            Export CSV
          </Button>

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
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg border border-border shadow-modal p-2.5 z-30 space-y-2 text-xs animate-in fade-in-0">
                <span className="font-bold text-muted uppercase text-[10px] block">
                  Custom & Standard Columns
                </span>
                {company.settings.customFields.length === 0 ? (
                  <p className="text-[11px] text-muted italic">No custom fields defined in Settings.</p>
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

      {/* Natural Language Search Bar */}
      <div className="bg-white rounded-xl border border-border p-3 shadow-soft space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Sparkles className="w-4 h-4 text-primary absolute left-3 top-2.5" />
            <input
              type="text"
              value={nlSearch}
              onChange={(e) => setNlSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNaturalLanguageSearch(nlSearch)
                }
              }}
              placeholder='Try Natural Language: "Python developers, 2025 grads, CGPA above 8, Delhi"'
              className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-border bg-gray-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-text"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleNaturalLanguageSearch(nlSearch)}
          >
            Parse Query
          </Button>
        </div>

        {/* Filter chips bar */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
            <span className="text-muted text-[11px] font-semibold mr-1">Active:</span>

            {minCgpa > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-primary border border-indigo-200">
                CGPA ≥ {minCgpa}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setMinCgpa(0)} />
              </span>
            )}

            {selectedSkills.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200"
              >
                {s}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => setSelectedSkills(selectedSkills.filter((sk) => sk !== s))}
                />
              </span>
            ))}

            {selectedLocations.map((loc) => (
              <span
                key={loc}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200"
              >
                {loc}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => setSelectedLocations(selectedLocations.filter((l) => l !== loc))}
                />
              </span>
            ))}

            {selectedBatches.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200"
              >
                Batch {b}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => setSelectedBatches(selectedBatches.filter((bt) => bt !== b))}
                />
              </span>
            ))}

            {minScore > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Score ≥ {minScore}%
                <X className="w-3 h-3 cursor-pointer" onClick={() => setMinScore(0)} />
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="text-[11px] text-rose-600 hover:underline ml-2 font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Main Content Layout (Sidebar + Table) */}
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

            {/* Keyword / Name Search */}
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Keywords</label>
              <Input
                value={textSearch}
                onChange={(e) => setTextSearch(e.target.value)}
                placeholder="Name, college, skill..."
                className="h-8 text-xs"
              />
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

            {/* Minimum 10th & 12th % */}
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

            {/* Minimum Match Score */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-text mb-1">
                <span>Min Match Score</span>
                <span className="text-primary">{minScore > 0 ? `${minScore}%` : 'Any'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="95"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Experience Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-text mb-1">
                <span>Experience</span>
                <span className="text-primary">{minExp} - {maxExp}+ yrs</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="range"
                  min="0"
                  max="8"
                  value={minExp}
                  onChange={(e) => setMinExp(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>

            {/* Skills selection */}
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Skills (Synonym-Aware)</label>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1 border border-border rounded-lg p-1.5 bg-gray-50/50">
                {availableSkills.slice(0, 16).map((skill) => (
                  <label key={skill} className="flex items-center gap-2 text-xs cursor-pointer hover:text-primary">
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedSkills([...selectedSkills, skill])
                        else setSelectedSkills(selectedSkills.filter((s) => s !== skill))
                      }}
                      className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <span className="truncate">{skill}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Locations */}
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Locations</label>
              <div className="space-y-1">
                {availableLocations.map((loc) => (
                  <label key={loc} className="flex items-center gap-2 text-xs cursor-pointer hover:text-primary">
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes(loc)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedLocations([...selectedLocations, loc])
                        else setSelectedLocations(selectedLocations.filter((l) => l !== loc))
                      }}
                      className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <span>{loc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Batches */}
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Graduation Batch</label>
              <div className="flex flex-wrap gap-1">
                {availableBatches.map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      if (selectedBatches.includes(b)) {
                        setSelectedBatches(selectedBatches.filter((batch) => batch !== b))
                      } else {
                        setSelectedBatches([...selectedBatches, b])
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-xs border ${
                      selectedBatches.includes(b)
                        ? 'bg-primary text-white border-primary'
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
          {/* Bulk actions toolbar */}
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
                {selectedCandidateIds.length >= 2 && selectedCandidateIds.length <= 4 && (
                  <Button variant="secondary" size="sm" leftIcon={<Scale className="w-3 h-3" />} onClick={handleBulkCompare}>
                    Compare ({selectedCandidateIds.length})
                  </Button>
                )}
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
                      <td colSpan={8} className="p-10 text-center text-muted">
                        No candidates found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedCandidates.map((candidate) => {
                      const app = candidateAppMap.get(candidate.id)
                      const isSelected = selectedCandidateIds.includes(candidate.id)

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
                                <div className="font-bold text-text text-xs hover:text-primary">
                                  {company.settings.blindMode ? 'Candidate ' + candidate.id.slice(-4) : candidate.name}
                                </div>
                                <div className="text-[11px] text-muted truncate max-w-[170px]">
                                  {company.settings.blindMode && company.settings.hiddenFields.includes('college')
                                    ? '[Hidden College]'
                                    : candidate.college}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Academic CGPA */}
                          <td className="p-3">
                            <div className="font-semibold text-text">{candidate.cgpa} / 10</div>
                            <div className="text-[10px] text-muted">
                              10th: {candidate.tenthPercent}% • 12th: {candidate.twelfthPercent}%
                            </div>
                          </td>

                          {/* Skills Chips */}
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {candidate.skills.slice(0, 3).map((s) => (
                                <SkillChip key={s} name={s} size="sm" status="neutral" />
                              ))}
                              {candidate.skills.length > 3 && (
                                <span className="text-[10px] text-muted self-center">
                                  +{candidate.skills.length - 3}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Experience */}
                          <td className="p-3">
                            <div className="font-medium text-text">
                              {candidate.experienceYears === 0 ? 'Fresher' : `${candidate.experienceYears} yrs`}
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
            <div className="p-3 border-t border-border flex items-center justify-between bg-white text-xs text-muted">
              <span>
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, sortedCandidates.length)} of {sortedCandidates.length}
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="px-2 font-medium text-text">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
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
