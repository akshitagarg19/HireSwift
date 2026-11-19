import React, { useState } from 'react'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'
import {
  Building2,
  Users,
  Sliders,
  Layers,
  Database,
  FileCode2,
  ShieldAlert,
  History,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Check,
  Save,
  Download,
} from 'lucide-react'
import { Role, CustomFieldType } from '@/types'

export const SettingsPage: React.FC = () => {
  const {
    currentCompanyId,
    currentUser,
    companies,
    users,
    candidates,
    auditLogs,
    updateCompany,
    updateCompanySettings,
    inviteTeamMember,
    updateTeamMemberRole,
    removeTeamMember,
    resetSeedData,
  } = useAppStore()

  const company = companies.find((c) => c.id === currentCompanyId) || companies[0]
  const companyUsers = users.filter((u) => u.companyId === currentCompanyId)
  const companyAuditLogs = auditLogs.filter((a) => a.companyId === currentCompanyId)

  const [activeSection, setActiveSection] = useState<
    'company' | 'team' | 'weights' | 'pipeline' | 'fields' | 'synonyms' | 'privacy' | 'audit'
  >('company')

  // Section 1: Company Profile State
  const [compName, setCompName] = useState(company.name)
  const [compIndustry, setCompIndustry] = useState(company.industry || '')

  // Section 2: Team Invite State
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('Recruiter')

  // Section 3: Scoring Weights State
  const [weights, setWeights] = useState({ ...company.settings.scoringWeights })
  const [learnDecisions, setLearnDecisions] = useState(company.settings.learnFromDecisions)

  // Section 4: Pipeline Stages State
  const [stages, setStages] = useState([...company.settings.pipelineStages])
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('#6366F1')

  // Section 5: Custom Fields State
  const [customFields, setCustomFields] = useState([...company.settings.customFields])
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text')

  // Section 6: Skill Synonyms State
  const [synonyms, setSynonyms] = useState({ ...company.settings.skillSynonyms })
  const [newCanonical, setNewCanonical] = useState('')
  const [newSynonymsInput, setNewSynonymsInput] = useState('')

  // Section 7: Privacy State
  const [retentionDays, setRetentionDays] = useState(company.settings.retentionDays || 180)

  // Reset confirmation
  const [resetDialogOpen, setResetDialogOpenOpen] = useState(false)

  // Handlers
  const handleSaveCompanyProfile = (e: React.FormEvent) => {
    e.preventDefault()
    updateCompany(company.id, { name: compName, industry: compIndustry })
    toast.success('Company profile updated')
  }

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteName || !inviteEmail) {
      toast.error('Fill in all fields')
      return
    }
    inviteTeamMember(inviteName, inviteEmail, inviteRole)
    setInviteModalOpen(false)
    setInviteName('')
    setInviteEmail('')
    toast.success(`Invite sent to ${inviteEmail}`)
  }

  const handleApplyWeightPreset = (preset: 'fresher' | 'experienced' | 'balanced') => {
    let presetWeights = { skills: 45, experience: 30, education: 10, semantic: 15 }
    if (preset === 'fresher') {
      presetWeights = { skills: 20, experience: 5, education: 60, semantic: 15 }
    } else if (preset === 'balanced') {
      presetWeights = { skills: 35, experience: 20, education: 30, semantic: 15 }
    }
    setWeights(presetWeights)
    updateCompanySettings(company.id, {
      scoringWeights: presetWeights,
    })
    toast.success(`Applied ${preset.toUpperCase()} weight preset! All candidates re-ranked.`)
  }

  const handleSaveWeights = () => {
    updateCompanySettings(company.id, {
      scoringWeights: weights,
      learnFromDecisions: learnDecisions,
    })
    toast.success('Scoring weights saved! Rankings updated live.')
  }

  const handleAddStage = () => {
    if (!newStageName.trim()) return
    const newStage = {
      id: `stage-${Date.now()}`,
      name: newStageName.trim(),
      color: newStageColor,
    }
    const updated = [...stages, newStage]
    setStages(updated)
    updateCompanySettings(company.id, { pipelineStages: updated })
    setNewStageName('')
    toast.success(`Added pipeline stage "${newStage.name}"`)
  }

  const handleDeleteStage = (stageId: string) => {
    if (stages.length <= 3) {
      toast.error('Pipeline requires at least 3 stages.')
      return
    }
    const updated = stages.filter((s) => s.id !== stageId)
    setStages(updated)
    updateCompanySettings(company.id, { pipelineStages: updated })
    toast.info('Stage removed from pipeline')
  }

  const handleAddCustomField = () => {
    if (!newFieldName.trim()) return
    const newField = {
      id: `cf-${Date.now()}`,
      name: newFieldName.trim(),
      type: newFieldType,
    }
    const updated = [...customFields, newField]
    setCustomFields(updated)
    updateCompanySettings(company.id, { customFields: updated })
    setNewFieldName('')
    toast.success(`Created custom field: ${newField.name}`)
  }

  const handleAddSynonymGroup = () => {
    if (!newCanonical.trim() || !newSynonymsInput.trim()) return
    const synList = newSynonymsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const updated = { ...synonyms, [newCanonical.trim()]: synList }
    setSynonyms(updated)
    updateCompanySettings(company.id, { skillSynonyms: updated })
    setNewCanonical('')
    setNewSynonymsInput('')
    toast.success(`Synonym map updated for "${newCanonical}"`)
  }

  const handleConfirmReset = () => {
    resetSeedData()
    setResetDialogOpenOpen(false)
    toast.success('Workspace reset to initial clean demo data.')
  }

  const navSections = [
    { id: 'company' as const, label: 'Company Profile', icon: Building2 },
    { id: 'team' as const, label: 'Team & Permissions', icon: Users },
    { id: 'weights' as const, label: 'Scoring Weights', icon: Sliders },
    { id: 'pipeline' as const, label: 'Pipeline Stages', icon: Layers },
    { id: 'fields' as const, label: 'Custom Fields', icon: FileCode2 },
    { id: 'synonyms' as const, label: 'Skill Synonyms', icon: Database },
    { id: 'privacy' as const, label: 'Data & Privacy', icon: ShieldAlert },
    { id: 'audit' as const, label: 'Audit Trail', icon: History },
  ]

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpenOpen}
        title="Reset All Workspace Seed Data?"
        description="This will clear your local storage modifications and restore the clean initial demo dataset with both companies and 120+ candidates."
        confirmText="Reset Everything"
        onConfirm={handleConfirmReset}
      />

      {/* Invite Member Modal */}
      <Modal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        title="Invite Teammate"
        description="Grant access to this hiring workspace with role-based permissions."
      >
        <form onSubmit={handleInviteSubmit} className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Full Name</label>
            <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Work Email</label>
            <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="w-full h-8 px-2 text-xs rounded border border-border bg-white"
            >
              <option value="Admin">Admin (Full settings, team, and pipeline access)</option>
              <option value="Recruiter">Recruiter (Pipeline management, emailing, uploads)</option>
              <option value="HiringManager">Hiring Manager (Review candidates and scorecards)</option>
              <option value="Viewer">Viewer (Read-only access)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Send Invite
            </Button>
          </div>
        </form>
      </Modal>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Workspace Settings</h1>
          <p className="text-sm text-muted mt-0.5">
            Configure tenant rules, scoring criteria, pipeline stages, and security settings.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<RotateCcw className="w-3.5 h-3.5 text-rose-600" />}
          onClick={() => setResetDialogOpenOpen(true)}
        >
          Reset Demo Data
        </Button>
      </div>

      {/* Settings Grid Layout: Subnav + Content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Left Sub-navigation */}
        <aside className="bg-card rounded-xl border border-border p-2 shadow-soft space-y-1">
          {navSections.map((sec) => {
            const Icon = sec.icon
            const isActive = activeSection === sec.id
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left ${
                  isActive
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted hover:text-text hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{sec.label}</span>
              </button>
            )
          })}
        </aside>

        {/* Right Settings Content Area (3 cols) */}
        <div className="md:col-span-3 space-y-6">
          {/* 1. COMPANY PROFILE */}
          {activeSection === 'company' && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-soft space-y-4">
              <h2 className="text-base font-bold text-text">Company Information</h2>
              <form onSubmit={handleSaveCompanyProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Company Legal Name</label>
                  <Input value={compName} onChange={(e) => setCompName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Industry Domain</label>
                  <Input value={compIndustry} onChange={(e) => setCompIndustry(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Public Careers URL</label>
                  <div className="text-xs font-mono text-primary bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100">
                    {window.location.origin}/careers/{company.slug}
                  </div>
                </div>
                <Button type="submit" variant="primary" size="sm" leftIcon={<Save className="w-3.5 h-3.5" />}>
                  Save Changes
                </Button>
              </form>
            </div>
          )}

          {/* 2. TEAM & ROLES */}
          {activeSection === 'team' && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-text">Team Members & Access Control</h2>
                  <p className="text-xs text-muted">Manage recruiter and manager permissions.</p>
                </div>
                <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setInviteModalOpen(true)}>
                  Invite Teammate
                </Button>
              </div>

              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                {companyUsers.map((member) => (
                  <div key={member.id} className="p-3.5 flex items-center justify-between text-xs bg-white hover:bg-gray-50/50">
                    <div>
                      <div className="font-bold text-text">{member.name}</div>
                      <div className="text-muted text-[11px]">{member.email}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={member.role}
                        onChange={(e) => {
                          updateTeamMemberRole(member.id, e.target.value as Role)
                          toast.success(`Role updated for ${member.name}`)
                        }}
                        className="h-8 px-2 rounded border border-border bg-white text-xs font-semibold"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Recruiter">Recruiter</option>
                        <option value="HiringManager">Hiring Manager</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                      {companyUsers.length > 1 && (
                        <button
                          onClick={() => {
                            removeTeamMember(member.id)
                            toast.info(`Removed ${member.name}`)
                          }}
                          className="text-muted hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. SCORING WEIGHTS */}
          {activeSection === 'weights' && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-soft space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-text">Scoring Weights & Ranking Algorithm</h2>
                  <p className="text-xs text-muted">
                    Total must sum to 100%. Recomputes candidate rankings across all jobs.
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => handleApplyWeightPreset('fresher')}>
                    Fresher Preset
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleApplyWeightPreset('experienced')}>
                    Lateral Preset
                  </Button>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Skills Coverage Weight</span>
                    <span className="text-primary font-bold">{weights.skills}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={weights.skills}
                    onChange={(e) => setWeights({ ...weights, skills: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Experience Fit Weight</span>
                    <span className="text-primary font-bold">{weights.experience}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={weights.experience}
                    onChange={(e) => setWeights({ ...weights, experience: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Education & CGPA Weight</span>
                    <span className="text-primary font-bold">{weights.education}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={weights.education}
                    onChange={(e) => setWeights({ ...weights, education: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Semantic Cosine Match Weight</span>
                    <span className="text-primary font-bold">{weights.semantic}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={weights.semantic}
                    onChange={(e) => setWeights({ ...weights, semantic: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-text pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={learnDecisions}
                    onChange={(e) => setLearnDecisions(e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Learn from my decisions (Automatically refine weights based on shortlist / reject patterns)</span>
                </label>

                <Button variant="primary" size="sm" onClick={handleSaveWeights}>
                  Save & Re-rank All Applications
                </Button>
              </div>
            </div>
          )}

          {/* 4. PIPELINE STAGES */}
          {activeSection === 'pipeline' && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-soft space-y-4">
              <div>
                <h2 className="text-base font-bold text-text">Recruitment Stages</h2>
                <p className="text-xs text-muted">Customize the sequential Kanban columns for your organization.</p>
              </div>

              <div className="space-y-2">
                {stages.map((st, idx) => (
                  <div key={st.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-gray-50/50 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: st.color }} />
                      <span className="font-bold text-text">{st.name}</span>
                      <span className="text-[10px] text-muted">Order: {idx + 1}</span>
                    </div>
                    {!st.isDefault && (
                      <button onClick={() => handleDeleteStage(st.id)} className="text-muted hover:text-rose-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Input
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="New stage name (e.g. Bar Raiser Round)"
                  className="text-xs"
                />
                <Button variant="secondary" size="sm" onClick={handleAddStage}>
                  Add Stage
                </Button>
              </div>
            </div>
          )}

          {/* 5. CUSTOM FIELDS */}
          {activeSection === 'fields' && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-soft space-y-4">
              <div>
                <h2 className="text-base font-bold text-text">Custom Application Fields</h2>
                <p className="text-xs text-muted">Fields configured here appear on candidate dossiers and filter sidebars.</p>
              </div>

              <div className="space-y-2">
                {customFields.map((cf) => (
                  <div key={cf.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-gray-50/50 text-xs">
                    <div>
                      <span className="font-bold text-text">{cf.name}</span>
                      <span className="text-muted text-[11px] block">Type: {cf.type}</span>
                    </div>
                    <Badge variant="outline" size="sm">Active</Badge>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Input
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="e.g. Notice Period, Expected CTC"
                  className="text-xs"
                />
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
                  className="h-9 px-2 text-xs rounded border border-border bg-white"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="select">Dropdown Select</option>
                </select>
                <Button variant="secondary" size="sm" onClick={handleAddCustomField}>
                  Add Field
                </Button>
              </div>
            </div>
          )}

          {/* 6. SKILL SYNONYMS */}
          {activeSection === 'synonyms' && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-soft space-y-4">
              <div>
                <h2 className="text-base font-bold text-text">Skill Synonyms Dictionary</h2>
                <p className="text-xs text-muted">
                  Ensures candidates with abbreviations (e.g. JS, K8s, Py) receive full credit against job requirements.
                </p>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {Object.entries(synonyms).map(([canonical, syns]) => (
                  <div key={canonical} className="p-3 rounded-lg border border-border bg-gray-50/50 text-xs space-y-1">
                    <span className="font-bold text-text">{canonical}</span>
                    <div className="flex flex-wrap gap-1">
                      {syns.map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-white border border-border text-[10px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newCanonical}
                    onChange={(e) => setNewCanonical(e.target.value)}
                    placeholder="Canonical Skill (e.g. Rust)"
                    className="text-xs"
                  />
                  <Input
                    value={newSynonymsInput}
                    onChange={(e) => setNewSynonymsInput(e.target.value)}
                    placeholder="Synonyms comma-separated (e.g. rust-lang, rs)"
                    className="text-xs"
                  />
                </div>
                <Button variant="secondary" size="sm" onClick={handleAddSynonymGroup}>
                  Add Synonym Group
                </Button>
              </div>
            </div>
          )}

          {/* 7. DATA & PRIVACY */}
          {activeSection === 'privacy' && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-soft space-y-4">
              <h2 className="text-base font-bold text-text">Data Retention & Compliance</h2>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Candidate Data Retention Period</span>
                  <span className="text-primary font-bold">{retentionDays} Days</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="730"
                  step="30"
                  value={retentionDays}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    setRetentionDays(val)
                    updateCompanySettings(company.id, { retentionDays: val })
                  }}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-[11px] text-muted mt-1">
                  Resumes older than {retentionDays} days are scheduled for automated anonymization under Digital Personal Data Protection (DPDP) Act compliance.
                </p>
              </div>

              <div className="pt-4 border-t border-border">
                <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
                  Export Full Organization JSON Data
                </Button>
              </div>
            </div>
          )}

          {/* 8. AUDIT LOG */}
          {activeSection === 'audit' && (
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="p-4 border-b border-border bg-gray-50/50">
                <h3 className="text-sm font-bold text-text">System Audit Trail</h3>
                <p className="text-xs text-muted">Immutable log of configuration changes and stage transitions.</p>
              </div>

              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {companyAuditLogs.length === 0 ? (
                  <p className="p-6 text-center text-xs text-muted">No audit logs recorded.</p>
                ) : (
                  companyAuditLogs.map((log) => (
                    <div key={log.id} className="p-3 text-xs space-y-0.5 hover:bg-gray-50/50">
                      <div className="flex justify-between text-muted text-[10px]">
                        <span className="font-semibold text-text">{log.actorName}</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="font-semibold text-indigo-900">{log.action}</div>
                      <p className="text-muted text-[11px]">{log.details}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
