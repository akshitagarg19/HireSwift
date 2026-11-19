import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Eye,
  RefreshCw,
  X,
  FileCheck,
} from 'lucide-react'

interface UploadItem {
  id: string
  fileName: string
  fileSize: string
  status: 'Queued' | 'Processing' | 'Parsed' | 'Needs review' | 'Failed'
  confidence: number
  extractedName?: string
  extractedEmail?: string
  extractedCollege?: string
  extractedCgpa?: number
  extractedSkills?: string[]
  isDuplicate?: boolean
}

export const UploadPage: React.FC = () => {
  const navigate = useNavigate()
  const { currentCompanyId, jobs, candidates, addCandidateWithApplication } = useAppStore()

  const companyJobs = jobs.filter((j) => j.companyId === currentCompanyId)
  const [selectedJobId, setSelectedJobId] = useState<string>(companyJobs[0]?.id || '')

  const [queue, setQueue] = useState<UploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [currentProgress, setCurrentProgress] = useState(0)

  // Correction modal for reviewing low confidence
  const [editingItem, setEditingItem] = useState<UploadItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editCollege, setEditCollege] = useState('')
  const [editCgpa, setEditCgpa] = useState<number>(0)

  // Sample files for quick multi-file upload demonstration
  const handleSimulateDrop = (count = 5) => {
    const sampleNames = [
      'Ananya_Iyer_Resume.pdf',
      'Rishabh_Tiwari_CV.docx',
      'Deepak_Sharma_Resume.pdf',
      'Kavya_Nair_FullStack.pdf',
      'Arnav_Bhatia_VIT.pdf',
      'Pooja_Reddy_Backend.pdf',
      'Sahil_Kapoor_IITD.pdf',
      'Isha_Chatterjee_Resume.docx',
    ]

    const newItems: UploadItem[] = []
    for (let i = 0; i < count; i++) {
      const fileName = sampleNames[i % sampleNames.length]
      newItems.push({
        id: `upload-${Date.now()}-${i}`,
        fileName: `${i + 1}_${fileName}`,
        fileSize: `${Math.round(150 + Math.random() * 400)} KB`,
        status: 'Queued',
        confidence: 0,
      })
    }
    setQueue([...queue, ...newItems])
    toast.info(`Added ${count} resumes to parsing queue.`)
  }

  const handleStartParsing = async () => {
    if (!selectedJobId) {
      toast.error('Please select a target job opening before parsing.')
      return
    }
    if (queue.length === 0) {
      toast.error('Add or drop files to parse.')
      return
    }

    setIsUploading(true)
    setCurrentProgress(0)

    const updatedQueue = [...queue]
    const existingEmails = new Set(candidates.map((c) => c.email.toLowerCase()))

    for (let i = 0; i < updatedQueue.length; i++) {
      // Set to processing
      updatedQueue[i].status = 'Processing'
      setQueue([...updatedQueue])
      setCurrentProgress(Math.round(((i + 0.5) / updatedQueue.length) * 100))

      await new Promise((r) => setTimeout(r, 350))

      const rawBase = updatedQueue[i].fileName.replace(/^[0-9]+_/, '').replace(/\.(pdf|docx)$/, '')
      const nameParts = rawBase.split('_').slice(0, 2)
      const name = nameParts.join(' ') || 'Candidate Applicant'
      const email = `${nameParts[0].toLowerCase()}.${nameParts[1]?.toLowerCase() || 'dev'}@gmail.com`
      const isDuplicate = existingEmails.has(email)

      // Random confidence simulation (with occasional low confidence to test review modal)
      const isLowConfidence = i % 4 === 1
      const confidence = isLowConfidence ? 54 : Math.round(82 + Math.random() * 16)
      const status = isLowConfidence ? 'Needs review' : 'Parsed'

      const extractedSkills = ['React', 'TypeScript', 'Node.js', 'PostgreSQL']
      const extractedCollege = i % 2 === 0 ? 'NIT Trichy' : 'BITS Pilani'
      const extractedCgpa = Math.round((7.8 + Math.random() * 1.8) * 10) / 10

      updatedQueue[i] = {
        ...updatedQueue[i],
        status,
        confidence,
        extractedName: name,
        extractedEmail: email,
        extractedCollege,
        extractedCgpa,
        extractedSkills,
        isDuplicate,
      }

      // Add to store
      addCandidateWithApplication(
        {
          companyId: currentCompanyId,
          name,
          email,
          phone: `+91 98${Math.floor(10000000 + Math.random() * 89999999)}`,
          location: 'Bengaluru',
          college: extractedCollege,
          degree: 'B.Tech',
          branch: 'Computer Science',
          gradYear: 2024,
          tenthPercent: 88,
          twelfthPercent: 86,
          cgpa: extractedCgpa,
          skills: extractedSkills,
          experienceYears: 2,
          experience: [
            {
              title: 'Software Engineer',
              company: 'Tech Corp',
              duration: '2 Years',
              description: 'Full stack development with React, Node.js and cloud services.',
            },
          ],
          projects: [],
          certifications: [],
          resumeText: `${name} resume content. Skills: ${extractedSkills.join(', ')}. College: ${extractedCollege}. CGPA: ${extractedCgpa}.`,
          resumeFileName: updatedQueue[i].fileName,
          parseConfidence: confidence,
          fieldConfidence: { name: confidence, college: confidence, cgpa: confidence },
          source: 'Bulk Resume Upload',
          customFields: {},
        },
        selectedJobId,
        'applied'
      )

      setQueue([...updatedQueue])
      setCurrentProgress(Math.round(((i + 1) / updatedQueue.length) * 100))
    }

    setIsUploading(false)
    toast.success('Batch resume parsing completed! Records ingested into talent pipeline.')
  }

  const handleOpenCorrection = (item: UploadItem) => {
    setEditingItem(item)
    setEditName(item.extractedName || '')
    setEditCollege(item.extractedCollege || '')
    setEditCgpa(item.extractedCgpa || 7.5)
  }

  const handleSaveCorrection = () => {
    if (!editingItem) return
    setQueue(
      queue.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              extractedName: editName,
              extractedCollege: editCollege,
              extractedCgpa: editCgpa,
              status: 'Parsed',
              confidence: 90,
            }
          : item
      )
    )
    setEditingItem(null)
    toast.success('Field corrections saved!')
  }

  const parsedCount = queue.filter((q) => q.status === 'Parsed').length
  const reviewCount = queue.filter((q) => q.status === 'Needs review').length

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Field Correction Modal */}
      <Modal
        open={Boolean(editingItem)}
        onOpenChange={(open) => !open && setEditingItem(null)}
        title="Review Low-Confidence Extraction"
        description="Verify and correct candidate details before finalizing parsing."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Extracted Full Name</label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text mb-1">College / University</label>
            <Input value={editCollege} onChange={(e) => setEditCollege(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text mb-1">CGPA (10-Point Scale)</label>
            <Input
              type="number"
              step="0.1"
              value={editCgpa}
              onChange={(e) => setEditCgpa(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveCorrection}>
              Save & Mark Parsed
            </Button>
          </div>
        </div>
      </Modal>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Resume Ingestion & Parsing</h1>
          <p className="text-sm text-muted mt-0.5">
            Bulk upload PDF/DOCX resumes (up to 500 files). Automatically parsed and scored against your selected job.
          </p>
        </div>

        {parsedCount > 0 && (
          <Button
            variant="primary"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate(`/app/jobs/${selectedJobId}`)}
          >
            View Ranked Candidates ({parsedCount})
          </Button>
        )}
      </div>

      {/* Target Job Selector */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="block text-xs font-bold text-text mb-1">Target Job Opening for Batch *</label>
            <p className="text-xs text-muted">
              Parsed resumes will be immediately evaluated and ranked against this job's criteria.
            </p>
          </div>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full sm:w-80 h-9 px-3 rounded-lg border border-border bg-white text-xs font-semibold text-text"
          >
            {companyJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j.department})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Drag & Drop Simulation Zone */}
      <div className="bg-card rounded-2xl border-2 border-dashed border-indigo-200 hover:border-primary p-8 text-center shadow-soft transition-colors space-y-4">
        <div className="w-16 h-16 rounded-full bg-indigo-50 text-primary flex items-center justify-center mx-auto">
          <UploadCloud className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-base font-bold text-text">Drag & drop resume files here</h3>
          <p className="text-xs text-muted max-w-md mx-auto mt-1">
            Supports multi-file batch upload of PDF and DOCX documents.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSimulateDrop(5)}
            disabled={isUploading}
          >
            Simulate 5 Resumes
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSimulateDrop(15)}
            disabled={isUploading}
          >
            Simulate 15 Resumes (Batch)
          </Button>

          {queue.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<FileCheck className="w-4 h-4" />}
              onClick={handleStartParsing}
              isLoading={isUploading}
            >
              Parse All Queued ({queue.length})
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="bg-white rounded-xl border border-border p-4 shadow-soft space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span>Parsing resumes & evaluating match criteria...</span>
            <span className="text-primary">{currentProgress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Queue Table */}
      {queue.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border bg-gray-50/50">
            <div>
              <h3 className="text-sm font-bold text-text">Upload Queue ({queue.length})</h3>
              <p className="text-xs text-muted">
                {parsedCount} parsed, {reviewCount} need review
              </p>
            </div>
            {!isUploading && (
              <button
                onClick={() => setQueue([])}
                className="text-xs text-rose-600 hover:underline"
              >
                Clear Queue
              </button>
            )}
          </div>

          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {queue.map((item) => (
              <div key={item.id} className="p-3.5 flex items-center justify-between gap-4 text-xs hover:bg-gray-50/50">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-text truncate">{item.fileName}</div>
                    <div className="text-[11px] text-muted flex items-center gap-2">
                      <span>{item.fileSize}</span>
                      {item.extractedName && <span>• {item.extractedName}</span>}
                      {item.extractedCollege && <span>• {item.extractedCollege}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.isDuplicate && (
                    <Badge variant="warning" size="sm">
                      Duplicate Match
                    </Badge>
                  )}

                  {item.status === 'Queued' && (
                    <Badge variant="secondary" size="sm">
                      <Clock className="w-3 h-3 mr-1" /> Queued
                    </Badge>
                  )}

                  {item.status === 'Processing' && (
                    <Badge variant="default" size="sm" className="animate-pulse">
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Processing
                    </Badge>
                  )}

                  {item.status === 'Parsed' && (
                    <Badge variant="success" size="sm">
                      <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" />
                      Parsed ({item.confidence}%)
                    </Badge>
                  )}

                  {item.status === 'Needs review' && (
                    <div className="flex items-center gap-2">
                      <Badge variant="warning" size="sm">
                        <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                        Low Confidence ({item.confidence}%)
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye className="w-3 h-3" />}
                        onClick={() => handleOpenCorrection(item)}
                      >
                        Review
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
