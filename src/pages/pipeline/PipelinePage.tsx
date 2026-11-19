import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { api, ApiError } from '@/api'
import { isReadOnlyViewer } from '@/lib/permissions'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Avatar } from '@/components/ui/Avatar'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { toast } from 'sonner'
import { Search, Briefcase, ArrowRight, Mail } from 'lucide-react'
import { Candidate, Application } from '@/types'

// EXACTLY 5 PIPELINE COLUMNS PER PLAN
export const PIPELINE_STAGES = [
  { id: 'applied', name: 'Applied', color: '#2563EB' },
  { id: 'shortlisted', name: 'Shortlisted', color: '#7C3AED' },
  { id: 'interview', name: 'Interview', color: '#F59E0B' },
  { id: 'offer', name: 'Offer', color: '#16A34A' },
  { id: 'rejected', name: 'Rejected', color: '#DC2626' },
]

// Draggable Kanban Card Component
interface KanbanCardProps {
  application: Application
  candidate: Candidate
  onClick: () => void
  onMoveTo: (appId: string, currentStage: string, targetStage: string) => void
}

const KanbanCard: React.FC<KanbanCardProps> = ({ application, candidate, onClick, onMoveTo }) => {
  const { companies, currentCompanyId, currentUser } = useAppStore()
  const company = companies.find((c) => c.id === currentCompanyId) || companies[0]
  const isReadOnly = isReadOnlyViewer(currentUser?.role)

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: application.id,
    data: { application, candidate },
    disabled: isReadOnly,
  })

  const displayName = company.settings.blindMode ? `Candidate #${candidate.id.slice(-4)}` : candidate.name
  const displayCollege = company.settings.blindMode && company.settings.hiddenFields.includes('college')
    ? '[Hidden College]'
    : candidate.college

  const daysInStage = Math.max(1, Math.floor((Date.now() - new Date(application.createdAt).getTime()) / 86400000))

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bg-white rounded-xl border border-border p-3.5 shadow-soft hover:shadow-card hover:border-indigo-200 transition-all ${
        isReadOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
      } space-y-2.5 ${isDragging ? 'opacity-30' : ''}`}
    >
      <div className="flex items-start justify-between gap-2" onClick={onClick}>
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={candidate.name} size="sm" isBlind={company.settings.blindMode} />
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-text truncate hover:text-primary transition-colors">
              {displayName}
            </h4>
            <p className="text-[11px] text-muted truncate">{displayCollege}</p>
          </div>
        </div>
        <ScoreRing score={application.matchScore} size="sm" />
      </div>

      <div className="flex flex-wrap gap-1" onClick={onClick}>
        {candidate.skills.slice(0, 2).map((s) => (
          <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-700 font-medium">
            {s}
          </span>
        ))}
        {company.settings.customFields.length > 0 && candidate.customFields && (
          company.settings.customFields.slice(0, 2).map((cf) => {
            const val = candidate.customFields?.[cf.id]
            if (val === undefined || val === '') return null
            return (
              <span key={cf.id} className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 font-medium">
                {String(val)}
              </span>
            )
          })
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted pt-2 border-t border-gray-100">
        <span>CGPA: <strong className="text-text">{candidate.cgpa}</strong></span>
        <span>{daysInStage}d in stage</span>
      </div>

      {/* "Move to" Button / Dropdown per plan */}
      {!isReadOnly && (
        <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
          <span className="text-muted font-medium">Move to:</span>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onMoveTo(application.id, application.stage, e.target.value)
                e.target.value = ''
              }
            }}
            className="h-6 px-1.5 text-[10px] rounded border border-border bg-gray-50 hover:bg-white text-text font-semibold cursor-pointer"
          >
            <option value="" disabled>Select Stage...</option>
            {PIPELINE_STAGES.filter((st) => st.id !== application.stage).map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

// Droppable Kanban Column Component
interface KanbanColumnProps {
  stage: { id: string; name: string; color: string }
  applications: { application: Application; candidate: Candidate }[]
  onCardClick: (candidateId: string) => void
  onMoveTo: (appId: string, currentStage: string, targetStage: string) => void
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ stage, applications, onCardClick, onMoveTo }) => {
  const navigate = useNavigate()
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 bg-gray-50/80 rounded-xl border border-border shrink-0 max-h-[calc(100vh-220px)] transition-colors ${
        isOver ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-primary/10' : ''
      }`}
    >
      {/* Column Header */}
      <div className="p-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="text-xs font-bold text-text uppercase tracking-wider">{stage.name}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {stage.id === 'shortlisted' && applications.length > 0 && (
            <button
              type="button"
              title="Send bulk email to shortlisted candidates"
              onClick={() =>
                navigate(`/app/emails?recipientIds=${applications.map((a) => a.candidate.id).join(',')}`)
              }
              className="p-1 px-1.5 rounded text-primary hover:bg-primary/10 text-[10px] font-semibold flex items-center gap-1 border border-primary/20 transition-colors"
            >
              <Mail className="w-3 h-3" /> Email
            </button>
          )}
          <Badge variant="secondary" size="sm">
            {applications.length}
          </Badge>
        </div>
      </div>

      {/* Column Cards */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        {applications.length === 0 ? (
          <div className="h-28 flex items-center justify-center text-xs text-muted/60 border border-dashed border-gray-200 rounded-lg">
            No candidates
          </div>
        ) : (
          applications.map(({ application, candidate }) => (
            <KanbanCard
              key={application.id}
              application={application}
              candidate={candidate}
              onClick={() => onCardClick(candidate.id)}
              onMoveTo={onMoveTo}
            />
          ))
        )}
      </div>
    </div>
  )
}

export const PipelinePage: React.FC = () => {
  const navigate = useNavigate()
  const {
    currentCompanyId,
    companies,
    jobs,
    candidates,
    applications,
  } = useAppStore()

  const companyJobs = jobs.filter((j) => j.companyId === currentCompanyId)

  const [selectedJobId, setSelectedJobId] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [activeDragItem, setActiveDragItem] = useState<{
    application: Application
    candidate: Candidate
  } | null>(null)

  // Configure sensors for drag sensitivity
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Filter applications for current company and selected job
  const relevantApplications = applications.filter((app) => {
    if (app.companyId !== currentCompanyId) return false
    if (selectedJobId !== 'all' && app.jobId !== selectedJobId) return false
    return true
  })

  const candidateMap = new Map(candidates.map((c) => [c.id, c]))

  const filteredItems = relevantApplications
    .map((app) => ({
      application: app,
      candidate: candidateMap.get(app.candidateId)!,
    }))
    .filter((item) => {
      if (!item.candidate) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        item.candidate.name.toLowerCase().includes(q) ||
        item.candidate.college.toLowerCase().includes(q) ||
        item.candidate.skills.some((s) => s.toLowerCase().includes(q))
      )
    })

  const company = companies.find((c) => c.id === currentCompanyId) || companies[0]
  const stagesToRender = (company.settings?.pipelineStages && company.settings.pipelineStages.length > 0)
    ? company.settings.pipelineStages
    : PIPELINE_STAGES

  // Map into pipeline columns
  const columnData = stagesToRender.map((stage) => ({
    stage,
    applications: filteredItems.filter((item) => item.application.stage === stage.id),
  }))

  // Execute transition via API with rollback on invalid transition
  const handleStageTransition = async (appId: string, currentStage: string, targetStage: string) => {
    if (currentStage === targetStage) return

    try {
      // Calls POST /applications/{id}/move per contract
      await api.moveApplication(appId, targetStage, 'Updated via Pipeline Kanban')
      toast.success(`Candidate advanced to ${targetStage.toUpperCase()}`)
    } catch (err: any) {
      // On invalid transition: snap back and show server message
      toast.error(err.message || 'Invalid stage transition.')
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { application: Application; candidate: Candidate }
    if (data) {
      setActiveDragItem(data)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragItem(null)

    if (!over) return

    const appId = active.id as string
    const targetStageId = over.id as string
    const draggedItem = relevantApplications.find((a) => a.id === appId)
    if (!draggedItem) return

    handleStageTransition(appId, draggedItem.stage, targetStageId)
  }

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-border shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-text">Recruitment Pipeline Kanban</h1>
          <p className="text-xs text-muted mt-0.5">
            5-Stage Pipeline: Drag or use "Move to" button. Transitions are validated per contract.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Job Filter */}
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-muted" />
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-white text-xs font-semibold text-text cursor-pointer"
            >
              <option value="all">All Jobs ({companyJobs.length})</option>
              {companyJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-2.5" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate..."
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* 5-Column Kanban Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
          {columnData.map(({ stage, applications }) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              applications={applications}
              onCardClick={(candId) => navigate(`/app/candidates/${candId}`)}
              onMoveTo={handleStageTransition}
            />
          ))}
        </div>

        {/* Drag Overlay with snapping preview */}
        <DragOverlay>
          {activeDragItem ? (
            <div className="bg-white rounded-xl border-2 border-primary p-3.5 shadow-modal w-72 space-y-2 opacity-95 pointer-events-none rotate-1">
              <div className="flex items-center gap-2">
                <Avatar name={activeDragItem.candidate.name} size="sm" />
                <div>
                  <h4 className="text-xs font-bold text-text">{activeDragItem.candidate.name}</h4>
                  <p className="text-[11px] text-muted">{activeDragItem.candidate.college}</p>
                </div>
              </div>
              <div className="text-[11px] text-muted">
                Match Score: <strong>{activeDragItem.application.matchScore}%</strong>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
