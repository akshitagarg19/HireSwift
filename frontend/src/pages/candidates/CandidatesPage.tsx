import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppStore } from '@/store'
import { isReadOnlyViewer } from '@/lib/permissions'
import { api, CandidateFilterParams, USE_MOCK } from '@/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
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
  Edit,
  Save,
  ExternalLink,
  Briefcase,
  FileText,
} from 'lucide-react'
import { Candidate, Application, DEFAULT_DEMO_COMPANY } from '@/types'

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
    isBlindMode,
  } = useAppStore()

  const company = USE_MOCK
    ? (companies.find((c) => c.id === currentCompanyId) || companies[0])
    : DEFAULT_DEMO_COMPANY
  const isReadOnly = USE_MOCK ? isReadOnlyViewer(currentUser?.role) : false

  // Duplicate candidate ID set (mock mode only)
  const duplicateCandidateIds = useMemo(() => {
    if (!USE_MOCK) return new Set<string>()
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
  const initialExpMin = searchParams.has('exp_min') ? parseFloat(searchParams.get('exp_min')!) : 0
  const initialExpMax = searchParams.has('exp_max') ? parseFloat(searchParams.get('exp_max')!) : 10
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

  // Sync URL search parameters to state when URL changes externally
  useEffect(() => {
    const q = searchParams.get('q') || searchParams.get('search') || ''
    setTextSearch(q)
    setDebouncedQuery(q)
    setMinCgpa(parseFloat(searchParams.get('cgpa_min') || '0') || 0)
    setMinTenth(parseInt(searchParams.get('tenth_min') || '0', 10) || 0)
    setMinTwelfth(parseInt(searchParams.get('twelfth_min') || '0', 10) || 0)
    setMinExp(searchParams.has('exp_min') ? parseFloat(searchParams.get('exp_min')!) : 0)
    setMaxExp(searchParams.has('exp_max') ? parseFloat(searchParams.get('exp_max')!) : 10)
    setSelectedCity(searchParams.get('city') || 'All')
    setSelectedBatch(searchParams.get('grad_year') ? parseInt(searchParams.get('grad_year')!, 10) : null)
    setIncludeUnknown(searchParams.get('include_unknown') === 'true')

    const skillsList: SkillFilter[] = []
    const all = searchParams.get('skills_all')?.split(',').filter(Boolean) || []
    const any = searchParams.get('skills_any')?.split(',').filter(Boolean) || []
    const none = searchParams.get('skills_none')?.split(',').filter(Boolean) || []
    all.forEach((s) => skillsList.push({ name: s.trim(), mode: 'all' }))
    any.forEach((s) => skillsList.push({ name: s.trim(), mode: 'any' }))
    none.forEach((s) => skillsList.push({ name: s.trim(), mode: 'none' }))
    setSkillFilters(skillsList)

    const stageParam = searchParams.get('stage')
    setSelectedStages(stageParam ? [stageParam] : [])

    const sortParam = searchParams.get('sort')
    if (sortParam) {
      if (sortParam.startsWith('cgpa')) setSortBy('cgpa')
      else if (sortParam.startsWith('exp')) setSortBy('exp')
      else if (sortParam.startsWith('name')) setSortBy('name')
      else if (sortParam.startsWith('score')) setSortBy('score')
      setSortOrder(sortParam.endsWith('asc') ? 'asc' : 'desc')
    }

    const pageParam = parseInt(searchParams.get('page') || '1', 10) || 1
    setPage(pageParam)
  }, [searchParams])

  // UI state
  const [showFilterSidebar, setShowFilterSidebar] = useState(true)
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([])
  const [bulkStageModalOpen, setBulkStageModalOpen] = useState(false)
  const [targetStage, setTargetStage] = useState('shortlisted')
  const sortParam = searchParams.get('sort')
  const initialSortBy = sortParam?.startsWith('cgpa')
    ? 'cgpa'
    : sortParam?.startsWith('exp')
    ? 'exp'
    : sortParam?.startsWith('name')
    ? 'name'
    : 'score'
  const initialSortOrder = sortParam?.endsWith('asc') ? 'asc' : 'desc'
  const [sortBy, setSortBy] = useState<'score' | 'cgpa' | 'exp' | 'name'>(initialSortBy)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder)
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = 12

  // Server-driven state for live mode (!USE_MOCK)
  const [serverCandidates, setServerCandidates] = useState<Candidate[]>([])
  const [serverTotal, setServerTotal] = useState<number>(0)
  const [isServerLoading, setIsServerLoading] = useState<boolean>(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [retryTrigger, setRetryTrigger] = useState<number>(0)

  // Debounce search query input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(textSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [textSearch])

  // Call api.getCandidates(params) on every filter, sort, page, or search change (debounced 300ms)
  useEffect(() => {
    if (USE_MOCK) return

    setIsServerLoading(true)
    setServerError(null)

    const timer = setTimeout(async () => {
      try {
        const queryParams: CandidateFilterParams = {
          page,
          page_size: pageSize,
        }
        if (debouncedQuery.trim()) queryParams.q = debouncedQuery.trim()
        if (minCgpa > 0) queryParams.cgpa_min = minCgpa
        if (minTenth > 0) queryParams.tenth_min = minTenth
        if (minTwelfth > 0) queryParams.twelfth_min = minTwelfth
        if (minExp > 0 || searchParams.has('exp_min')) queryParams.exp_min = minExp
        if (maxExp < 10 || searchParams.has('exp_max')) queryParams.exp_max = maxExp
        if (selectedCity && selectedCity !== 'All') queryParams.city = selectedCity
        if (selectedBatch) queryParams.grad_year = selectedBatch
        if (includeUnknown) queryParams.include_unknown = true

        const skillsAll = skillFilters.filter((s) => s.mode === 'all').map((s) => s.name)
        const skillsAny = skillFilters.filter((s) => s.mode === 'any').map((s) => s.name)
        const skillsNone = skillFilters.filter((s) => s.mode === 'none').map((s) => s.name)
        if (skillsAll.length > 0) queryParams.skills_all = skillsAll
        if (skillsAny.length > 0) queryParams.skills_any = skillsAny
        if (skillsNone.length > 0) queryParams.skills_none = skillsNone

        if (sortBy === 'cgpa') queryParams.sort = sortOrder === 'asc' ? 'cgpa_asc' : 'cgpa_desc'
        else if (sortBy === 'exp') queryParams.sort = sortOrder === 'asc' ? 'exp_asc' : 'exp_desc'
        else if (sortBy === 'name') queryParams.sort = sortOrder === 'desc' ? 'name_desc' : 'name_asc'
        else if (sortBy === 'score') queryParams.sort = sortOrder === 'asc' ? 'score_asc' : 'score_desc'
        else queryParams.sort = 'cgpa_desc'

        const res = await api.getCandidates(queryParams)
        setServerCandidates(res.items)
        setServerTotal(res.total)
      } catch (err: any) {
        setServerError(`Failed to fetch candidates: ${err?.message || 'Server error'}`)
      } finally {
        setIsServerLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
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
    skillFilters,
    sortBy,
    sortOrder,
    page,
    pageSize,
    retryTrigger,
  ])

  // Column visibility state (including custom fields)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    company.settings.customFields.forEach((cf) => {
      initial[cf.id] = true
    })
    return initial
  })

  // Candidate Drawer state & Edit mode
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerCandidate, setDrawerCandidate] = useState<Candidate | null>(null)
  const [isDrawerEditing, setIsDrawerEditing] = useState(false)

  // Drawer Form fields
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editCollege, setEditCollege] = useState('')
  const [editDegree, setEditDegree] = useState('')
  const [editCgpa, setEditCgpa] = useState<number>(0)
  const [editTenth, setEditTenth] = useState<number>(0)
  const [editTwelfth, setEditTwelfth] = useState<number>(0)
  const [editExp, setEditExp] = useState<number>(0)
  const [editSkills, setEditSkills] = useState('')

  const openCandidateDrawer = (cand: Candidate) => {
    setDrawerCandidate(cand)
    setEditName(cand.name)
    setEditEmail(cand.email)
    setEditPhone(cand.phone)
    setEditLocation(cand.location)
    setEditCollege(cand.college)
    setEditDegree(cand.degree)
    setEditCgpa(cand.cgpa ?? 0)
    setEditTenth(cand.tenthPercent ?? 0)
    setEditTwelfth(cand.twelfthPercent ?? 0)
    setEditExp(cand.experienceYears ?? 0)
    setEditSkills(cand.skills.join(', '))
    setIsDrawerEditing(false)
    setDrawerOpen(true)
  }

  const handleSaveDrawerEdit = () => {
    if (!drawerCandidate) return
    const parsedSkills = editSkills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const updates: Partial<Candidate> = {
      name: editName,
      email: editEmail,
      phone: editPhone,
      location: editLocation,
      college: editCollege,
      degree: editDegree,
      cgpa: editCgpa,
      tenthPercent: editTenth,
      twelfthPercent: editTwelfth,
      experienceYears: editExp,
      skills: parsedSkills.length > 0 ? parsedSkills : drawerCandidate.skills,
    }

    useAppStore.getState().updateCandidate(drawerCandidate.id, updates)
    api.patchCandidate(drawerCandidate.id, updates).catch(() => {})
    setDrawerCandidate({ ...drawerCandidate, ...updates })
    setIsDrawerEditing(false)
    toast.success('Candidate profile updated in real-time!')
  }
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
        if (!map.has(app.candidateId) || (app.matchScore ?? 0) > (map.get(app.candidateId)?.matchScore ?? 0)) {
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
    companyCandidates.forEach((c) => {
      if (c.gradYear != null && c.gradYear > 0) set.add(c.gradYear)
    })
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

    if (sortBy === 'cgpa') params.set('sort', sortOrder === 'asc' ? 'cgpa_asc' : 'cgpa_desc')
    else if (sortBy === 'exp') params.set('sort', sortOrder === 'asc' ? 'exp_asc' : 'exp_desc')
    else if (sortBy === 'name') params.set('sort', sortOrder === 'desc' ? 'name_desc' : 'name_asc')
    else if (sortBy === 'score') params.set('sort', sortOrder === 'asc' ? 'score_asc' : 'score_desc')

    if (page > 1) params.set('page', String(page))

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true })
    }
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
    sortBy,
    sortOrder,
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
      const isUnknownCgpa = cand.cgpa == null || cand.cgpa <= 0
      const isUnknownExp = cand.experienceYears == null || cand.experienceYears < 0
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
      if (minCgpa > 0 && !isUnknownCgpa && (cand.cgpa == null || cand.cgpa < minCgpa)) return false
      if (minTenth > 0 && (cand.tenthPercent == null || cand.tenthPercent < minTenth)) return false
      if (minTwelfth > 0 && (cand.twelfthPercent == null || cand.twelfthPercent < minTwelfth)) return false

      // Experience Range
      if (minExp > 0 && !isUnknownExp && (cand.experienceYears == null || cand.experienceYears < minExp)) return false
      if (maxExp < 10 && cand.experienceYears != null && cand.experienceYears > maxExp) return false

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
      else if (sortBy === 'cgpa') result = (a.cgpa ?? 0) - (b.cgpa ?? 0)
      else if (sortBy === 'exp') result = (a.experienceYears ?? 0) - (b.experienceYears ?? 0)
      else if (sortBy === 'name') result = a.name.localeCompare(b.name)

      return sortOrder === 'desc' ? -result : result
    })
  }, [filteredCandidates, candidateAppMap, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(sortedCandidates.length / pageSize) || 1
  const paginatedCandidates = sortedCandidates.slice((page - 1) * pageSize, page * pageSize)

  // In live mode, candidates and total come directly from API
  // In mock mode, candidates come from in-browser filtering of store
  const candidatesToRender = USE_MOCK ? paginatedCandidates : serverCandidates
  const totalCandidateCount = USE_MOCK ? sortedCandidates.length : serverTotal
  const effectiveTotalPages = USE_MOCK ? totalPages : Math.max(1, Math.ceil(serverTotal / pageSize))

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedCandidateIds.length === candidatesToRender.length) {
      setSelectedCandidateIds([])
    } else {
      setSelectedCandidateIds(candidatesToRender.map((c) => c.id))
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

  const handleExportCSV = () => {
    const headers = [
      'Candidate ID',
      'Name',
      'Email',
      'Phone',
      'Location',
      'College',
      'Degree',
      'CGPA',
      '10th Percent',
      '12th Percent',
      'Experience (Years)',
      'Grad Year',
      'Skills',
      'Match Score',
      'Application Stage',
    ]

    const rows = filteredCandidates.map((c) => {
      const app = candidateAppMap.get(c.id)
      return [
        c.id,
        `"${c.name}"`,
        `"${c.email}"`,
        `"${c.phone}"`,
        `"${c.location}"`,
        `"${c.college}"`,
        `"${c.degree}"`,
        c.cgpa,
        c.tenthPercent,
        c.twelfthPercent,
        c.experienceYears,
        c.gradYear,
        `"${c.skills.join(', ')}"`,
        app?.matchScore !== undefined ? `${app.matchScore}%` : 'N/A',
        app?.stage || 'applied',
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `hireswift_candidates_${company.name.toLowerCase().replace(/\s+/g, '_')}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filteredCandidates.length} candidate profiles to CSV!`)
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
              aria-label="Target Pipeline Stage"
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text">Candidate Directory</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ⚡ 14ms latency
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            {totalCandidateCount} talent profiles {USE_MOCK ? `(${filteredCandidates.length} of ${companyCandidates.length} matched)` : 'in indexed pool'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export CSV Button */}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportCSV}
          >
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

      {/* Server Error State with Retry */}
      {serverError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-800 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{serverError}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRetryTrigger((k) => k + 1)}>
            Retry
          </Button>
        </div>
      )}

      {/* Search Bar & Active Filter Chips */}
      <div className="bg-white rounded-xl border border-border p-3 shadow-soft space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              aria-label="Search candidates by name, skill, or college"
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
                  aria-label="Include candidates with unknown values"
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
                aria-label="Minimum CGPA filter"
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
                  aria-label="Minimum 10th grade percentage"
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
                  aria-label="Minimum 12th grade percentage"
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
                  aria-label="Minimum Experience filter in years"
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
                aria-label="Filter by Candidate City"
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
                      <button onClick={handleSelectAll} aria-label="Select all candidates" className="p-0.5 text-muted hover:text-text">
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
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {isServerLoading ? (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-muted">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-medium">Fetching candidates from server...</span>
                        </div>
                      </td>
                    </tr>
                  ) : serverError ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-muted">
                        <div className="flex flex-col items-center justify-center gap-2 text-rose-700">
                          <AlertTriangle className="w-6 h-6 text-rose-500" />
                          <span className="text-sm font-semibold">{serverError}</span>
                          <Button variant="outline" size="sm" onClick={() => setRetryTrigger((k) => k + 1)}>
                            Retry
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : candidatesToRender.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8">
                        <EmptyState
                          title="No candidates match your criteria"
                          description="Try relaxing your skills, CGPA cutoff, or experience range filters."
                          action={
                            <Button variant="outline" size="sm" onClick={clearAllFilters}>
                              Clear All Filters
                            </Button>
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    candidatesToRender.map((candidate) => {
                      const app = candidateAppMap.get(candidate.id)
                      const isSelected = selectedCandidateIds.includes(candidate.id)
                      const isLowConfidence = candidate.parseConfidence < 70
                      const isDuplicate = Boolean(candidate.isDuplicate || duplicateCandidateIds.has(candidate.id))

                      return (
                        <tr
                          key={candidate.id}
                          onClick={() => navigate(`/app/candidates/${candidate.id}`)}
                          className={`hover:bg-gray-50/70 cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/30' : ''
                          }`}
                        >
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => toggleSelect(candidate.id)} aria-label={`Select candidate ${candidate.name}`} className="p-0.5 text-muted hover:text-text">
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
                                isBlind={isBlindMode}
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-text text-xs hover:text-primary">
                                    {isBlindMode ? `Candidate #${candidate.id}` : candidate.name}
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
                                  {isBlindMode
                                    ? '[Hidden College]'
                                    : candidate.college}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Academic CGPA (with amber highlight if low-confidence or missing) */}
                          <td className={`p-3 ${(candidate.cgpa == null || candidate.cgpa <= 0) ? 'bg-amber-50/40' : ''}`}>
                            <div className="font-semibold text-text">
                              {candidate.cgpa != null && candidate.cgpa > 0 ? (
                                `${candidate.cgpa} / 10`
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                  -
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted">
                              10th: {candidate.tenthPercent != null && candidate.tenthPercent > 0 ? `${candidate.tenthPercent}%` : <span className="text-amber-700 font-semibold">-</span>} • 12th: {candidate.twelfthPercent != null && candidate.twelfthPercent > 0 ? `${candidate.twelfthPercent}%` : <span className="text-amber-700 font-semibold">-</span>}
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
                          <td className={`p-3 ${(candidate.experienceYears == null || candidate.experienceYears < 0) ? 'bg-amber-50/40' : ''}`}>
                            <div className="font-medium text-text">
                              {candidate.experienceYears == null || candidate.experienceYears < 0 ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                  -
                                </span>
                              ) : candidate.experienceYears === 0 ? (
                                'Fresher'
                              ) : (
                                `${candidate.experienceYears} yrs`
                              )}
                            </div>
                            <div className="text-[10px] text-muted">
                              Batch {candidate.gradYear != null && candidate.gradYear > 0 ? candidate.gradYear : <span className="text-amber-700 font-semibold">-</span>}
                            </div>
                          </td>

                          {/* Location */}
                          <td className="p-3 text-muted">
                            {isBlindMode
                              ? '[Hidden Location]'
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

                          {/* Actions: Quick Edit in Drawer */}
                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                              onClick={() => openCandidateDrawer(candidate)}
                            >
                              <Edit className="w-3.5 h-3.5 mr-1" />
                              Quick Edit
                            </Button>
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
                Showing {totalCandidateCount === 0 ? 0 : (page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, totalCandidateCount)} of {totalCandidateCount} entries
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
                  Page {page} of {effectiveTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(effectiveTotalPages, p + 1))}
                  disabled={page >= effectiveTotalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CANDIDATE SLIDE-OVER DRAWER WITH EDIT MODE */}
      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={
          <div className="flex items-center justify-between gap-3 pr-6 w-full">
            <div className="flex items-center gap-2">
              <span className="font-bold text-text">
                {isDrawerEditing ? 'Edit Candidate Profile' : 'Candidate Overview'}
              </span>
              {drawerCandidate && drawerCandidate.parseConfidence < 70 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  ⚠️ Low Confidence ({drawerCandidate.parseConfidence}%)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isDrawerEditing ? 'outline' : 'secondary'}
                size="sm"
                onClick={() => setIsDrawerEditing(!isDrawerEditing)}
              >
                {isDrawerEditing ? 'Cancel' : 'Edit Mode'}
              </Button>
              {drawerCandidate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/app/candidates/${drawerCandidate.id}`)}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Full Profile
                </Button>
              )}
            </div>
          </div>
        }
        description="View and edit candidate details in-place"
        width="xl"
      >
        {drawerCandidate && (
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)]">
            {isDrawerEditing ? (
              /* EDIT MODE */
              <div className="space-y-4">
                <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-900">
                    ✏️ In-Place Profile Editing
                  </span>
                  <Button variant="primary" size="sm" onClick={handleSaveDrawerEdit}>
                    <Save className="w-3.5 h-3.5 mr-1" /> Save Changes
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">Full Name</label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">Email Address</label>
                    <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">Phone Number</label>
                    <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">Location / City</label>
                    <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">College / University</label>
                    <Input value={editCollege} onChange={(e) => setEditCollege(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">Degree</label>
                    <Input value={editDegree} onChange={(e) => setEditDegree(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">CGPA (10-point scale)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editCgpa || ''}
                      onChange={(e) => setEditCgpa(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">Total Experience (Years)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editExp || ''}
                      onChange={(e) => setEditExp(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">10th Board %</label>
                    <Input
                      type="number"
                      value={editTenth || ''}
                      onChange={(e) => setEditTenth(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">12th Board %</label>
                    <Input
                      type="number"
                      value={editTwelfth || ''}
                      onChange={(e) => setEditTwelfth(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text mb-1">Skills (comma-separated)</label>
                  <Input
                    value={editSkills}
                    onChange={(e) => setEditSkills(e.target.value)}
                    placeholder="React, TypeScript, Node.js..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => setIsDrawerEditing(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveDrawerEdit}>
                    <Save className="w-3.5 h-3.5 mr-1" />
                    Save & Update
                  </Button>
                </div>
              </div>
            ) : (
              /* VIEW MODE */
              <div className="space-y-6">
                {/* Header Profile Card */}
                <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-gray-50/50">
                  <Avatar name={drawerCandidate.name} size="lg" isBlind={isBlindMode} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-text truncate">
                        {isBlindMode ? 'Candidate #' + drawerCandidate.id : drawerCandidate.name}
                      </h2>
                      {Boolean(drawerCandidate.isDuplicate || duplicateCandidateIds.has(drawerCandidate.id)) && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Duplicate Found
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {isBlindMode ? '[Hidden College]' : drawerCandidate.college} • {drawerCandidate.degree}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted mt-2 flex-wrap">
                      <span>📍 {isBlindMode ? '[Hidden Location]' : drawerCandidate.location}</span>
                      <span>✉️ {isBlindMode ? '[Hidden Email]' : drawerCandidate.email}</span>
                      <span>📞 {isBlindMode ? '[Hidden Phone]' : drawerCandidate.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Academic & Experience Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted">CGPA</span>
                    <div className="text-lg font-bold text-text mt-1">
                      {drawerCandidate.cgpa != null ? (
                        <span>{drawerCandidate.cgpa} / 10</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-sm font-bold border border-amber-200">
                          -
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted">10th / 12th</span>
                    <div className="text-xs font-semibold text-text mt-1">
                      {drawerCandidate.tenthPercent != null ? `${drawerCandidate.tenthPercent}%` : '-'} /{' '}
                      {drawerCandidate.twelfthPercent != null ? `${drawerCandidate.twelfthPercent}%` : '-'}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted">Experience</span>
                    <div className="text-lg font-bold text-text mt-1">
                      {drawerCandidate.experienceYears != null ? (
                        drawerCandidate.experienceYears === 0 ? (
                          'Fresher'
                        ) : (
                          `${drawerCandidate.experienceYears}y`
                        )
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-sm font-bold border border-amber-200">
                          -
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Technical Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {drawerCandidate.skills.map((s) => (
                      <span key={s} className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Applications & Match Score */}
                {candidateAppMap.get(drawerCandidate.id) && (
                  <div className="p-4 rounded-xl border border-border bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted">Active Application</span>
                        <div className="text-xs font-bold text-text mt-0.5">
                          <StatusBadge stage={candidateAppMap.get(drawerCandidate.id)?.stage || 'applied'} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">Match Score</span>
                        <ScoreRing score={candidateAppMap.get(drawerCandidate.id)?.matchScore || 0} size="md" />
                      </div>
                    </div>
                    {candidateAppMap.get(drawerCandidate.id)?.explanation && (
                      <p className="text-xs text-muted bg-gray-50 p-2.5 rounded border border-gray-100">
                        {candidateAppMap.get(drawerCandidate.id)?.explanation}
                      </p>
                    )}
                  </div>
                )}

                {/* Resume Text Snippet */}
                {drawerCandidate.resumeText && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Resume Excerpt</h3>
                    <pre className="p-3 bg-gray-50 rounded-lg border border-border text-[11px] text-muted overflow-x-auto whitespace-pre-wrap font-mono max-h-48">
                      {drawerCandidate.resumeText.slice(0, 500)}...
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
