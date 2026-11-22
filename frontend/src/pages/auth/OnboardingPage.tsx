import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import { Building2, Layers, Sliders, Users, Check, ArrowRight, ArrowLeft } from 'lucide-react'

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate()
  const { currentCompanyId, companies, updateCompany, updateCompanySettings, inviteTeamMember } = useAppStore()
  const company = companies.find((c) => c.id === currentCompanyId) || companies[0]

  const [step, setStep] = useState(1)

  // Step 1: Company details
  const [industry, setIndustry] = useState(company.industry || 'Technology')
  const [location, setLocation] = useState('Bengaluru, India')

  // Step 2: Hiring type
  const [hiringType, setHiringType] = useState<'experienced' | 'campus' | 'bulk'>('experienced')

  // Step 3: Pipeline stages
  const [stages, setStages] = useState(company.settings.pipelineStages)

  // Step 4: Invite team
  const [teamEmail, setTeamEmail] = useState('')
  const [teamRole, setTeamRole] = useState<'Recruiter' | 'HiringManager'>('Recruiter')
  const [invitedMembers, setInvitedMembers] = useState<{ email: string; role: 'Recruiter' | 'HiringManager' }[]>([])

  const handleSelectHiringType = (type: 'experienced' | 'campus' | 'bulk') => {
    setHiringType(type)
    if (type === 'campus') {
      updateCompanySettings(company.id, {
        scoringWeights: { skills: 20, experience: 5, education: 60, semantic: 15 },
        pipelineStages: [
          { id: 'applied', name: 'Applied', color: '#2563EB', isDefault: true },
          { id: 'oa', name: 'Online Assessment', color: '#3B82F6' },
          { id: 'interview', name: 'Technical Interview', color: '#F59E0B' },
          { id: 'offer', name: 'Offer Extended', color: '#16A34A', isHired: true },
          { id: 'rejected', name: 'Rejected', color: '#DC2626', isReject: true },
        ],
      })
      setStages([
        { id: 'applied', name: 'Applied', color: '#2563EB', isDefault: true },
        { id: 'oa', name: 'Online Assessment', color: '#3B82F6' },
        { id: 'interview', name: 'Technical Interview', color: '#F59E0B' },
        { id: 'offer', name: 'Offer Extended', color: '#16A34A', isHired: true },
        { id: 'rejected', name: 'Rejected', color: '#DC2626', isReject: true },
      ])
    } else if (type === 'experienced') {
      updateCompanySettings(company.id, {
        scoringWeights: { skills: 45, experience: 35, education: 10, semantic: 10 },
        pipelineStages: [
          { id: 'applied', name: 'Applied', color: '#2563EB', isDefault: true },
          { id: 'shortlisted', name: 'Shortlisted', color: '#7C3AED' },
          { id: 'interview', name: 'Technical Interview', color: '#F59E0B' },
          { id: 'offer', name: 'Offer', color: '#16A34A', isHired: true },
          { id: 'rejected', name: 'Rejected', color: '#DC2626', isReject: true },
        ],
      })
      setStages([
        { id: 'applied', name: 'Applied', color: '#2563EB', isDefault: true },
        { id: 'shortlisted', name: 'Shortlisted', color: '#7C3AED' },
        { id: 'interview', name: 'Technical Interview', color: '#F59E0B' },
        { id: 'offer', name: 'Offer', color: '#16A34A', isHired: true },
        { id: 'rejected', name: 'Rejected', color: '#DC2626', isReject: true },
      ])
    } else {
      updateCompanySettings(company.id, {
        scoringWeights: { skills: 35, experience: 20, education: 30, semantic: 15 },
      })
    }
  }

  const handleAddInvite = () => {
    if (!teamEmail || !teamEmail.includes('@')) {
      toast.error('Enter a valid email address')
      return
    }
    setInvitedMembers([...invitedMembers, { email: teamEmail, role: teamRole }])
    inviteTeamMember(teamEmail.split('@')[0], teamEmail, teamRole)
    setTeamEmail('')
    toast.success(`Invite recorded for ${teamEmail}`)
  }

  const handleFinish = () => {
    updateCompany(company.id, { industry })
    toast.success('Workspace configured successfully! Welcome to HireSwift.')
    navigate('/app/dashboard')
  }

  const steps = [
    { num: 1, title: 'Company Details', icon: Building2 },
    { num: 2, title: 'Hiring Model', icon: Sliders },
    { num: 3, title: 'Hiring Stages', icon: Layers },
    { num: 4, title: 'Invite Team', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl border border-border p-8 shadow-card">
        {/* Header with step progress */}
        <div className="flex items-center justify-between pb-6 border-b border-border">
          <div>
            <h1 className="text-xl font-bold text-text">Setup your organization — Workspace Setup</h1>
            <p className="text-xs text-muted mt-0.5">Configure your organization in 4 quick steps</p>
          </div>
          <div className="flex items-center gap-2">
            {steps.map((s) => (
              <div
                key={s.num}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  step === s.num
                    ? 'bg-primary text-white shadow-xs'
                    : step > s.num
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-gray-100 text-muted'
                }`}
              >
                {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Company Details */}
        {step === 1 && (
          <div className="py-6 space-y-4">
            <h2 className="text-base font-semibold text-text">Tell us about {company.name}</h2>
            <div>
              <label className="block text-xs font-semibold text-text mb-1.5">Industry Domain</label>
              <Input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Fintech, E-Commerce, Edtech, IT Services"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text mb-1.5">Primary Hiring Hub</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bengaluru, Delhi NCR, Pune, Remote"
              />
            </div>
          </div>
        )}

        {/* Step 2: Hiring Model */}
        {step === 2 && (
          <div className="py-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-text">Select your primary hiring focus</h2>
              <p className="text-xs text-muted mt-1">
                We will preload optimized scoring weights and resume parsers tailored to your focus.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div
                onClick={() => handleSelectHiringType('experienced')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  hiringType === 'experienced'
                    ? 'border-primary bg-indigo-50/50 shadow-xs'
                    : 'border-border hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-sm text-text">Experienced Lateral</div>
                <p className="text-xs text-muted mt-1">
                  Skills & practical experience heavy (45% Skills, 35% Experience).
                </p>
                <Badge variant="default" size="sm" className="mt-3">
                  Startups & Scaleups
                </Badge>
              </div>

              <div
                onClick={() => handleSelectHiringType('campus')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  hiringType === 'campus'
                    ? 'border-primary bg-indigo-50/50 shadow-xs'
                    : 'border-border hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-sm text-text">University Campus</div>
                <p className="text-xs text-muted mt-1">
                  Academic heavy (60% Education, 10th/12th/CGPA cutoffs, Tier-1 weighting).
                </p>
                <Badge variant="warning" size="sm" className="mt-3">
                  Freshers 2024-2026
                </Badge>
              </div>

              <div
                onClick={() => handleSelectHiringType('bulk')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  hiringType === 'bulk'
                    ? 'border-primary bg-indigo-50/50 shadow-xs'
                    : 'border-border hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-sm text-text">High-Volume Bulk</div>
                <p className="text-xs text-muted mt-1">
                  Balanced weights with automated duplicate resolution and quick reject rules.
                </p>
                <Badge variant="secondary" size="sm" className="mt-3">
                  Enterprise Teams
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Pipeline Stages */}
        {step === 3 && (
          <div className="py-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-text">Your Recruitment Pipeline</h2>
              <p className="text-xs text-muted mt-1">
                Candidates will move sequentially through these Kanban stages.
              </p>
            </div>

            <div className="space-y-2">
              {stages.map((stage, idx) => (
                <div
                  key={stage.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-gray-50/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-white border border-border text-xs flex items-center justify-center font-bold text-muted">
                      {idx + 1}
                    </span>
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm font-medium text-text">{stage.name}</span>
                  </div>
                  <Badge variant="outline" size="sm">
                    {stage.isDefault ? 'Initial Stage' : stage.isHired ? 'Terminal (Hired)' : stage.isReject ? 'Terminal (Reject)' : 'Interview'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Invite Team */}
        {step === 4 && (
          <div className="py-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-text">Invite your hiring teammates</h2>
              <p className="text-xs text-muted mt-1">
                Collaborate on candidate shortlists, reviews, and scorecards.
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                type="email"
                value={teamEmail}
                onChange={(e) => setTeamEmail(e.target.value)}
                placeholder="teammate@company.com"
                className="flex-1"
              />
              <select
                value={teamRole}
                onChange={(e) => setTeamRole(e.target.value as 'Recruiter' | 'HiringManager')}
                className="h-9 px-3 text-xs rounded-lg border border-border bg-white text-text"
              >
                <option value="Recruiter">Recruiter</option>
                <option value="HiringManager">Hiring Manager</option>
              </select>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddInvite}>
                Add
              </Button>
            </div>

            {invitedMembers.length > 0 && (
              <div className="space-y-1 mt-3">
                <p className="text-xs font-semibold text-muted">Queued Invites:</p>
                {invitedMembers.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded border border-border">
                    <span>{m.email}</span>
                    <Badge variant="default" size="sm">{m.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          {step === 1 && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => setStep(2)}
            >
              Continue to Hiring Model
            </Button>
          )}

          {step === 2 && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => setStep(3)}
            >
              Next: Pipeline Stages
            </Button>
          )}

          {step === 3 && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => setStep(4)}
            >
              Next: Team Members
            </Button>
          )}

          {step === 4 && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              rightIcon={<Check className="w-4 h-4" />}
              onClick={handleFinish}
            >
              Launch Workspace
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
