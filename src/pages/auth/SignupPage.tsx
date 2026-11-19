import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'

export const SignupPage: React.FC = () => {
  const navigate = useNavigate()
  const { registerCompany } = useAppStore()
  const [companyName, setCompanyName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName || !adminName || !adminEmail) {
      toast.error('Please fill in all required fields.')
      return
    }

    setLoading(true)
    setTimeout(() => {
      registerCompany(companyName, adminName, adminEmail)
      setLoading(false)
      toast.success('Organization registered! Let’s complete your setup.')
      navigate('/onboarding')
    }, 400)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl border border-border p-8 shadow-card">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
            ⚡
          </div>
          <span className="text-xl font-bold tracking-tight text-text">HireSwift</span>
        </div>

        <h1 className="text-2xl font-bold text-text">Create your organization</h1>
        <p className="text-sm text-muted mt-1 mb-6">
          Start hiring smarter with custom scoring and automated pipelines.
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">Company Name</label>
            <Input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Technologies India"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">Your Full Name (Admin)</label>
            <Input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="e.g. Ramesh Iyer"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">Work Email Address</label>
            <Input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="name@company.in"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button type="submit" variant="primary" className="w-full mt-4" isLoading={loading}>
            Create Account & Configure
          </Button>
        </form>

        <p className="text-xs text-center text-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
