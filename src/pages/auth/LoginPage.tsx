import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, Users } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAppStore()
  const [email, setEmail] = useState('admin@novalabs.com')
  const [password, setPassword] = useState('demo123')
  const [loading, setLoading] = useState(false)

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    setTimeout(() => {
      const ok = login(email)
      setLoading(false)
      if (ok) {
        toast.success('Signed in successfully!')
        navigate('/app/dashboard')
      } else {
        toast.error('Invalid credentials. Use one of the demo logins below.')
      }
    }, 300)
  }

  const fillDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('demo123')
  }

  const handleQuickDemoLogin = (demoEmail: string) => {
    fillDemoLogin(demoEmail)
    const ok = login(demoEmail)
    if (ok) {
      toast.success('Signed in as Demo User')
      navigate('/app/dashboard')
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* LEFT: Sign-in Form */}
      <div className="flex flex-col justify-center px-8 sm:px-16 lg:px-20 py-12 bg-white border-r border-border">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xl shadow-sm">
              ⚡
            </div>
            <span className="text-xl font-bold tracking-tight text-text">HireSwift</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text">Welcome back</h1>
            <p className="text-sm text-muted mt-1">
              Sign in to manage your talent pipeline and candidate rankings.
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text mb-1.5">Email address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-text">Password</label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); toast.info('For demo accounts, use password "demo123"'); }} className="text-xs text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
              Sign In
            </Button>

            <button
              type="button"
              onClick={() => {
                fillDemoLogin('admin@novalabs.com')
                login('admin@novalabs.com')
                toast.success('Signed in with Google (Demo Mock)')
                navigate('/app/dashboard')
              }}
              className="w-full flex items-center justify-center gap-2 h-9 px-4 rounded-lg border border-border text-xs font-medium text-text bg-white hover:bg-gray-50 transition-colors shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google (Demo)
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs font-semibold text-muted mb-2">QUICK DEMO LOGINS (Click to fill):</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin@novalabs.com')}
                className="p-2 rounded-lg border border-border bg-gray-50 hover:bg-indigo-50/60 hover:border-indigo-200 text-left transition-colors"
              >
                <div className="font-semibold text-text">Demo Login: Nova Labs</div>
                <div className="text-[11px] text-muted">admin@novalabs.com (Admin)</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin@campushire.com')}
                className="p-2 rounded-lg border border-border bg-gray-50 hover:bg-indigo-50/60 hover:border-indigo-200 text-left transition-colors"
              >
                <div className="font-semibold text-text">Demo Login: Campus Hire</div>
                <div className="text-[11px] text-muted">admin@campushire.com (Admin)</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('recruiter@novalabs.com')}
                className="p-2 rounded-lg border border-border bg-gray-50 hover:bg-indigo-50/60 hover:border-indigo-200 text-left transition-colors"
              >
                <div className="font-semibold text-text">Demo Login: Recruiter</div>
                <div className="text-[11px] text-muted">recruiter@novalabs.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('viewer@novalabs.com')}
                className="p-2 rounded-lg border border-border bg-gray-50 hover:bg-indigo-50/60 hover:border-indigo-200 text-left transition-colors"
              >
                <div className="font-semibold text-text">Demo Login: Viewer</div>
                <div className="text-[11px] text-muted">viewer@novalabs.com (Read-Only)</div>
              </button>
            </div>
          </div>

          <p className="text-xs text-center text-muted mt-6">
            Don't have a company account yet?{' '}
            <Link to="/signup" className="text-primary font-semibold hover:underline">
              Create an organization
            </Link>
          </p>
        </div>
      </div>

      {/* RIGHT: Marketing Hero Panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white relative overflow-hidden">
        {/* Background Decorative Circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-medium text-indigo-200 mb-6">
            <Zap className="w-3.5 h-3.5 text-teal-400" />
            Designed for Indian Fast-Growing Tech Teams
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight max-w-lg">
            Shortlist in minutes, not weeks.
          </h2>
          <p className="mt-4 text-base text-indigo-200 max-w-md leading-relaxed">
            AI-driven resume parsing, synonym-aware skill evaluation, 10-point CGPA & percentage normalization, and bias-free blind screening.
          </p>
        </div>

        {/* Feature highlight cards */}
        <div className="space-y-4 relative z-10 max-w-md">
          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold">Granular Scoring Engine</h4>
              <p className="text-xs text-indigo-200 mt-0.5">
                Sliders for skills, experience, education, and semantic similarity with instant re-ranking.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold">Blind Screening & Fairness Audit</h4>
              <p className="text-xs text-indigo-200 mt-0.5">
                Mask demographic identifiers and measure Adverse Impact Ratio across colleges & tiers.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-start gap-3">
            <Users className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold">Strict Multi-Tenant Isolation</h4>
              <p className="text-xs text-indigo-200 mt-0.5">
                Toggle between tech startup and high-volume campus hiring workspaces seamlessly.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-indigo-300 pt-6 border-t border-white/10">
          <span>HireSwift v1.0 • Enterprise Edition</span>
          <span>© 2026 HireSwift Technologies</span>
        </div>
      </div>
    </div>
  )
}
