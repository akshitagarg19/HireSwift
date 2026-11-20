import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { api, USE_MOCK } from '@/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { SkillChip } from '@/components/ui/SkillChip'
import { toast } from 'sonner'
import { Sparkles, ArrowLeft, Plus, Check } from 'lucide-react'

const KNOWN_SKILL_DICTIONARY = [
  'React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS', 'Python', 'Machine Learning', 'PyTorch',
  'Docker', 'FastAPI', 'Kubernetes', 'Redis', 'GraphQL', 'Tailwind CSS', 'JavaScript', 'HTML/CSS',
  'Terraform', 'CI/CD', 'Linux', 'Java', 'Data Structures', 'SQL', 'Spring Boot', 'Git',
  'Excel', 'PowerBI', 'Selenium', 'MongoDB', 'Next.js', 'Figma', 'Solidity', 'Go', 'GCP',
]

export const JobCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const { currentCompanyId, addJob } = useAppStore()

  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('Engineering')
  const [location, setLocation] = useState('Bengaluru, India (Hybrid)')
  const [type, setType] = useState<'Full-time' | 'Part-time' | 'Internship' | 'Contract'>('Full-time')
  const [jdText, setJdText] = useState('')

  // Requirements extracted or manually edited
  const [requiredSkills, setRequiredSkills] = useState<string[]>([])
  const [preferredSkills, setPreferredSkills] = useState<string[]>([])
  const [minExperience, setMinExperience] = useState(2)
  const [minCgpa, setMinCgpa] = useState(7.0)
  const [gradYears, setGradYears] = useState<number[]>([2023, 2024, 2025])
  const [minTenth, setMinTenth] = useState(70)
  const [minTwelfth, setMinTwelfth] = useState(70)

  const [newSkillInput, setNewSkillInput] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Rule-based extraction from JD textarea
  const handleExtractRequirements = () => {
    if (!jdText.trim()) {
      toast.error('Please paste or write a Job Description first.')
      return
    }

    setIsExtracting(true)
    setTimeout(() => {
      const lowerJd = jdText.toLowerCase()

      // 1. Extract skills
      const extractedReq: string[] = []
      const extractedPref: string[] = []

      KNOWN_SKILL_DICTIONARY.forEach((skill) => {
        const regex = new RegExp(`\\b${skill.toLowerCase().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i')
        if (regex.test(lowerJd)) {
          if (extractedReq.length < 5) {
            extractedReq.push(skill)
          } else {
            extractedPref.push(skill)
          }
        }
      })

      // 2. Extract experience (e.g. "3+ years", "3 to 5 years", "min 2 years")
      const expMatch = lowerJd.match(/(\d+)\+?\s*(?:to\s*\d+)?\s*(?:years?|yrs?)/)
      if (expMatch && expMatch[1]) {
        setMinExperience(parseInt(expMatch[1], 10))
      }

      // 3. Extract CGPA (e.g. "min 7.5 cgpa" or "8.0 cgpa")
      const cgpaMatch = lowerJd.match(/(\d+(?:\.\d+)?)\s*(?:cgpa|gpa)/)
      if (cgpaMatch && cgpaMatch[1]) {
        setMinCgpa(parseFloat(cgpaMatch[1]))
      }

      // 4. Extract grad batch (e.g. "2024, 2025 batch")
      const yearMatches = jdText.match(/\b(202[0-7])\b/g)
      if (yearMatches) {
        const uniqueYears = Array.from(new Set(yearMatches.map(Number)))
        setGradYears(uniqueYears)
      }

      setRequiredSkills(extractedReq.length > 0 ? extractedReq : ['React', 'TypeScript', 'Node.js'])
      setPreferredSkills(extractedPref.length > 0 ? extractedPref : ['Docker', 'AWS'])

      setIsExtracting(false)
      toast.success('Successfully extracted requirements from Job Description!')
    }, 400)
  }

  const handleAddSkill = (isPreferred = false) => {
    if (!newSkillInput.trim()) return
    const skill = newSkillInput.trim()
    if (isPreferred) {
      if (!preferredSkills.includes(skill)) setPreferredSkills([...preferredSkills, skill])
    } else {
      if (!requiredSkills.includes(skill)) setRequiredSkills([...requiredSkills, skill])
    }
    setNewSkillInput('')
  }

  const handleRemoveSkill = (skill: string, isPreferred = false) => {
    if (isPreferred) {
      setPreferredSkills(preferredSkills.filter((s) => s !== skill))
    } else {
      setRequiredSkills(requiredSkills.filter((s) => s !== skill))
    }
  }

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !jdText) {
      toast.error('Title and Job Description are required.')
      return
    }

    setIsSaving(true)
    if (!USE_MOCK) {
      try {
        const createdJob = await api.createJob({
          companyId: currentCompanyId || 'company-nova',
          title,
          department,
          location,
          type,
          jdText,
          requirements: {
            requiredSkills,
            preferredSkills,
            minExperience,
            minCgpa,
            gradYears,
            minTenth,
            minTwelfth,
          },
          status: 'Active',
        })
        setIsSaving(false)
        toast.success('Job posting created and candidates auto-ranked!')
        navigate(`/app/jobs/${createdJob.id}`)
      } catch (err: any) {
        setIsSaving(false)
        toast.error(err?.message || 'Failed to create job.')
      }
      return
    }

    setTimeout(() => {
      const createdJob = addJob({
        companyId: currentCompanyId,
        title,
        department,
        location,
        type,
        jdText,
        requirements: {
          requiredSkills,
          preferredSkills,
          minExperience,
          minCgpa,
          gradYears,
          minTenth,
          minTwelfth,
        },
        status: 'Active',
      })

      setIsSaving(false)
      toast.success('Job posting created and candidates auto-ranked!')
      navigate(`/app/jobs/${createdJob.id}`)
    }, 300)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/app/jobs')}
        >
          Back to Jobs
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-text">Create Job Opening</h1>
          <p className="text-xs text-muted">Post a new position and configure automated scoring criteria.</p>
        </div>
      </div>

      <form onSubmit={handleSaveJob} className="space-y-6">
        {/* Basic Details Card */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-soft space-y-4">
          <h2 className="text-base font-semibold text-text">1. Job Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Job Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lead Backend Engineer"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">Department</label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Engineering, Design, Analytics..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">Location</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Bengaluru (Hybrid), Remote, Delhi..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">Employment Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="flex h-9 w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-text">Job Description (JD) *</label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
                onClick={handleExtractRequirements}
                isLoading={isExtracting}
              >
                Extract Requirements (AI Parser)
              </Button>
            </div>
            <Textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste full Job Description here... We will automatically extract required skills, experience, and academic criteria."
              rows={8}
              required
            />
          </div>
        </div>

        {/* Requirements Card */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-soft space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-text">2. Scoring & Eligibility Criteria</h2>
              <p className="text-xs text-muted">
                These criteria directly govern how resumes are scored and ranked.
              </p>
            </div>
          </div>

          {/* Required Skills */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              Must-Have Skills (Full Weight)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-8 p-2 rounded-lg border border-border bg-gray-50/50">
              {requiredSkills.length === 0 ? (
                <span className="text-xs text-muted">No required skills yet. Extract from JD or add below.</span>
              ) : (
                requiredSkills.map((skill) => (
                  <SkillChip
                    key={skill}
                    name={skill}
                    status="required"
                    onRemove={() => handleRemoveSkill(skill, false)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Preferred Skills */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              Preferred Skills (Half Weight)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-8 p-2 rounded-lg border border-border bg-gray-50/50">
              {preferredSkills.length === 0 ? (
                <span className="text-xs text-muted">No preferred skills yet.</span>
              ) : (
                preferredSkills.map((skill) => (
                  <SkillChip
                    key={skill}
                    name={skill}
                    status="preferred"
                    onRemove={() => handleRemoveSkill(skill, true)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Add skill input */}
          <div className="flex gap-2">
            <Input
              value={newSkillInput}
              onChange={(e) => setNewSkillInput(e.target.value)}
              placeholder="Add additional skill (e.g. Next.js, Redis, GCP)"
              className="max-w-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddSkill(false)
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => handleAddSkill(false)}>
              Add Must-Have
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleAddSkill(true)}>
              Add Preferred
            </Button>
          </div>

          {/* Academic & Experience Constraints */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-3 border-t border-border">
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Min Experience (Yrs)</label>
              <Input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={minExperience}
                onChange={(e) => setMinExperience(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">Min CGPA (10-Scale)</label>
              <Input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={minCgpa}
                onChange={(e) => setMinCgpa(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">Min 10th Grade (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={minTenth}
                onChange={(e) => setMinTenth(parseInt(e.target.value, 10) || 0)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">Min 12th Grade (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={minTwelfth}
                onChange={(e) => setMinTwelfth(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => navigate('/app/jobs')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            Publish Job & Auto-Rank Candidates
          </Button>
        </div>
      </form>
    </div>
  )
}
