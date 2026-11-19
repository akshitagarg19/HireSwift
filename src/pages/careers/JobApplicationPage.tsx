import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { SkillChip } from '@/components/ui/SkillChip'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Clock,
  Briefcase,
  UploadCloud,
  FileCheck,
} from 'lucide-react'

export const JobApplicationPage: React.FC = () => {
  const { companySlug, jobId } = useParams<{ companySlug: string; jobId: string }>()
  const navigate = useNavigate()
  const { companies, jobs, addCandidateWithApplication } = useAppStore()

  const company = companies.find((c) => c.slug === companySlug) || companies[0]
  const job = jobs.find((j) => j.id === jobId && j.companyId === company.id)

  // Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('Bengaluru')
  const [college, setCollege] = useState('IIT Delhi')
  const [degree, setDegree] = useState('B.Tech')
  const [branch, setBranch] = useState('Computer Science')
  const [gradYear, setGradYear] = useState(2025)
  const [cgpa, setCgpa] = useState<number>(8.5)
  const [tenth, setTenth] = useState<number>(90)
  const [twelfth, setTwelfth] = useState<number>(88)
  const [experienceYears, setExperienceYears] = useState<number>(1)
  const [skillsInput, setSkillsInput] = useState('React, TypeScript, Python, Node.js')
  const [resumeText, setResumeText] = useState('')
  const [consentChecked, setConsentChecked] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [createdCandidateId, setCreatedCandidateId] = useState('')

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="text-center bg-white p-8 rounded-xl border border-border">
          <h2 className="text-lg font-bold text-text">Job Posting Not Found</h2>
          <Button variant="outline" className="mt-4" onClick={() => navigate(`/careers/${company.slug}`)}>
            Back to Openings
          </Button>
        </div>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !phone) {
      toast.error('Please fill in all personal information.')
      return
    }
    if (!consentChecked) {
      toast.error('Please consent to recruitment data processing.')
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      const parsedSkills = skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const result = addCandidateWithApplication(
        {
          companyId: company.id,
          name,
          email,
          phone,
          location,
          college,
          degree,
          branch,
          gradYear,
          tenthPercent: tenth,
          twelfthPercent: twelfth,
          cgpa,
          skills: parsedSkills,
          experienceYears,
          experience: experienceYears > 0 ? [
            {
              title: 'Software Developer',
              company: 'Previous Employer / Intern',
              duration: `${experienceYears} Years`,
              description: 'Developed modern web applications and microservices.',
            }
          ] : [],
          projects: [
            {
              title: 'Full Stack Web Platform',
              description: 'Engineered responsive frontend and REST API.',
              technologies: parsedSkills.slice(0, 3),
            }
          ],
          certifications: [],
          resumeText: resumeText || `${name} application resume. Skills: ${parsedSkills.join(', ')}. College: ${college}. CGPA: ${cgpa}.`,
          resumeFileName: `${name.toLowerCase().replace(' ', '_')}_cv.pdf`,
          parseConfidence: 94,
          fieldConfidence: { name: 98, email: 98, college: 95, cgpa: 95 },
          source: 'Public Career Portal',
          customFields: {
            'cf-ctc': 12,
            'cf-notice': '30 Days',
          },
          gender: 'Male',
        },
        job.id,
        'applied'
      )

      setIsSubmitting(false)
      setIsSubmitted(true)
      setCreatedCandidateId(result.candidate.id)
      toast.success('Application submitted successfully!')
    }, 450)
  }

  return (
    <div className="min-h-screen bg-background py-10 px-6 sm:px-12">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          to={`/careers/${company.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to all openings at {company.name}
        </Link>

        {isSubmitted ? (
          /* Confirmation Screen */
          <div className="bg-white rounded-2xl border border-border p-10 text-center shadow-card space-y-4 animate-in fade-in-0 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-bold text-text">Application Received!</h2>
            <p className="text-sm text-muted max-w-md mx-auto">
              Thank you for applying for the <strong>{job.title}</strong> role at {company.name}.
              Our automated parsing and ranking engine has placed your application in review.
            </p>

            <div className="p-4 bg-gray-50 rounded-xl border border-border inline-block text-xs text-muted">
              Application ID: <strong className="text-text font-mono font-bold">{createdCandidateId}</strong>
            </div>

            <div className="pt-4">
              <Button
                variant="primary"
                onClick={() => navigate(`/careers/${company.slug}`)}
              >
                Browse More Roles
              </Button>
            </div>
          </div>
        ) : (
          /* Application Form */
          <div className="space-y-6">
            {/* Job Header Card */}
            <div className="bg-white rounded-xl border border-border p-6 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-text">{job.title}</h1>
                <Badge variant="outline">{job.department}</Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {job.location}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {job.type}
                </span>
                <span>•</span>
                <span>Min Experience: {job.requirements.minExperience} yrs</span>
                {job.requirements.minCgpa > 0 && (
                  <span>• Min CGPA: {job.requirements.minCgpa}</span>
                )}
              </div>

              <div className="pt-3 border-t border-border">
                <h3 className="text-xs font-bold text-text mb-1">Required Competencies:</h3>
                <div className="flex flex-wrap gap-1">
                  {job.requirements.requiredSkills.map((s) => (
                    <SkillChip key={s} name={s} status="required" size="sm" />
                  ))}
                  {job.requirements.preferredSkills.map((s) => (
                    <SkillChip key={s} name={s} status="preferred" size="sm" />
                  ))}
                </div>
              </div>
            </div>

            {/* Submission Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border p-6 shadow-soft space-y-6">
              <h2 className="text-base font-bold text-text border-b border-border pb-2">
                Candidate Information & Credentials
              </h2>

              {/* Personal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Full Name *</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Ananya Iyer" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Email Address *</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ananya@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Phone Number *</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+91 9876543210" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Current Location</label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bengaluru, Pune, Delhi..." />
                </div>
              </div>

              {/* Academic */}
              <div className="pt-2 border-t border-border space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Academic Background</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">College / University</label>
                    <Input value={college} onChange={(e) => setCollege(e.target.value)} placeholder="IIT Delhi, BITS..." />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Degree & Branch</label>
                    <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Computer Science..." />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Graduation Batch Year</label>
                    <Input
                      type="number"
                      value={gradYear}
                      onChange={(e) => setGradYear(parseInt(e.target.value, 10))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">College CGPA (10 Scale)</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={cgpa}
                      onChange={(e) => setCgpa(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Class 12th Board %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={twelfth}
                      onChange={(e) => setTwelfth(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Class 10th Board %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={tenth}
                      onChange={(e) => setTenth(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>
              </div>

              {/* Technical Profile */}
              <div className="pt-2 border-t border-border space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Technical Profile & Skills</h3>
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Total Years of Experience</label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Skills (Comma-separated)</label>
                  <Input
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    placeholder="React, TypeScript, Node.js, AWS, Python..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Resume Summary / Text</label>
                  <Textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste your resume content or career summary here for automated matching..."
                    rows={4}
                  />
                </div>
              </div>

              {/* Consent checkbox */}
              <div className="pt-2 border-t border-border">
                <label className="flex items-start gap-2.5 text-xs text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>
                    I confirm the information provided is accurate and consent to {company.name} processing my profile data for recruitment purposes in compliance with the Digital Personal Data Protection Act.
                  </span>
                </label>
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isSubmitting}>
                Submit Application
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
