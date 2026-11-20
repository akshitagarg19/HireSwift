import React, { useState, useMemo } from 'react'
import { useAppStore } from '@/store'
import { Badge } from '@/components/ui/Badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { BarChart3, AlertCircle, TrendingUp, MapPin, GraduationCap, CheckCircle2 } from 'lucide-react'

export const InsightsPage: React.FC = () => {
  const { currentCompanyId, candidates, jobs, applications } = useAppStore()

  const [selectedJobId, setSelectedJobId] = useState<string>('all')

  const companyJobs = jobs.filter((j) => j.companyId === currentCompanyId)
  const companyCandidates = candidates.filter((c) => c.companyId === currentCompanyId)
  const companyApplications = applications.filter((a) => a.companyId === currentCompanyId)

  const relevantApps = selectedJobId === 'all'
    ? companyApplications
    : companyApplications.filter((a) => a.jobId === selectedJobId)

  // 1. Skill Supply vs Demand
  const skillFrequency: Record<string, number> = {}
  companyCandidates.forEach((c) => {
    c.skills.forEach((s) => {
      skillFrequency[s] = (skillFrequency[s] || 0) + 1
    })
  })

  const topSkillsData = Object.entries(skillFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([skill, count]) => ({
      skill,
      applicants: count,
    }))

  // 2. Top Missing Skills across current job applications
  const missingSkillFrequency: Record<string, number> = {}
  relevantApps.forEach((a) => {
    a.missingSkills.forEach((s) => {
      missingSkillFrequency[s] = (missingSkillFrequency[s] || 0) + 1
    })
  })

  const topMissingData = Object.entries(missingSkillFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill, count]) => ({
      skill,
      count,
    }))

  // 3. Applicants by College
  const collegeFrequency: Record<string, number> = {}
  companyCandidates.forEach((c) => {
    const shortName = c.college.split('(')[0].trim()
    collegeFrequency[shortName] = (collegeFrequency[shortName] || 0) + 1
  })

  const collegeData = Object.entries(collegeFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([college, count]) => ({
      college,
      count,
    }))

  // 4. Source Effectiveness
  const sourceFrequency: Record<string, number> = {}
  companyCandidates.forEach((c) => {
    sourceFrequency[c.source] = (sourceFrequency[c.source] || 0) + 1
  })

  const sourceData = Object.entries(sourceFrequency).map(([name, value]) => ({
    name,
    value,
  }))

  const COLORS = ['#4F46E5', '#14B8A6', '#F59E0B', '#EC4899', '#8B5CF6']

  // 5. Dynamic Data Callouts
  const totalPool = companyCandidates.length
  const k8sCount = companyCandidates.filter((c) => c.skills.includes('Kubernetes') || c.skills.includes('K8s')).length
  const tier1Count = companyCandidates.filter((c) => c.tier === 'Tier-1').length
  const highCgpaCount = companyCandidates.filter((c) => (c.cgpa ?? 0) >= 8.5).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Talent Pool Insights & Analytics
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Skill supply vs demand metrics, educational diversity, and channel conversion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted">Scope:</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="h-8 px-3 rounded-lg border border-border bg-white text-xs font-semibold text-text"
          >
            <option value="all">All Jobs Combined</option>
            {companyJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dynamic Key Data Callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase">
            <AlertCircle className="w-4 h-4 text-primary" />
            Critical Skill Gap Callout
          </div>
          <p className="text-xs text-indigo-950 font-medium leading-relaxed">
            Only <strong className="font-extrabold text-primary">{k8sCount} of {totalPool}</strong> applicants ({Math.round((k8sCount / totalPool) * 100)}%) possess Kubernetes skills in this pool.
          </p>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            Tier-1 Institution Ratio
          </div>
          <p className="text-xs text-emerald-950 font-medium leading-relaxed">
            <strong className="font-extrabold text-emerald-700">{tier1Count}</strong> applicants ({Math.round((tier1Count / totalPool) * 100)}%) originate from premier IIT / BITS / NIT campuses.
          </p>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            High Academic Distinction
          </div>
          <p className="text-xs text-amber-950 font-medium leading-relaxed">
            <strong className="font-extrabold text-amber-700">{highCgpaCount}</strong> candidates ({Math.round((highCgpaCount / totalPool) * 100)}%) maintain an academic CGPA of 8.5 or higher.
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Skill Supply */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text">Skill Supply Frequency</h3>
            <Badge variant="outline" size="sm">Top Technologies</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSkillsData} layout="vertical" margin={{ top: 5, right: 20, left: 25, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="skill" type="category" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="applicants" fill="#4F46E5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top Missing Skills */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text">Highest Frequency Missing Requirements</h3>
            <Badge variant="danger" size="sm">Deficit Gaps</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMissingData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="skill" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: College Representation */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text">Applicants by College Campus</h3>
            <Badge variant="outline" size="sm">Universities</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collegeData} margin={{ top: 5, right: 10, left: -20, bottom: 30 }}>
                <XAxis dataKey="college" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#14B8A6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Sourcing Channels */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text">Candidate Sourcing Channels</h3>
            <Badge variant="secondary" size="sm">Channel Attribution</Badge>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
