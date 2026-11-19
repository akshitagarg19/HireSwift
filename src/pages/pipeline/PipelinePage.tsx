import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
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
import { Search, Filter, Undo2, MapPin, Briefcase } from 'lucide-react'
import { Candidate, Application } from '@/types'

// Draggable Kanban Card Component
interface KanbanCardProps {
  application: Application
  candidate: Candidate
  onClick: () => void
}

const KanbanCard: React.FC<KanbanCardProps> = ({ application, candidate, onClick }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: application.id,
    data: { application, candidate },
  })
  const { companies, currentCompanyId } = useAppStore()
  const company = companies.find((c) => c.id === currentCompanyId) || companies[0]

  const displayName = company.settings.blindMode ? `Candidate #${candidate.id.slice(-4)}` : candidate.name
  const displayCollege = company.settings.blindMode && company.settings.hiddenFields.includes('college')
    ? '[Hidden College]'
    : candidate.college

  // Calculate days in stage
  const daysInStage = Math.max(1, Math.floor((Date.now() - new Date(application.createdAt).getTime()) / 86400000))

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`bg-white rounded-xl border border-border p-3.5 shadow-soft hover:shadow-card hover:border-indigo-200 transition-all cursor-grab active:cursor-grabbing space-y-2.5 ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={candidate.name} size="sm" isBlind={company.settings.blindMode} />
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-text truncate">{displayName}</h4>
            <p className="text-[11px] text-muted truncate">{displayCollege}</p>
          </div>
        </div>
        <ScoreRing score={application.matchScore} size="sm" />
      </div>

      <div className="flex flex-wrap gap-1">
        {candidate.skills.slice(0, 2).map((s) => (
          <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-700 font-medium">
            {s}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted pt-2 border-t border-gray-100">
        <span>CGPA: <strong className="text-text">{candidate.cgpa}</strong></span>
        <span>{daysInStage}d in stage</span>
      </div>
    </div>
  )
}

// Droppable Kanban Column Component
interface KanbanColumnProps {
  stage: { id: string; name: string; color: string }
  applications: { application: Application; candidate: Candidate }[]
  onCardClick: (candidateId: string) => void
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ stage, applications, onCardClick }) => {
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
        <Badge variant="secondary" size="sm">
          {applications.length}
        </Badge>
      </div>

      {/* Column Cards */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        {applications.length === 0 ? (
          <div className="h-28 flex items-center justify-center text-xs text-muted/60 border border-dashed border-gray-200 rounded-lg">
            Drop candidate here
          </div>
        ) : (
          applications.map(({ application, candidate }) => (
            <KanbanCard
              key={application.id}
              application={application}
              candidate={candidate}
              onClick={() => onCardClick(candidate.id)}
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
    updateApplicationStage,
  } = useAppStore()

  const company = companies.find((c) => c.id === currentCompanyId) || companies[0]
  const stages = company.settings.pipelineStages
  const companyJobs = jobs.filter((j) => j.companyId === currentCompanyId)

  const [selectedJobId, setSelectedJobId] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [activeDragItem, setActiveDragItem] = useState<{
    application: Application
    candidate: Candidate
  } | null>(null)

  // Reject Reason Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [pendingRejectAppId, setPendingRejectAppId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('Technical skills not aligned')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const candidateMap = new Map(candidates.map((c) => [c.id, c]))

  // Filter applications by company, job, and search
  const filteredApps = applications.filter((app) => {
    if (app.companyId !== currentCompanyId) return false
    if (selectedJobId !== 'all' && app.jobId !== selectedJobId) return false
    if (search.trim()) {
      const cand = candidateMap.get(app.candidateId)
      if (!cand) return false
      const q = search.toLowerCase()
      return (
        cand.name.toLowerCase().includes(q) ||
        cand.college.toLowerCase().includes(q) ||
        cand.skills.some((s) => s.toLowerCase().includes(q))
      )
    }
    return true
  })

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const foundApp = applications.find((a) => a.id === active.id)
    if (foundApp) {
      const cand = candidateMap.get(foundApp.candidateId)
      if (cand) setActiveDragItem({ application: foundApp, candidate: cand })
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragItem(null)

    if (!over) return

    const appId = String(active.id)
    const targetStageId = String(over.id)

    const app = applications.find((a) => a.id === appId)
    if (!app || app.stage === targetStageId) return

    const previousStage = app.stage

    // If moving to rejected, prompt for reason modal
    if (targetStageId === 'rejected') {
      setPendingRejectAppId(appId)
      setRejectModalOpen(true)
      return
    }

    // Move stage and provide Undo action toast
    updateApplicationStage(appId, targetStageId, 'Moved via Kanban drag and drop')

    toast.success(`Moved candidate to ${targetStageId.toUpperCase()}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          updateApplicationStage(appId, previousStage, 'Undo Kanban stage move')
          toast.info('Stage change undone')
        },
      },
    })
  }

  const handleConfirmReject = () => {
    if (!pendingRejectAppId) return
    updateApplicationStage(pendingRejectAppId, 'rejected', rejectReason)
    setRejectModalOpen(false)
    setPendingRejectAppId(null)
    toast.error('Candidate rejected with audit reason logged.')
  }

  return (
    <div className="space-y-4">
      {/* Reject Modal */}
      <Modal
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        title="Reason for Rejection"
        description="Please provide a recorded reason for candidate audit logging."
      >
        <div className="space-y-3 pt-2">
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Assessment score below cutoff / Culture fit"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmReject}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-border shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-text">Recruitment Pipeline Kanban</h1>
          <p className="text-xs text-muted mt-0.5">
            Drag candidates between stages to progress through the interview pipeline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Job Filter */}
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-muted" />
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-white text-xs font-semibold text-text"
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

      {/* Dnd Kanban Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
          {stages.map((stage) => {
            const stageApps = filteredApps
              .filter((app) => app.stage === stage.id)
              .map((app) => ({
                application: app,
                candidate: candidateMap.get(app.candidateId)!,
              }))
              .filter((item) => Boolean(item.candidate))

            return (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                applications={stageApps}
                onCardClick={(candId) => navigate(`/app/candidates/${candId}`)}
              />
            )
          })}
        </div>

        {/* Drag Overlay Preview */}
        <DragOverlay>
          {activeDragItem ? (
            <div className="w-72 bg-white rounded-xl border-2 border-primary p-3.5 shadow-modal cursor-grabbing">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={activeDragItem.candidate.name} size="sm" isBlind={company.settings.blindMode} />
                  <div>
                    <h4 className="text-xs font-bold text-text">
                      {company.settings.blindMode ? 'Candidate' : activeDragItem.candidate.name}
                    </h4>
                    <p className="text-[10px] text-muted">{activeDragItem.candidate.college}</p>
                  </div>
                </div>
                <ScoreRing score={activeDragItem.application.matchScore} size="sm" />
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
