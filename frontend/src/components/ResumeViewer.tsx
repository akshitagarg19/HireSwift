import React, { useState, useEffect } from 'react'
import { Candidate } from '@/types'
import { api } from '@/api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FileText, Download, AlertTriangle, Eye, CheckCircle2 } from 'lucide-react'

interface ResumeViewerProps {
  candidate: Candidate
  isBlind?: boolean
}

export const ResumeViewer: React.FC<ResumeViewerProps> = ({ candidate, isBlind = false }) => {
  const [status, setStatus] = useState<'loading' | 'pdf' | 'docx' | 'not_found'>('loading')
  const resumeUrl = api.getCandidateResumeUrl(candidate.id)

  useEffect(() => {
    let active = true
    setStatus('loading')

    // Inspect file existence and mime type
    fetch(resumeUrl, { method: 'HEAD' })
      .then((res) => {
        if (!active) return
        if (!res.ok) {
          setStatus('not_found')
          return
        }
        const contentType = res.headers.get('content-type') || ''
        const fileName = candidate.resumeFileName || ''
        const isPdf =
          contentType.includes('pdf') ||
          fileName.toLowerCase().endsWith('.pdf') ||
          (!fileName.toLowerCase().endsWith('.docx') && !contentType.includes('word'))

        setStatus(isPdf ? 'pdf' : 'docx')
      })
      .catch(() => {
        if (!active) return
        setStatus('not_found')
      })

    return () => {
      active = false
    }
  }, [candidate.id, candidate.resumeFileName, resumeUrl])

  const renderConfidenceBadge = (fieldName: string, value: any) => {
    const rawConf = candidate.fieldConfidence?.[fieldName]
    const confNormalized =
      rawConf != null ? (rawConf > 1 ? rawConf / 100 : rawConf) : candidate.parseConfidence ? candidate.parseConfidence / 100 : 0.85

    const isMissing = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
    const isLowConfidence = confNormalized < 0.7 || isMissing

    if (isMissing) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          Missing / Unextracted
        </span>
      )
    }

    if (isLowConfidence) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          Low Confidence ({Math.round(confNormalized * 100)}%)
        </span>
      )
    }

    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
        {Math.round(confNormalized * 100)}%
      </span>
    )
  }

  const renderParsedFields = () => {
    return (
      <div className="bg-white rounded-xl border border-border p-4 space-y-4" data-testid="parsed-fields-container">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <span className="text-xs font-bold text-text uppercase tracking-wider">
            Parsed Profile & Extraction Confidence
          </span>
          <span className="text-[11px] text-muted">
            Overall Confidence: <strong>{candidate.parseConfidence ?? 85}%</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded-lg border border-border bg-gray-50/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted font-medium">Candidate Name</span>
              {renderConfidenceBadge('name', candidate.name)}
            </div>
            <p className="font-semibold text-text">{isBlind ? `Candidate #${candidate.id}` : candidate.name}</p>
          </div>

          <div className="p-2.5 rounded-lg border border-border bg-gray-50/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted font-medium">Email Address</span>
              {renderConfidenceBadge('email', candidate.email)}
            </div>
            <p className="font-semibold text-text">{isBlind ? '[Hidden Email]' : candidate.email || '-'}</p>
          </div>

          <div className="p-2.5 rounded-lg border border-border bg-gray-50/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted font-medium">Phone</span>
              {renderConfidenceBadge('phone', candidate.phone)}
            </div>
            <p className="font-semibold text-text">{isBlind ? '[Hidden Phone]' : candidate.phone || '-'}</p>
          </div>

          <div className="p-2.5 rounded-lg border border-border bg-gray-50/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted font-medium">Location</span>
              {renderConfidenceBadge('city', candidate.location)}
            </div>
            <p className="font-semibold text-text">{isBlind ? '[Hidden Location]' : candidate.location || '-'}</p>
          </div>

          <div className="p-2.5 rounded-lg border border-border bg-gray-50/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted font-medium">College / University</span>
              {renderConfidenceBadge('college', candidate.college)}
            </div>
            <p className="font-semibold text-text">{isBlind ? '[Hidden College]' : candidate.college || '-'}</p>
          </div>

          <div className="p-2.5 rounded-lg border border-border bg-gray-50/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted font-medium">Degree & Branch</span>
              {renderConfidenceBadge('degree', candidate.degree)}
            </div>
            <p className="font-semibold text-text">
              {candidate.degree ? `${candidate.degree} - ${candidate.branch || 'General'}` : '-'}
            </p>
          </div>

          <div className="p-2.5 rounded-lg border border-border bg-gray-50/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted font-medium">Graduation Year</span>
              {renderConfidenceBadge('grad_year', candidate.gradYear)}
            </div>
            <p className="font-semibold text-text">{candidate.gradYear || '-'}</p>
          </div>

          <div className="p-2.5 rounded-lg border border-border bg-gray-50/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted font-medium">CGPA (10-scale)</span>
              {renderConfidenceBadge('cgpa', candidate.cgpa)}
            </div>
            <p className="font-semibold text-text">{candidate.cgpa != null ? `${candidate.cgpa} / 10` : '-'}</p>
          </div>

          <div className="p-2.5 rounded-lg border border-border bg-gray-50/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted font-medium">10th / 12th Board %</span>
              {renderConfidenceBadge('board_percent', candidate.tenthPercent)}
            </div>
            <p className="font-semibold text-text">
              {candidate.tenthPercent != null ? `${candidate.tenthPercent}%` : '-'} /{' '}
              {candidate.twelfthPercent != null ? `${candidate.twelfthPercent}%` : '-'}
            </p>
          </div>

          <div className="p-2.5 rounded-lg border border-border bg-gray-50/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted font-medium">Total Experience</span>
              {renderConfidenceBadge('experience_months', candidate.experienceYears)}
            </div>
            <p className="font-semibold text-text">
              {candidate.experienceYears != null
                ? candidate.experienceYears === 0
                  ? 'Fresher (0 years)'
                  : `${candidate.experienceYears} years`
                : '-'}
            </p>
          </div>
        </div>

        <div className="p-2.5 rounded-lg border border-border bg-gray-50/50 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted font-medium">Extracted Technical Skills</span>
            {renderConfidenceBadge('skills', candidate.skills)}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {candidate.skills.length > 0 ? (
              candidate.skills.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-white text-gray-800 border border-gray-200 shadow-2xs"
                >
                  {s}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted italic">No skills extracted</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isBlind && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
          <Eye className="w-4 h-4 shrink-0 text-amber-700" />
          <span>
            <strong>Blind Screening Mode Active:</strong> Identity attributes in the parsed profile are masked. The raw
            original file may contain unredacted names and photos.
          </span>
        </div>
      )}

      {status === 'loading' && (
        <div className="p-10 text-center text-xs text-muted bg-gray-50 rounded-xl border border-border">
          Verifying original document on server...
        </div>
      )}

      {status === 'pdf' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-text truncate max-w-xs">
                {candidate.resumeFileName || 'Original_Resume.pdf'}
              </span>
              <Badge variant="secondary" size="sm">
                PDF
              </Badge>
            </div>
            <a
              href={resumeUrl}
              download={candidate.resumeFileName || 'resume.pdf'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors shadow-2xs"
              data-testid="download-original-btn"
            >
              <Download className="w-3.5 h-3.5" />
              Download original
            </a>
          </div>

          <div className="w-full h-[650px] rounded-xl border border-border overflow-hidden bg-gray-100">
            <object
              data={resumeUrl}
              type="application/pdf"
              className="w-full h-full"
              data-testid="resume-pdf-viewer"
            >
              <div className="p-8 text-center text-xs text-muted">
                <p className="mb-3">Embedded PDF preview is not supported by your browser environment.</p>
                <a
                  href={resumeUrl}
                  download={candidate.resumeFileName || 'resume.pdf'}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold"
                >
                  Download PDF
                </a>
              </div>
            </object>
          </div>

          {renderParsedFields()}
        </div>
      )}

      {status === 'docx' && (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-700" />
                <span className="text-xs font-bold text-indigo-950">
                  {candidate.resumeFileName || 'Original_Resume.docx'}
                </span>
                <Badge variant="info" size="sm">
                  DOCX
                </Badge>
              </div>
              <p className="text-xs text-indigo-800">
                Word documents (.docx) cannot be natively rendered inline by web browsers. Download original below or inspect the parsed structure.
              </p>
            </div>
            <a
              href={resumeUrl}
              download={candidate.resumeFileName || 'resume.docx'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shrink-0 shadow-2xs"
              data-testid="download-docx-btn"
            >
              <Download className="w-4 h-4" />
              Download original (.docx)
            </a>
          </div>

          {renderParsedFields()}
        </div>
      )}

      {status === 'not_found' && (
        <div className="space-y-4">
          <div
            className="p-6 text-center bg-gray-50 rounded-xl border border-border space-y-2"
            data-testid="resume-not-found"
          >
            <AlertTriangle className="w-8 h-8 mx-auto text-amber-600" />
            <h4 className="text-sm font-bold text-text">
              Original file not found on server (parsed data is shown below)
            </h4>
            <p className="text-xs text-muted max-w-md mx-auto">
              The original resume binary was not found or has expired. All parsed candidate attributes and extraction confidence indicators remain available below.
            </p>
          </div>

          {renderParsedFields()}
        </div>
      )}
    </div>
  )
}
