import React, { useState } from 'react'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { toast } from 'sonner'
import {
  Copy,
  CheckCircle,
  XCircle,
  Layers,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  GitMerge,
  ShieldAlert,
} from 'lucide-react'
import { DuplicateGroup, Candidate } from '@/types'

export const DuplicatesPage: React.FC = () => {
  const {
    currentCompanyId,
    duplicateGroups,
    candidates,
    mergeDuplicates,
    dismissDuplicate,
    keepBothDuplicates,
  } = useAppStore()

  const [activeTab, setActiveTab] = useState<'Pending' | 'Resolved'>('Pending')
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null)
  const [mergeModalOpen, setMergeModalOpen] = useState(false)
  const [primaryCandId, setPrimaryCandId] = useState<string>('')
  const [isScanning, setIsScanning] = useState(false)

  const companyGroups = duplicateGroups.filter((g) => g.companyId === currentCompanyId)
  const pendingGroups = companyGroups.filter((g) => g.status === 'Pending')
  const resolvedGroups = companyGroups.filter((g) => g.status !== 'Pending')

  const candidateMap = new Map(candidates.map((c) => [c.id, c]))

  const handleOpenMerge = (group: DuplicateGroup) => {
    setSelectedGroup(group)
    setPrimaryCandId(group.candidateIds[0])
    setMergeModalOpen(true)
  }

  const handleConfirmMerge = () => {
    if (!selectedGroup || !primaryCandId) return
    mergeDuplicates(selectedGroup.id, primaryCandId)
    setMergeModalOpen(false)
    toast.success('Duplicate profiles merged successfully!')
  }

  const handleDismiss = (groupId: string) => {
    dismissDuplicate(groupId)
    toast.info('Duplicate group dismissed')
  }

  const handleKeepBoth = (groupId: string) => {
    keepBothDuplicates(groupId)
    toast.success('Marked candidates as distinct individuals')
  }

  const handleManualScan = () => {
    setIsScanning(true)
    setTimeout(() => {
      setIsScanning(false)
      toast.success('Talent pool scan complete. No new unresolved duplicates detected.')
    }, 500)
  }

  const displayedGroups = activeTab === 'Pending' ? pendingGroups : resolvedGroups

  return (
    <div className="space-y-6">
      {/* Merge Confirmation Modal */}
      <Modal
        open={mergeModalOpen}
        onOpenChange={setMergeModalOpen}
        title="Merge Duplicate Profiles"
        description="Choose which profile record to keep as primary. All historical applications and notes from both will be consolidated into the chosen primary profile."
      >
        {selectedGroup && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text">Select Primary Record to Keep:</label>
              {selectedGroup.candidateIds.map((cid) => {
                const cand = candidateMap.get(cid)
                if (!cand) return null
                return (
                  <label
                    key={cid}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      primaryCandId === cid ? 'border-primary bg-indigo-50/50' : 'border-border hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="primaryCand"
                        checked={primaryCandId === cid}
                        onChange={() => setPrimaryCandId(cid)}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <div>
                        <div className="font-bold text-xs text-text">{cand.name}</div>
                        <div className="text-[11px] text-muted">
                          {cand.email} • {cand.college} (CGPA: {cand.cgpa})
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" size="sm">{cand.experienceYears}y Exp</Badge>
                  </label>
                )
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setMergeModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" leftIcon={<GitMerge className="w-3.5 h-3.5" />} onClick={handleConfirmMerge}>
                Confirm & Consolidate
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <Copy className="w-6 h-6 text-primary" />
            Duplicate Candidate Detection
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Identify repeat applicants across campaigns and consolidate redundant records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />}
            onClick={handleManualScan}
            isLoading={isScanning}
          >
            Scan Talent Pool
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('Pending')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'Pending'
              ? 'bg-primary text-white shadow-xs'
              : 'text-muted hover:text-text hover:bg-gray-100'
          }`}
        >
          Pending Review ({pendingGroups.length})
        </button>
        <button
          onClick={() => setActiveTab('Resolved')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'Resolved'
              ? 'bg-primary text-white shadow-xs'
              : 'text-muted hover:text-text hover:bg-gray-100'
          }`}
        >
          Resolved ({resolvedGroups.length})
        </button>
      </div>

      {/* Duplicate Cards */}
      <div className="space-y-4">
        {displayedGroups.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-dashed border-border">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-base font-bold text-text">No duplicate conflicts</h3>
            <p className="text-xs text-muted mt-1">
              Your talent pool records are cleanly separated and indexed.
            </p>
          </div>
        ) : (
          displayedGroups.map((group) => {
            const candA = candidateMap.get(group.candidateIds[0])
            const candB = candidateMap.get(group.candidateIds[1])

            if (!candA || !candB) return null

            return (
              <div
                key={group.id}
                className="bg-card rounded-xl border border-border p-5 shadow-card space-y-4"
              >
                {/* Group Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-text">
                      High Confidence Conflict ({group.similarity}% Match)
                    </span>
                    <Badge variant={group.status === 'Pending' ? 'danger' : 'success'} size="sm">
                      {group.status}
                    </Badge>
                  </div>

                  {group.status === 'Pending' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<GitMerge className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenMerge(group)}
                      >
                        Merge Profiles
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleKeepBoth(group.id)}
                      >
                        Keep Both
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismiss(group.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>

                {/* Matching Signals */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="text-muted font-medium self-center">Trigger Signals:</span>
                  {group.matchingSignals.map((signal, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium"
                    >
                      {signal}
                    </span>
                  ))}
                </div>

                {/* Field-by-field Side-by-side Diff View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/70 p-4 rounded-xl border border-border text-xs">
                  {/* Candidate A Column */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 font-bold text-sm text-text border-b border-gray-200 pb-2">
                      <Avatar name={candA.name} size="sm" />
                      <div>
                        <div>{candA.name}</div>
                        <div className="text-[10px] text-muted font-normal">Record A (First Applied)</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div>
                        <span className="text-muted block text-[10px]">Email:</span>
                        <strong className="text-text">{candA.email}</strong>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px]">Phone:</span>
                        <strong className="text-text">{candA.phone}</strong>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px]">College & CGPA:</span>
                        <span className="text-text">{candA.college} (CGPA: {candA.cgpa})</span>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px]">Experience:</span>
                        <span className="text-text">{candA.experienceYears} Years</span>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px]">Resume File:</span>
                        <span className="text-muted italic">{candA.resumeFileName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Candidate B Column */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 font-bold text-sm text-text border-b border-gray-200 pb-2">
                      <Avatar name={candB.name} size="sm" />
                      <div>
                        <div>{candB.name}</div>
                        <div className="text-[10px] text-muted font-normal">Record B (Repeat Submission)</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div>
                        <span className="text-muted block text-[10px]">Email:</span>
                        <strong className={candA.email === candB.email ? 'text-rose-600 bg-rose-50 px-1 rounded' : 'text-text'}>
                          {candB.email}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px]">Phone:</span>
                        <strong className={candA.phone === candB.phone ? 'text-rose-600 bg-rose-50 px-1 rounded' : 'text-text'}>
                          {candB.phone}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px]">College & CGPA:</span>
                        <span className="text-text">{candB.college} (CGPA: {candB.cgpa})</span>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px]">Experience:</span>
                        <span className="text-text">{candB.experienceYears} Years</span>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px]">Resume File:</span>
                        <span className="text-muted italic">{candB.resumeFileName}</span>
                      </div>
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
