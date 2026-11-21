import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, USE_MOCK, EmailSendResultItem } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'
import {
  Mail,
  Send,
  Calendar,
  Eye,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Copy,
  Download,
  ExternalLink,
  Info,
  XCircle,
} from 'lucide-react'
import { EmailTemplate, Candidate, Job, Application } from '@/types'

const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tmpl-1',
    companyId: 'company-nova',
    name: 'Interview Invitation',
    subject: 'Interview Invitation: {{job_title}} at {{company_name}}',
    body: 'Hi {{candidate_name}},\n\nWe were impressed by your background and would love to invite you for an interview for the {{job_title}} position.\n\nProposed Time: {{interview_date}}\n\nPlease let us know if this works for you.\n\nBest regards,\nHiring Team at {{company_name}}',
    type: 'Interview',
  },
  {
    id: 'tmpl-2',
    companyId: 'company-nova',
    name: 'Application Shortlisted',
    subject: 'Application Update: Shortlisted for {{job_title}}',
    body: 'Dear {{candidate_name}},\n\nGreat news! Your profile has been shortlisted for the {{job_title}} role at {{company_name}}. Our recruitment team will be in touch shortly with next steps.\n\nBest regards,\nTalent Acquisition Team',
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

interface LocalEmailLog {
  id: string
  recipientName: string
  recipientEmail: string
  subject: string
  status: 'Sent' | 'Failed' | 'Scheduled'
  error?: string
  sentAt: string
}

export const EmailsPage: React.FC = () => {
  const [searchParams] = useSearchParams()

  // Live mode data state (no seed store fallback)
  const [liveCandidates, setLiveCandidates] = useState<Candidate[]>([])
  const [liveJobs, setLiveJobs] = useState<Job[]>([])
  const [liveApplications, setLiveApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Job Filter
  const [selectedJobId, setSelectedJobId] = useState<string>('all')

  // Templates & Form State
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_EMAIL_TEMPLATES)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_EMAIL_TEMPLATES[0].id)
  const [subject, setSubject] = useState(DEFAULT_EMAIL_TEMPLATES[0].subject)
  const [body, setBody] = useState(DEFAULT_EMAIL_TEMPLATES[0].body)
  const [interviewDate, setInterviewDate] = useState('Next Tuesday at 2:00 PM IST')
  const [activePreviewIndex, setActivePreviewIndex] = useState(0)

  // Recipients
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([])

  // Modal & Dialog state
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateType, setNewTemplateType] = useState<EmailTemplate['type']>('General')
  const [newTemplateSubject, setNewTemplateSubject] = useState('')
  const [newTemplateBody, setNewTemplateBody] = useState('')

  // Results & Fallback Mode
  const [sendResults, setSendResults] = useState<EmailSendResultItem[] | null>(null)
  const [isFallbackMode, setIsFallbackMode] = useState(false)
  const [fallbackReason, setFallbackReason] = useState<string>('')

  // Local email logs persisted in localStorage
  const [emailLogs, setEmailLogs] = useState<LocalEmailLog[]>(() => {
    try {
      const stored = localStorage.getItem('hireswift_email_logs')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const saveEmailLogs = (newLogs: LocalEmailLog[]) => {
    setEmailLogs(newLogs)
    try {
      localStorage.setItem('hireswift_email_logs', JSON.stringify(newLogs))
    } catch {
      // Storage unavailable or full
    }
  }

  // Load API data
  const fetchEmailData = useCallback(async () => {
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

      const urlJob = searchParams.get('job_id')
      if (urlJob && jobRes.some((j) => j.id === urlJob)) {
        setSelectedJobId(urlJob)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load email recipients.')
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    fetchEmailData()
  }, [fetchEmailData])

  // Company Name helper
  const companyName = 'HireSwift Demo'

  // Filter candidates relevant to the selected job & shortlisted status
  const { eligibleCandidates, excludedWithoutEmailCount } = useMemo(() => {
    const apps = liveApplications.filter((a) => {
      if (selectedJobId !== 'all' && a.jobId !== selectedJobId) return false
      return a.stage === 'shortlisted'
    })

    const shortlistedCandidateIds = new Set(apps.map((a) => a.candidateId))
    const matching = liveCandidates.filter((c) => shortlistedCandidateIds.has(c.id))

    const validWithEmail: Candidate[] = []
    let withoutEmail = 0

    matching.forEach((c) => {
      if (c.email && c.email.trim().length > 0) {
        validWithEmail.push(c)
      } else {
        withoutEmail++
      }
    })

    return {
      eligibleCandidates: validWithEmail,
      excludedWithoutEmailCount: withoutEmail,
    }
  }, [liveApplications, liveCandidates, selectedJobId])

  // Default selected recipients to eligible shortlisted candidates
  useEffect(() => {
    const urlRecipientIds = searchParams.get('recipientIds')?.split(',').filter(Boolean)
    if (urlRecipientIds && urlRecipientIds.length > 0) {
      setSelectedRecipientIds(urlRecipientIds)
    } else {
      setSelectedRecipientIds(eligibleCandidates.map((c) => c.id))
    }
  }, [eligibleCandidates, searchParams])

  // Update subject and body when template changes
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const tpl = templates.find((t) => t.id === templateId)
    if (tpl) {
      setSubject(tpl.subject)
      setBody(tpl.body)
    }
  }

  // Insert variable tag into body
  const handleInsertTag = (tag: string) => {
    setBody((prev) => `${prev} {{${tag}}}`)
  }

  // Render content for a candidate
  const getRenderedContent = (candidateId: string) => {
    const cand = liveCandidates.find((c) => c.id === candidateId)
    const candApp = liveApplications.find((a) => a.candidateId === candidateId)
    const job = liveJobs.find((j) => j.id === candApp?.jobId) || liveJobs[0]

    const candName = cand?.name || 'Candidate'
    const jobTitle = job?.title || 'Open Position'

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

  // Initiate send modal
  const handleInitiateSend = () => {
    if (selectedRecipientIds.length === 0) {
      toast.error('Select at least one recipient.')
      return
    }
    setShowConfirmModal(true)
  }

  // Execute Send
  const handleConfirmSend = async () => {
    setShowConfirmModal(false)
    setIsSending(true)
    setSendResults(null)

    const recipientsPayload = selectedRecipientIds
      .map((id) => {
        const { renderedSubject, renderedBody, cand } = getRenderedContent(id)
        if (!cand || !cand.email) return null
        return {
          candidate_id: cand.id,
          to: cand.email,
          subject: renderedSubject,
          body: renderedBody,
        }
      })
      .filter(Boolean) as Array<{ candidate_id: string; to: string; subject: string; body: string }>

    try {
      const response = await api.sendBulkEmail({
        job_id: selectedJobId !== 'all' ? selectedJobId : undefined,
        recipients: recipientsPayload,
        include_test_failure: true,
      })

      setSendResults(response.sent)
      setIsFallbackMode(false)

      // Add to local audit logs
      const newLogs: LocalEmailLog[] = response.sent.map((res) => {
        const { renderedSubject, cand } = getRenderedContent(res.candidate_id)
        return {
          id: `log-${Date.now()}-${res.candidate_id}`,
          recipientName: cand?.name || res.candidate_id,
          recipientEmail: res.email,
          subject: renderedSubject,
          status: res.status === 'sent' ? 'Sent' : 'Failed',
          error: res.error,
          sentAt: new Date().toISOString(),
        }
      })
      saveEmailLogs([...newLogs, ...emailLogs])

      const sentCount = response.sent.filter((s) => s.status === 'sent').length
      const failedCount = response.sent.filter((s) => s.status === 'failed').length

      if (failedCount > 0) {
        toast.warning(`Email batch processed: ${sentCount} sent, ${failedCount} failed.`)
      } else {
        toast.success(`Successfully dispatched ${sentCount} emails!`)
      }
    } catch (err: any) {
      // Endpoint missing or error -> Switch to FALLBACK mode
      setIsFallbackMode(true)
      setFallbackReason(err?.message || 'Email sending is not enabled on this server.')
      toast.error('Email sending is not enabled on this server. Manual fallback actions activated.')
    } finally {
      setIsSending(false)
    }
  }

  // Fallback Action 1: Copy All Emails
  const handleCopyAllEmails = () => {
    const emails = selectedRecipientIds
      .map((id) => liveCandidates.find((c) => c.id === id)?.email)
      .filter(Boolean)
      .join(', ')
    if (!emails) {
      toast.error('No emails to copy.')
      return
    }
    navigator.clipboard.writeText(emails)
    toast.success(`Copied ${selectedRecipientIds.length} recipient email addresses to clipboard!`)
  }

  // Fallback Action 2: Open in Mail Client (with 40 recipient BCC chunking)
  const handleOpenMailClient = () => {
    const validEmails = selectedRecipientIds
      .map((id) => liveCandidates.find((c) => c.id === id)?.email)
      .filter(Boolean) as string[]

    if (validEmails.length === 0) {
      toast.error('No recipients available.')
      return
    }

    // Chunk into groups of 40 to avoid mailto URL overflow
    const chunkSize = 40
    const chunks = []
    for (let i = 0; i < validEmails.length; i += chunkSize) {
      chunks.push(validEmails.slice(i, i + chunkSize))
    }

    if (chunks.length > 1) {
      toast.info(
        `Recipients split into ${chunks.length} batches of 40 to avoid URL length limitations.`
      )
    }

    const firstChunk = chunks[0]
    const mailtoUrl = `mailto:?bcc=${encodeURIComponent(firstChunk.join(','))}&subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`
    window.open(mailtoUrl, '_blank')
  }

  // Fallback Action 3: Download CSV
  const handleDownloadCsv = () => {
    const rows = [
      ['Candidate ID', 'Candidate Name', 'Email', 'Rendered Subject', 'Rendered Body'],
      ...selectedRecipientIds.map((id) => {
        const { renderedSubject, renderedBody, cand } = getRenderedContent(id)
        return [
          cand?.id || id,
          `"${(cand?.name || '').replace(/"/g, '""')}"`,
          `"${(cand?.email || '').replace(/"/g, '""')}"`,
          `"${renderedSubject.replace(/"/g, '""')}"`,
          `"${renderedBody.replace(/"/g, '""')}"`,
        ]
      }),
    ]

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'shortlisted_recipients_export.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Downloaded recipients export CSV!')
  }

  // Template Manager: Add new template
  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTemplateName || !newTemplateSubject || !newTemplateBody) {
      toast.error('Fill in all template fields.')
      return
    }

    const newTmpl: EmailTemplate = {
      id: `tmpl-${Date.now()}`,
      companyId: 'company-nova',
      name: newTemplateName,
      type: newTemplateType,
      subject: newTemplateSubject,
      body: newTemplateBody,
    }

    setTemplates([...templates, newTmpl])
    setSelectedTemplateId(newTmpl.id)
    setSubject(newTmpl.subject)
    setBody(newTmpl.body)
    setIsTemplateModalOpen(false)
    setNewTemplateName('')
    setNewTemplateSubject('')
    setNewTemplateBody('')
    toast.success('New email template saved!')
  }

  const activeRecipientId = selectedRecipientIds[activePreviewIndex] || selectedRecipientIds[0]
  const preview = activeRecipientId ? getRenderedContent(activeRecipientId) : null

  return (
    <div className="space-y-6" data-testid="emails-page">
      {/* Confirm Dispatch Dialog */}
      <ConfirmDialog
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        title="Send Bulk Communications"
        description={`Are you sure you want to dispatch emails to ${selectedRecipientIds.length} candidate(s)? This will queue and deliver personalized messages.`}
        confirmText={`Send ${selectedRecipientIds.length} Emails`}
        variant="primary"
        isLoading={isSending}
        onConfirm={handleConfirmSend}
      />

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
          <h1 className="text-2xl font-bold text-text">Bulk Email to Shortlisted Candidates</h1>
          <p className="text-sm text-muted mt-0.5">
            Automated batch outreach with dynamic variable interpolation and delivery tracking.
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

      {/* Mode Banner: Simulation / Demo banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-indigo-900 shadow-soft" data-testid="email-demo-banner">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <span>
            <strong>Demo:</strong> emails are simulated, nothing is sent. Real SMTP dispatch is gated behind backend activation.
          </span>
        </div>
      </div>

      {/* FALLBACK MODE BANNER (When endpoint returns 404/501 or fails) */}
      {isFallbackMode && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 shadow-soft space-y-3" data-testid="email-fallback-banner">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <h3 className="text-sm font-bold text-amber-900">
                Email sending is not enabled on this server.
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                The backend service has not implemented or exposed <code>POST /email/send</code> ({fallbackReason}).
                Use these manual fallback tools to reach out to your shortlisted applicants:
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-amber-200">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Copy className="w-3.5 h-3.5" />}
              onClick={handleCopyAllEmails}
              data-testid="fallback-copy-btn"
            >
              Copy all recipient emails
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
              onClick={handleOpenMailClient}
              data-testid="fallback-mailto-btn"
            >
              Open in mail client (BCC)
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={handleDownloadCsv}
              data-testid="fallback-csv-btn"
            >
              Download recipients CSV
            </Button>
          </div>
        </div>
      )}

      {/* Per-Recipient Result Table (when batch dispatch finishes) */}
      {sendResults && (
        <div className="bg-white rounded-xl border border-border shadow-soft p-5 space-y-3" data-testid="send-results-panel">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-text">Batch Delivery Results</h3>
            </div>
            <Badge variant="outline" size="sm">
              {sendResults.length} Processed
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-slate-50 text-muted font-semibold">
                  <th className="p-2.5">Candidate ID</th>
                  <th className="p-2.5">Email Address</th>
                  <th className="p-2.5 text-center">Status</th>
                  <th className="p-2.5">Detail / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sendResults.map((res) => (
                  <tr key={res.candidate_id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-text">{res.candidate_id}</td>
                    <td className="p-2.5 text-muted">{res.email}</td>
                    <td className="p-2.5 text-center">
                      <Badge
                        variant={res.status === 'sent' ? 'success' : 'danger'}
                        size="sm"
                      >
                        {res.status === 'sent' ? 'Sent' : 'Failed'}
                      </Badge>
                    </td>
                    <td className="p-2.5 text-[11px] text-muted">
                      {res.error || (res.status === 'sent' ? 'Delivered to mail server' : 'Unknown delivery failure')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Composer & Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Job Filter, Composer & Templates (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-4">
            {/* Job Filter */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-text mb-1">Filter by Job Requisition</label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-white text-xs font-medium text-text"
                  data-testid="email-job-filter"
                >
                  <option value="all">All Jobs (All Shortlisted)</option>
                  {liveJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.department})
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

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Load Email Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-white text-xs font-medium text-text"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.type})
                  </option>
                ))}
              </select>
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
                  variant="primary"
                  size="sm"
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                  onClick={handleInitiateSend}
                  disabled={selectedRecipientIds.length === 0 || isSending}
                  data-testid="send-emails-btn"
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
                    className="px-2 py-0.5 rounded text-xs border border-border disabled:opacity-40 cursor-pointer"
                  >
                    ←
                  </button>
                  <span className="text-[11px] text-muted">
                    {activePreviewIndex + 1} of {selectedRecipientIds.length}
                  </span>
                  <button
                    disabled={activePreviewIndex >= selectedRecipientIds.length - 1}
                    onClick={() => setActivePreviewIndex(activePreviewIndex + 1)}
                    className="px-2 py-0.5 rounded text-xs border border-border disabled:opacity-40 cursor-pointer"
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

                <div className="text-xs text-text whitespace-pre-line leading-relaxed font-sans max-h-60 overflow-y-auto">
                  {preview.renderedBody}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted p-4 text-center">No recipient selected for preview.</p>
            )}

            {/* Recipients Checklist */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span>Select Shortlisted Recipients ({selectedRecipientIds.length})</span>
                <button
                  onClick={() => {
                    if (selectedRecipientIds.length === eligibleCandidates.length) {
                      setSelectedRecipientIds([])
                    } else {
                      setSelectedRecipientIds(eligibleCandidates.map((c) => c.id))
                    }
                  }}
                  className="text-primary hover:underline text-[11px] cursor-pointer"
                >
                  {selectedRecipientIds.length === eligibleCandidates.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              {/* Notice for candidates excluded due to missing email */}
              {excludedWithoutEmailCount > 0 && (
                <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    {excludedWithoutEmailCount} shortlisted candidate{excludedWithoutEmailCount > 1 ? 's' : ''} excluded (missing email).
                  </span>
                </div>
              )}

              <div className="max-h-52 overflow-y-auto space-y-1.5 p-1 divide-y divide-border/50">
                {eligibleCandidates.length === 0 ? (
                  <EmptyState
                    title="No Shortlisted Candidates"
                    description="Move applicants to the Shortlisted stage in the Pipeline to enable bulk outreach."
                  />
                ) : (
                  eligibleCandidates.map((c) => {
                    const isChecked = selectedRecipientIds.includes(c.id)
                    return (
                      <label
                        key={c.id}
                        className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-gray-50 cursor-pointer"
                      >
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
                          <div>
                            <span className="font-medium text-text block">{c.name}</span>
                            <span className="text-[10px] text-muted">{c.email}</span>
                          </div>
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

      {/* Audit Log Table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-sm font-bold text-text">Dispatched &amp; Scheduled Communications</h3>
            <p className="text-xs text-muted">Auditable session log of outgoing candidate communications.</p>
          </div>
          <Badge variant="outline" size="sm">{emailLogs.length} Records</Badge>
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
              {emailLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted">
                    No emails dispatched in this session yet.
                  </td>
                </tr>
              ) : (
                emailLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-semibold text-text">
                      {log.recipientName}
                      <span className="text-muted font-normal block text-[11px]">{log.recipientEmail}</span>
                    </td>
                    <td className="p-3 max-w-xs truncate">{log.subject}</td>
                    <td className="p-3">
                      <Badge variant={log.status === 'Sent' ? 'success' : 'danger'} size="sm">
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
