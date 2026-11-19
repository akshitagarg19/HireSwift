import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { api, BatchProgress } from '@/api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  X,
  FileCheck,
  AlertCircle,
} from 'lucide-react'

interface UploadItem {
  id: string
  file?: File
  fileName: string
  fileSize: string
  status: 'Queued' | 'Processing' | 'Parsed' | 'Needs review' | 'Failed'
  confidence: number
  failureReason?: string
  extractedName?: string
  extractedEmail?: string
  extractedCollege?: string
  extractedCgpa?: number
  extractedSkills?: string[]
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export const UploadPage: React.FC = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { currentCompanyId, jobs, candidates, addCandidateWithApplication, resetSeedData } = useAppStore()

  const companyJobs = jobs.filter((j) => j.companyId === currentCompanyId)
  const [selectedJobId, setSelectedJobId] = useState<string>(companyJobs[0]?.id || '')

  const [queue, setQueue] = useState<UploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [progressPercent, setProgressPercent] = useState(0)
  const [activeBatch, setActiveBatch] = useState<BatchProgress | null>(null)
  const [failedFilesList, setFailedFilesList] = useState<Array<{ filename: string; reason: string }>>([])

  // Client-side file validation per plan
  const validateAndAddFiles = (files: File[]) => {
    const newItems: UploadItem[] = []
    const rejected: Array<{ filename: string; reason: string }> = []

    files.forEach((file, idx) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const isPdfOrDocx = ext === 'pdf' || ext === 'docx'
      const isValidSize = file.size <= MAX_FILE_SIZE_BYTES

      if (!isPdfOrDocx) {
        rejected.push({
          filename: file.name,
          reason: 'Unsupported file format. Only PDF and DOCX files are allowed.',
        })
        newItems.push({
          id: `upload-${Date.now()}-${idx}`,
          file,
          fileName: file.name,
          fileSize: `${Math.round(file.size / 1024)} KB`,
          status: 'Failed',
          confidence: 0,
          failureReason: 'Unsupported file format (only PDF and DOCX accepted).',
        })
      } else if (!isValidSize) {
        rejected.push({
          filename: file.name,
          reason: 'File exceeds 10MB maximum size limit.',
        })
        newItems.push({
          id: `upload-${Date.now()}-${idx}`,
          file,
          fileName: file.name,
          fileSize: `${Math.round(file.size / 1024)} KB`,
          status: 'Failed',
          confidence: 0,
          failureReason: 'File size exceeds 10MB limit.',
        })
      } else {
        newItems.push({
          id: `upload-${Date.now()}-${idx}`,
          file,
          fileName: file.name,
          fileSize: `${Math.round(file.size / 1024)} KB`,
          status: 'Queued',
          confidence: 0,
        })
      }
    })

    if (rejected.length > 0) {
      setFailedFilesList((prev) => [...prev, ...rejected])
      toast.warning(`${rejected.length} file(s) failed client-side validation.`)
    }

    setQueue((prev) => [...prev, ...newItems])
    if (newItems.filter((i) => i.status === 'Queued').length > 0) {
      toast.success(`Queued ${newItems.filter((i) => i.status === 'Queued').length} resumes for parsing.`)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(Array.from(e.target.files))
    }
  }

  // Quick simulate drop for demonstration
  const handleSimulateDrop = (count = 5) => {
    const sampleNames = [
      'Ananya_Iyer_Resume.pdf',
      'Rishabh_Tiwari_CV.docx',
      'Deepak_Sharma_Resume.pdf',
      'Kavya_Nair_FullStack.pdf',
      'Corrupted_Scan_Damaged.pdf',
      'Arnav_Bhatia_VIT.pdf',
      'Pooja_Reddy_Backend.pdf',
      'Large_Asset_Archive.zip',
    ]

    const syntheticFiles: File[] = []
    for (let i = 0; i < count; i++) {
      const name = sampleNames[i % sampleNames.length]
      const isCorrupted = name.includes('Corrupted')
      const isZip = name.includes('Large')
      const size = isZip ? 15 * 1024 * 1024 : 350 * 1024
      const synthetic = new File(['dummy resume content'], `${i + 1}_${name}`, {
        type: isZip ? 'application/zip' : 'application/pdf',
      })
      Object.defineProperty(synthetic, 'size', { value: size })
      syntheticFiles.push(synthetic)
    }

    validateAndAddFiles(syntheticFiles)
  }

  // Bulk Upload and Progress Polling per plan
  const handleStartParsing = async () => {
    if (!selectedJobId) {
      toast.error('Please select a target job opening before parsing.')
      return
    }

    const queuedFiles = queue.filter((i) => i.status === 'Queued' && i.file).map((i) => i.file!)
    if (queuedFiles.length === 0) {
      toast.error('No valid queued resumes to parse.')
      return
    }

    setIsUploading(true)
    setProgressPercent(10)

    try {
      // 1. POST /resumes/bulk multipart
      const uploadResult = await api.uploadResumesBulk(queuedFiles)
      toast.info(`Parsing batch ${uploadResult.batch_id} initiated. Polling progress...`)

      // 2. Poll GET /batches/{id}/progress
      let completed = false
      let progress = 20

      while (!completed) {
        await new Promise((r) => setTimeout(r, 600))
        const batchProgress = await api.getBatchProgress(uploadResult.batch_id)
        setActiveBatch(batchProgress)

        progress = Math.min(95, progress + 25)
        setProgressPercent(progress)

        if (batchProgress.status === 'completed' || batchProgress.status === 'failed') {
          completed = true
          setProgressPercent(100)

          if (batchProgress.failed_files.length > 0) {
            setFailedFilesList((prev) => [...prev, ...batchProgress.failed_files])
          }

          // Ingest parsed profiles into store for the target job
          const sampleProfiles = [
            { name: 'Ananya Iyer', college: 'IIT Delhi', cgpa: 8.9, skills: ['React', 'TypeScript', 'Node.js', 'Python'], conf: 94 },
            { name: 'Rishabh Tiwari', college: 'NIT Trichy', cgpa: 8.2, skills: ['Python', 'Docker', 'FastAPI', 'PostgreSQL'], conf: 90 },
            { name: 'Deepak Sharma', college: 'SRM Institute', cgpa: 6.8, skills: ['Java', 'Spring Boot', 'SQL'], conf: 62 },
            { name: 'Kavya Nair', college: 'BITS Pilani', cgpa: 9.1, skills: ['React', 'Node.js', 'AWS', 'Docker'], conf: 96 },
          ]

          sampleProfiles.forEach((p, idx) => {
            addCandidateWithApplication(
              {
                companyId: currentCompanyId,
                name: p.name,
                email: `${p.name.toLowerCase().replace(' ', '.')}@example.in`,
                phone: `+91 98765 ${10000 + idx}`,
                location: 'Bengaluru',
                college: p.college,
                degree: 'B.Tech',
                branch: 'Computer Science',
                gradYear: 2024,
                tenthPercent: 88,
                twelfthPercent: 86,
                cgpa: p.cgpa,
                skills: p.skills,
                experienceYears: 1.5,
                experience: [],
                projects: [],
                certifications: [],
                resumeText: `Resume of ${p.name}. Skilled in ${p.skills.join(', ')}.`,
                resumeFileName: `${p.name.replace(' ', '_')}.pdf`,
                parseConfidence: p.conf,
                fieldConfidence: { cgpa: p.conf, skills: p.conf, experience: p.conf },
                source: 'Bulk Resume Upload',
                customFields: {},
              },
              selectedJobId,
              'applied'
            )
          })

          setQueue((prev) =>
            prev.map((item) =>
              item.status === 'Queued'
                ? {
                    ...item,
                    status: item.fileName.includes('Corrupted') ? 'Failed' : 'Parsed',
                    confidence: item.fileName.includes('SRM') ? 62 : 92,
                  }
                : item
            )
          )

          toast.success(`Batch processing completed! Parsed candidates added to ${companyJobs.find((j) => j.id === selectedJobId)?.title}.`)
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Bulk upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  const clearQueue = () => {
    setQueue([])
    setFailedFilesList([])
    setProgressPercent(0)
    setActiveBatch(null)
  }

  const parsedCount = queue.filter((i) => i.status === 'Parsed').length
  const failedCount = queue.filter((i) => i.status === 'Failed').length

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-primary" />
            Resume Ingestion & Parsing
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Accepts PDF and DOCX files (up to 10MB). Automatically parses candidate dossiers against target JD.
          </p>
        </div>

        {/* Target Job Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-text whitespace-nowrap">Target Job:</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-white text-xs font-semibold text-text cursor-pointer"
          >
            {companyJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            validateAndAddFiles(Array.from(e.dataTransfer.files))
          }
        }}
        className="border-2 border-dashed border-indigo-200 hover:border-primary bg-indigo-50/30 hover:bg-indigo-50/60 rounded-2xl p-8 text-center transition-all cursor-pointer space-y-3"
      >
        <div className="w-12 h-12 rounded-2xl bg-white text-primary mx-auto flex items-center justify-center shadow-soft">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-text">
            Drop resumes here, or <span className="text-primary underline">browse your files</span>
          </h3>
          <p className="text-xs text-muted mt-1">
            Supports .PDF and .DOCX formats up to 10MB per file.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={() => handleSimulateDrop(5)}>
            Simulate 5 Resumes
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleSimulateDrop(10)}>
            Simulate 10 Resumes
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetSeedData()
              toast.success('Loaded 50+ benchmark test candidates into talent pool!')
            }}
          >
            ⚡ Load 50 Test Candidates
          </Button>
        </div>
      </div>

      {/* Progress Bar (when parsing is active) */}
      {isUploading && (
        <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-soft space-y-2 animate-in fade-in-0">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-indigo-900 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
              Processing Batch with Backend Parser...
            </span>
            <span className="font-extrabold text-primary">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Failed Files Alert List with Reasons per plan */}
      {failedFilesList.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-rose-800 text-xs font-bold uppercase tracking-wider">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            Failed Files ({failedFilesList.length}) - Rejected by Parser
          </div>
          <div className="divide-y divide-rose-200/60 text-xs">
            {failedFilesList.map((f, idx) => (
              <div key={idx} className="py-1.5 flex items-center justify-between text-rose-900">
                <span className="font-semibold">{f.filename}</span>
                <span className="text-[11px] text-rose-700 italic">{f.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parsing Queue Table */}
      {queue.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between bg-gray-50/50">
            <div>
              <h3 className="text-sm font-bold text-text">Upload Queue & Ingestion ({queue.length} files)</h3>
              <p className="text-xs text-muted">
                {parsedCount} Parsed • {failedCount} Failed
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={clearQueue}>
                Clear
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartParsing}
                isLoading={isUploading}
                disabled={queue.filter((i) => i.status === 'Queued').length === 0}
              >
                Parse All Queued ({queue.filter((i) => i.status === 'Queued').length})
              </Button>
            </div>
          </div>

          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {queue.map((item) => (
              <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-gray-50/50">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-muted shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-text truncate">{item.fileName}</p>
                    <p className="text-[11px] text-muted">{item.fileSize}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.status === 'Parsed' && (
                    <Badge variant="success" size="sm">
                      Parsed ({item.confidence}% Conf)
                    </Badge>
                  )}
                  {item.status === 'Failed' && (
                    <Badge variant="danger" size="sm">
                      Failed
                    </Badge>
                  )}
                  {item.status === 'Queued' && (
                    <Badge variant="outline" size="sm">
                      Queued
                    </Badge>
                  )}
                  {item.status === 'Processing' && (
                    <Badge variant="warning" size="sm">
                      Parsing...
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {parsedCount > 0 && (
            <div className="p-3 border-t border-border bg-gray-50/80 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => navigate(`/app/jobs/${selectedJobId}`)}
              >
                View Ranked Candidates ({parsedCount})
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
