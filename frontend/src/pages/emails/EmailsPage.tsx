import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppStore } from '@/store'
import { api, USE_MOCK } from '@/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { toast } from 'sonner'
import {
  Mail,
  Send,
  Calendar,
  Eye,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import { EmailTemplate, Candidate, Job, Application } from '@/types'

const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tmpl-1',
    companyId: 'company-nova',
    name: 'Interview Invitation',
    subject: 'Interview Invitation: {{job_title}} at HireSwift Demo',
    body: 'Hi {{candidate_name}},\n\nWe were impressed by your background and would love to invite you for an interview for the {{job_title}} position.\n\nProposed Time: {{interview_date}}\n\nPlease let us know if this works for you.\n\nBest regards,\nHiring Team',
    type: 'Interview',
  },
  {
    id: 'tmpl-2',
    companyId: 'company-nova',
    name: 'Application Shortlisted',
    subject: 'Application Update: Shortlisted for {{job_title}}',
    body: 'Dear {{candidate_name}},\n\nGreat news! Your profile has been shortlisted for the {{job_title}} role at HireSwift Demo. Our recruitment team will be in touch shortly with next steps.\n\nBest regards,\nTalent Acquisition Team',
    type: 'Shortlist',
  },
  {
    id: 'tmpl-3',
    companyId: 'company-nova',
    name: 'Application Rejection',
    subject: 'Update on your application for {{job_title}}',
    body: 'Dear {{candidate_name}},\n\nThank you for taking the time to apply for the {{job_title}} position. While your qualifications are impressive, we have decided to move forward with other candidates at this time.\n\nWe wish you all the best in your search.\n\nBest regards,\nHiring Team',
    type: 'Rejection',
  },
]

export const EmailsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const {
    currentCompanyId,
    companies,
    candidates,
    jobs,
    applications,
    emailTemplates,
    emailLogs,
    sendEmail,
    addEmailTemplate,
    deleteEmailTemplate,
  } = useAppStore()

  // Live mode data state
  const [liveCandidates, setLiveCandidates] = useState<Candidate[]>([])
  const [liveJobs, setLiveJobs] = useState<Job[]>([])
  const [liveApplications, setLiveApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(!USE_MOCK)
  const [error, setError] = useState<string | null>(null)

  const fetchEmailData = useCallback(async () => {
    if (USE_MOCK) return
    setLoading(true)
    setError(null)
    try {
      const [candRes, jobRes, appRes] = await Promise.all([
        api.getCandidates({ page_size: 100 }),
        api.getJobs(),
        api.getApplications(),
      ])
      setLiveCandidates(candRes.items)
      setLiveJobs(jobRes)
      setLiveApplications(appRes)
    } catch (err: any) {
      setError(err?.message || 'Failed to load email recipients.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEmailData()
  }, [fetchEmailData])

  const company = USE_MOCK
    ? (companies.find((c) => c.id === currentCompanyId) || companies[0])
    : { id: 'company-nova', name: 'HireSwift Demo', domain: 'hireswift.demo' }

  const companyTemplates = USE_MOCK
    ? emailTemplates.filter((t) => t.companyId === currentCompanyId)
    : DEFAULT_EMAIL_TEMPLATES

  const companyCandidates = USE_MOCK
    ? candidates.filter((c) => c.companyId === currentCompanyId)
    : liveCandidates

  const companyJobs = USE_MOCK
    ? jobs.filter((j) => j.companyId === currentCompanyId)
    : liveJobs

  const activeApplications = USE_MOCK
    ? applications.filter((a) => a.companyId === currentCompanyId)
    : liveApplications

  // Recipients filter
  const recipientQuery = searchParams.get('recipientIds')
  const defaultRecipientIds = useMemo(() => {
    if (recipientQuery) return recipientQuery.split(',').filter(Boolean)
    return activeApplications
      .filter((a) => a.stage === 'shortlisted')
      .map((a) => a.candidateId)
  }, [recipientQuery, activeApplications])

  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>(defaultRecipientIds)

  useEffect(() => {
    if (defaultRecipientIds.length > 0 && selectedRecipientIds.length === 0) {
      setSelectedRecipientIds(defaultRecipientIds)
    }
  }, [defaultRecipientIds])

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(companyTemplates[0]?.id || '')

  // Email form fields
  const [subject, setSubject] = useState(companyTemplates[0]?.subject || '')
  const [body, setBody] = useState(companyTemplates[0]?.body || '')
  const [interviewDate, setInterviewDate] = useState('Next Tuesday at 2:00 PM IST')
  const [activePreviewIndex, setActivePreviewIndex] = useState(0)

  // Template Manager Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateType, setNewTemplateType] = useState<EmailTemplate['type']>('General')
  const [newTemplateSubject, setNewTemplateSubject] = useState('')
  const [newTemplateBody, setNewTemplateBody] = useState('')

  // Update subject and body when template changes
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const tpl = companyTemplates.find((t) => t.id === templateId)
    if (tpl) {
      setSubject(tpl.subject)
      setBody(tpl.body)
    }
  }

  // Insert variable tag into body
  const handleInsertTag = (tag: string) => {
    setBody((prev) => `${prev} {{${tag}}}`)
  }

  // Dynamic template variable replacement for live preview
  const getRenderedContent = (candidateId: string) => {
    const cand = companyCandidates.find((c) => c.id === candidateId)
    const candApp = applications.find((a) => a.candidateId === candidateId)
    const job = companyJobs.find((j) => j.id === candApp?.jobId) || companyJobs[0]

    const candName = cand?.name || 'Candidate'
    const jobTitle = job?.title || 'Open Position'
    const companyName = company.name

    const renderedSubject = subject
      .replace(/\{\{candidate_name\}\}/g, candName)
      .replace(/\{\{job_title\}\}/g, jobTitle)
      .replace(/\{\{company_name\}\}/g, companyName)
      .replace(/\{\{interview_date\}\}/g, interviewDate)

    const renderedBody = body
      .replace(/\{\{candidate_name\}\}/g, candName)
      .replace(/\{\{job_title\}\}/g, jobTitle)
      .replace(/\{\{company_name\}\}/g, companyName)
      .replace(/\{\{interview_date\}\}/g, interviewDate)

    return { renderedSubject, renderedBody, cand, job }
  }

  // Send action
  const handleSendEmails = () => {
    if (selectedRecipientIds.length === 0) {
      toast.error('Select at least one recipient.')
      return
    }

    selectedRecipientIds.forEach((candId) => {
      const { renderedSubject, renderedBody, cand } = getRenderedContent(candId)
      if (cand) {
        sendEmail({
          companyId: currentCompanyId,
          recipientEmail: cand.email,
          recipientName: cand.name,
          subject: renderedSubject,
          body: renderedBody,
          status: 'Sent',
        })
      }
    })

    toast.success(`Successfully dispatched ${selectedRecipientIds.length} emails!`)
  }

  const handleScheduleEmails = () => {
    if (selectedRecipientIds.length === 0) {
      toast.error('Select at least one recipient.')
      return
    }

    selectedRecipientIds.forEach((candId) => {
      const { renderedSubject, renderedBody, cand } = getRenderedContent(candId)
      if (cand) {
        sendEmail({
          companyId: currentCompanyId,
          recipientEmail: cand.email,
          recipientName: cand.name,
          subject: renderedSubject,
          body: renderedBody,
          status: 'Scheduled',
          scheduledFor: new Date(Date.now() + 86400000).toISOString(),
        })
      }
    })

    toast.success(`Scheduled ${selectedRecipientIds.length} emails for tomorrow at 9:00 AM!`)
  }

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTemplateName || !newTemplateSubject || !newTemplateBody) {
      toast.error('Fill in all template fields.')
      return
    }

    addEmailTemplate({
      companyId: currentCompanyId,
      name: newTemplateName,
      type: newTemplateType,
      subject: newTemplateSubject,
      body: newTemplateBody,
    })

    setIsTemplateModalOpen(false)
    setNewTemplateName('')
    setNewTemplateSubject('')
    setNewTemplateBody('')
    toast.success('New email template saved!')
  }

  const activeRecipientId = selectedRecipientIds[activePreviewIndex] || selectedRecipientIds[0]
  const preview = activeRecipientId ? getRenderedContent(activeRecipientId) : null
  const companyLogs = emailLogs.filter((l) => l.companyId === currentCompanyId)

  return (
    <div className="space-y-6">
      {/* Create Template Modal */}
      <Modal
        open={isTemplateModalOpen}
        onOpenChange={setIsTemplateModalOpen}
        title="Create Email Template"
        description="Add a reusable message template with variables."
      >
        <form onSubmit={handleCreateTemplate} className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Template Name</label>
            <Input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="e.g. HR Discussion Round"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Template Category</label>
            <select
              value={newTemplateType}
              onChange={(e) => setNewTemplateType(e.target.value as any)}
              className="w-full h-8 px-2 text-xs rounded border border-border bg-white text-text"
            >
              <option value="Shortlist">Shortlist</option>
              <option value="Interview">Interview</option>
              <option value="Offer">Offer</option>
              <option value="Rejection">Rejection</option>
              <option value="General">General</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Subject</label>
            <Input
              value={newTemplateSubject}
              onChange={(e) => setNewTemplateSubject(e.target.value)}
              placeholder="Invitation: Interview for {{job_title}}"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Message Body</label>
            <Textarea
              value={newTemplateBody}
              onChange={(e) => setNewTemplateBody(e.target.value)}
              placeholder="Dear {{candidate_name}}, ..."
              rows={6}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setIsTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Template
            </Button>
          </div>
        </form>
      </Modal>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Email Communications & Automation</h1>
          <p className="text-sm text-muted mt-0.5">
            Send bulk interview invitations, shortlists, or updates with dynamic candidate variables.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsTemplateModalOpen(true)}
        >
          New Template
        </Button>
      </div>

      {/* Error State with Retry */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-800 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchEmailData}>
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Composer & Templates (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-4">
            {/* Template Selector & Quick Tags */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-text mb-1">Load Email Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-white text-xs font-medium text-text"
                >
                  {companyTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">Interview Time Slot</label>
                <Input
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Variable Chips */}
            <div>
              <span className="text-[11px] font-semibold text-muted block mb-1">
                Insert Dynamic Tag:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['candidate_name', 'job_title', 'company_name', 'interview_date'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleInsertTag(tag)}
                    className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                  >
                    + &#123;&#123;{tag}&#125;&#125;
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Email Subject *</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject with {{job_title}}..."
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Message Body *</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={9}
                placeholder="Write message with variable tags..."
              />
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted">
                <strong>{selectedRecipientIds.length}</strong> recipient(s) targeted
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Calendar className="w-3.5 h-3.5" />}
                  onClick={handleScheduleEmails}
                >
                  Schedule Later
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                  onClick={handleSendEmails}
                >
                  Send to {selectedRecipientIds.length} Candidates
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Recipient Preview & Selector (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-text uppercase tracking-wider">Live Preview</h3>
              </div>
              {selectedRecipientIds.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={activePreviewIndex === 0}
                    onClick={() => setActivePreviewIndex(activePreviewIndex - 1)}
                    className="px-2 py-0.5 rounded text-xs border border-border disabled:opacity-40"
                  >
                    ←
                  </button>
                  <span className="text-[11px] text-muted">
                    {activePreviewIndex + 1} of {selectedRecipientIds.length}
                  </span>
                  <button
                    disabled={activePreviewIndex >= selectedRecipientIds.length - 1}
                    onClick={() => setActivePreviewIndex(activePreviewIndex + 1)}
                    className="px-2 py-0.5 rounded text-xs border border-border disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
              )}
            </div>

            {/* Rendered Preview Card */}
            {preview ? (
              <div className="p-4 bg-gray-50 rounded-lg border border-border space-y-3">
                <div className="text-xs border-b border-gray-200 pb-2">
                  <div className="text-muted text-[10px]">TO:</div>
                  <div className="font-semibold text-text">
                    {preview.cand?.name} &lt;{preview.cand?.email}&gt;
                  </div>
                  <div className="text-muted text-[10px] mt-1">SUBJECT:</div>
                  <div className="font-bold text-indigo-900">{preview.renderedSubject}</div>
                </div>

                <div className="text-xs text-text whitespace-pre-line leading-relaxed font-sans max-h-64 overflow-y-auto">
                  {preview.renderedBody}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted p-4 text-center">No recipient selected for preview.</p>
            )}

            {/* Recipients Checklist */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span>Select Recipients ({selectedRecipientIds.length})</span>
                <button
                  onClick={() => {
                    if (selectedRecipientIds.length === companyCandidates.length) {
                      setSelectedRecipientIds([])
                    } else {
                      setSelectedRecipientIds(companyCandidates.map((c) => c.id))
                    }
                  }}
                  className="text-primary hover:underline text-[11px]"
                >
                  {selectedRecipientIds.length === companyCandidates.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 p-1">
                {companyCandidates.length === 0 ? (
                  <EmptyState
                    title="No Candidates Available"
                    description="Upload resumes to populate the candidate outreach list."
                  />
                ) : (
                  companyCandidates.slice(0, 25).map((c) => {
                    const isChecked = selectedRecipientIds.includes(c.id)
                    return (
                      <label key={c.id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedRecipientIds([...selectedRecipientIds, c.id])
                              else setSelectedRecipientIds(selectedRecipientIds.filter((id) => id !== c.id))
                            }}
                            className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span className="font-medium">{c.name}</span>
                        </div>
                        <span className="text-[10px] text-muted">{c.college}</span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Send History Log */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-sm font-bold text-text">Dispatched & Scheduled Communications</h3>
            <p className="text-xs text-muted">Auditable log of outgoing emails sent to applicants.</p>
          </div>
          <Badge variant="outline" size="sm">{companyLogs.length} Records</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-gray-50 text-muted font-semibold">
                <th className="p-3">Recipient</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Status</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companyLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted">
                    No emails dispatched in this session yet.
                  </td>
                </tr>
              ) : (
                companyLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-semibold text-text">
                      {log.recipientName}
                      <span className="text-muted font-normal block text-[11px]">{log.recipientEmail}</span>
                    </td>
                    <td className="p-3 max-w-xs truncate">{log.subject}</td>
                    <td className="p-3">
                      <Badge variant={log.status === 'Sent' ? 'success' : 'warning'} size="sm">
                        {log.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted text-[11px]">
                      {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
