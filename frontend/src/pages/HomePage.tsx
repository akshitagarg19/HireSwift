import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { SkillChip } from '@/components/ui/SkillChip'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Avatar } from '@/components/ui/Avatar'
import { toast } from 'sonner'
import { isFeatureEnabled } from '@/config/features'
import {
  Zap,
  CheckCircle2,
  XCircle,
  FileText,
  Sliders,
  Filter,
  Kanban,
  Scale,
  Copy,
  Mail,
  BarChart3,
  ShieldCheck,
  Check,
  ChevronDown,
  ArrowRight,
  Menu,
  X,
  Sparkles,
  Users,
  GraduationCap,
  Building,
} from 'lucide-react'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { currentUser, login } = useAppStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Live Interactive Demo State for "Why HireSwift" section
  const [demoWeights, setDemoWeights] = useState({
    skills: 45,
    experience: 35,
    education: 20,
  })

  // 5 sample candidates for the interactive slider demo
  const sampleCandidates = [
    { id: '1', name: 'Aarav Sharma', college: 'IIT Delhi', cgpa: 9.1, exp: 4, skills: 95, expScore: 90, eduScore: 92 },
    { id: '2', name: 'Priya Patel', college: 'BITS Pilani', cgpa: 8.4, exp: 2.5, skills: 88, expScore: 80, eduScore: 85 },
    { id: '3', name: 'Rohan Verma', college: 'NIT Trichy', cgpa: 9.8, exp: 0.5, skills: 70, expScore: 40, eduScore: 98 },
    { id: '4', name: 'Ananya Iyer', college: 'DTU Delhi', cgpa: 7.9, exp: 5, skills: 92, expScore: 98, eduScore: 78 },
    { id: '5', name: 'Vikram Malhotra', college: 'VIT Vellore', cgpa: 8.8, exp: 3, skills: 84, expScore: 85, eduScore: 88 },
  ]

  const rankedSampleCandidates = [...sampleCandidates]
    .map((c) => {
      const totalW = demoWeights.skills + demoWeights.experience + demoWeights.education || 100
      const score = Math.round(
        (c.skills * demoWeights.skills + c.exp * 20 * demoWeights.experience + c.eduScore * demoWeights.education) / totalW
      )
      return { ...c, computedScore: Math.min(99, Math.max(10, score)) }
    })
    .sort((a, b) => b.computedScore - a.computedScore)

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const appRoute = isFeatureEnabled('enableDashboard') ? '/app/dashboard' : '/app/upload'
  const authRoute = isFeatureEnabled('enableAuth') ? '/signup' : appRoute
  const loginRoute = isFeatureEnabled('enableAuth') ? '/login' : appRoute

  const handleLiveDemoClick = () => {
    login('admin@novalabs.com')
    toast.success('Launching HireSwift Workspace')
    navigate(appRoute)
  }

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans">
      {/* 1. STICKY NAVBAR */}
      <header
        id="navbar"
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border transition-all"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
              ⚡
            </div>
            <span className="text-lg font-bold tracking-tight text-text flex items-center gap-1.5">
              HireSwift
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                ATS
              </span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-muted">
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-text transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-text transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('why-us')}
              className="hover:text-text transition-colors"
            >
              Why Us
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="hover:text-text transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="hover:text-text transition-colors"
            >
              FAQ
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser || !isFeatureEnabled('enableAuth') ? (
              <Link to={appRoute}>
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Launch App
                </Button>
              </Link>
            ) : (
              <>
                <Link to={loginRoute}>
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link to={authRoute}>
                  <Button variant="primary" size="sm">
                    Start Free
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-muted hover:text-text hover:bg-gray-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-white px-4 pt-2 pb-4 space-y-2 text-sm font-medium">
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left py-2 text-muted hover:text-text"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left py-2 text-muted hover:text-text"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="block w-full text-left py-2 text-muted hover:text-text"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="block w-full text-left py-2 text-muted hover:text-text"
            >
              FAQ
            </button>
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              {currentUser || !isFeatureEnabled('enableAuth') ? (
                <Link to={appRoute} className="w-full">
                  <Button variant="primary" size="sm" className="w-full">
                    Launch App
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to={loginRoute} className="w-full">
                    <Button variant="outline" size="sm" className="w-full">
                      Sign in
                    </Button>
                  </Link>
                  <Link to={authRoute} className="w-full">
                    <Button variant="primary" size="sm" className="w-full">
                      Start Free
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section id="hero" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-primary">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Automated Resume Ingestion & Transparent Ranking
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text tracking-tight leading-tight">
              Shortlist in minutes, <br className="hidden sm:block" />
              <span className="text-primary">not weeks.</span>
            </h1>

            <p className="text-base sm:text-lg text-muted max-w-xl mx-auto lg:mx-0 leading-relaxed">
              The smart ATS for small hiring teams in India. Parse hundreds of resumes, rank candidates with explainable scores, and move them through your pipeline.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              <Link to={authRoute}>
                <Button variant="primary" size="lg" className="w-full sm:w-auto font-semibold">
                  Start free
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                onClick={handleLiveDemoClick}
                className="w-full sm:w-auto font-semibold"
                rightIcon={<ArrowRight className="w-4 h-4 text-primary" />}
              >
                Try live demo
              </Button>
            </div>

            <p className="text-xs text-muted flex items-center justify-center lg:justify-start gap-4">
              <span>✓ No credit card required</span>
              <span>✓ 2 pre-seeded workspaces</span>
              <span>✓ Instant setup</span>
            </p>
          </div>

          {/* Right Product Preview (Built from real UI components) */}
          <div className="lg:col-span-5">
            <div className="bg-card rounded-2xl border border-border p-5 shadow-card space-y-3.5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-xs font-bold text-text ml-2">Senior Full Stack Engineer</span>
                </div>
                <Badge variant="success" size="sm">Active Ranking</Badge>
              </div>

              {/* Sample ranked candidate list */}
              <div className="space-y-2">
                {[
                  { name: 'Aarav Sharma', college: 'IIT Delhi', exp: '4y exp', score: 94, skills: ['React', 'TypeScript', 'Node.js'], stage: 'shortlisted' },
                  { name: 'Priya Patel', college: 'BITS Pilani', exp: '3y exp', score: 88, skills: ['Node.js', 'PostgreSQL', 'AWS'], stage: 'interview' },
                  { name: 'Rohan Verma', college: 'NIT Trichy', exp: '2y exp', score: 82, skills: ['React', 'Redux', 'Tailwind'], stage: 'applied' },
                ].map((cand, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-border bg-gray-50/60 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={cand.name} size="sm" />
                      <div className="min-w-0">
                        <div className="font-bold text-text truncate">{cand.name}</div>
                        <div className="text-[10px] text-muted truncate">{cand.college} • {cand.exp}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge stage={cand.stage} />
                      <ScoreRing score={cand.score} size="sm" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                <span className="text-indigo-900 font-semibold">AI Explanatory Match:</span>
                <span className="text-primary font-bold">94% Fit Score</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TRUST STRIP */}
      <section id="trust" className="bg-white border-y border-border py-8 px-4">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            Built for startups, campus hiring teams, and small agencies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-1">
            <span className="px-3.5 py-1.5 rounded-full bg-gray-100 text-xs font-semibold text-text border border-gray-200">
              ⚡ 500 resumes per batch
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-gray-100 text-xs font-semibold text-text border border-gray-200">
              📊 Explainable scoring
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-gray-100 text-xs font-semibold text-text border border-gray-200">
              🏢 Per-company scoring weights
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-gray-100 text-xs font-semibold text-text border border-gray-200">
              🛡️ Blind screening & audit
            </span>
          </div>
        </div>
      </section>

      {/* 4. PROBLEM -> SOLUTION COMPARISON */}
      <section id="comparison" className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text">Tired of drowning in PDF resumes?</h2>
          <p className="text-xs sm:text-sm text-muted">See how HireSwift transforms your screening workflow.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Before */}
          <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-soft space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <XCircle className="w-5 h-5" />
              Before HireSwift
            </div>
            <ul className="space-y-3 text-xs text-muted">
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                Hundreds of unstructured PDFs cluttering recruiter inboxes.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                Manual keyword searching and inconsistent evaluation criteria.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                Weeks of review latency before candidates hear back.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                Accidental duplicate interviews from repeated portal submissions.
              </li>
            </ul>
          </div>

          {/* With HireSwift */}
          <div className="bg-indigo-50/50 rounded-2xl border border-indigo-200 p-6 shadow-soft space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
              With HireSwift
            </div>
            <ul className="space-y-3 text-xs text-text font-medium">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                Batch upload up to 500 resumes with automated field extraction.
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                Explainable scoring engine with synonym-aware skill matching.
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                Shortlist generated in under 3 minutes with full evidence audit.
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                Automated duplicate detection and 1-click candidate consolidation.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. FEATURES GRID */}
      <section id="features" className="py-16 bg-white border-y border-border px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text">
              Everything modern hiring teams need
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Built end-to-end for Indian high-growth tech firms and campus recruiters.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Bulk Resume Parsing', desc: 'Ingest PDF and DOCX documents in batches up to 500 files with automated confidence indicators.', icon: FileText },
              { title: 'Match Scoring Engine', desc: 'Score candidates 0-100 against your custom JD using skills, experience, CGPA, and TF-IDF semantics.', icon: Sliders },
              { title: 'Natural Language Filters', desc: 'Filter by CGPA, 10th/12th marks, locations, and type queries like "Python grads > 8 CGPA".', icon: Filter },
              { title: 'Hiring Pipeline Kanban', desc: 'Drag-and-drop candidates across customized stages with toast undo and logged rejection audit reasons.', icon: Kanban },
              { title: 'Side-by-Side Comparison', desc: 'Compare 2 to 4 candidates side-by-side with metric highlighting and automated AI recommendations.', icon: Scale },
              { title: 'Duplicate Consolidation', desc: 'Detect repeat applicants across multiple email addresses and phone numbers with 1-click merge.', icon: Copy },
              { title: 'Bulk Email Automation', desc: 'Dispatch personalized email templates with variable tags ({{candidate_name}}, {{interview_date}}).', icon: Mail },
              { title: 'Skill-Gap Analytics', desc: 'Identify supply vs demand deficits in your candidate pool with visual recruitment funnels.', icon: BarChart3 },
            ].map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="p-5 rounded-2xl border border-border bg-card shadow-soft hover:border-indigo-300 transition-all space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-primary flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-text">{f.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 6. "WHY HIRESWIFT" (USP) WITH INTERACTIVE LIVE SLIDER DEMO */}
      <section id="why-us" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <Badge variant="default" size="sm">Why HireSwift</Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text">
            4 Pillars of Modern Talent Acquisition
          </h2>
          <p className="text-xs sm:text-sm text-muted">
            See how custom scoring weights change candidate rankings in real time below.
          </p>
        </div>

        {/* 4 Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-white space-y-1">
            <span className="text-primary font-bold text-xs">01 / SPEED</span>
            <h4 className="font-bold text-sm">Under 3 Minutes</h4>
            <p className="text-xs text-muted">Go from raw file upload to a ranked shortlist in less than 3 minutes.</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-white space-y-1">
            <span className="text-primary font-bold text-xs">02 / EXPLAINABILITY</span>
            <h4 className="font-bold text-sm">Zero Black Box</h4>
            <p className="text-xs text-muted">Every score displays exact percentage breakdowns and evidence snippets.</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-white space-y-1">
            <span className="text-primary font-bold text-xs">03 / MULTI-TENANT</span>
            <h4 className="font-bold text-sm">Tuned to Your Focus</h4>
            <p className="text-xs text-muted">Campus hiring uses CGPA cutoffs; startups prioritize modern engineering skills.</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-white space-y-1">
            <span className="text-primary font-bold text-xs">04 / FAIRNESS</span>
            <h4 className="font-bold text-sm">Fair by Design</h4>
            <p className="text-xs text-muted">App-wide blind screening mode and Four-Fifths Adverse Impact audit.</p>
          </div>
        </div>

        {/* Interactive Live Re-Rank Demo */}
        <div className="bg-card rounded-2xl border border-indigo-200 p-6 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Interactive Demo: Drag Sliders to Watch Candidates Re-Rank Live
              </h3>
              <p className="text-xs text-muted">
                Adjust the weights of Skills, Experience, and Education to see instant ranking shifts.
              </p>
            </div>
            <Badge variant="outline" size="sm">Client-Side Engine</Badge>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded-xl border border-border space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span>Skills Fit</span>
                <span className="text-primary">{demoWeights.skills}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                aria-label="Skills Fit Weight"
                value={demoWeights.skills}
                onChange={(e) => setDemoWeights({ ...demoWeights, skills: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-border space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span>Experience</span>
                <span className="text-primary">{demoWeights.experience}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                aria-label="Experience Weight"
                value={demoWeights.experience}
                onChange={(e) => setDemoWeights({ ...demoWeights, experience: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-border space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span>Education & CGPA</span>
                <span className="text-primary">{demoWeights.education}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                aria-label="Education and CGPA Weight"
                value={demoWeights.education}
                onChange={(e) => setDemoWeights({ ...demoWeights, education: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>

          {/* Live Re-ranked List */}
          <div className="space-y-2">
            {rankedSampleCandidates.map((c, rank) => (
              <div
                key={c.id}
                className="p-3 bg-white rounded-xl border border-border flex items-center justify-between text-xs transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-center font-bold text-muted">#{rank + 1}</span>
                  <Avatar name={c.name} size="sm" />
                  <div>
                    <span className="font-bold text-text">{c.name}</span>
                    <span className="text-muted text-[11px] block">{c.college} • {c.exp} yrs exp • CGPA {c.cgpa}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-muted text-[11px] hidden sm:inline">Score:</span>
                  <ScoreRing score={c.computedScore} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. HOW IT WORKS */}
      <section id="how-it-works" className="py-16 bg-white border-y border-border px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text">How HireSwift Works</h2>
            <p className="text-xs sm:text-sm text-muted">4 structured steps to close positions faster.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Upload Resumes', desc: 'Drag-and-drop batches of PDF/DOCX resumes. The parser extracts contacts, education, and skills.', icon: FileText },
              { step: '02', title: 'Post or Select a Job', desc: 'Paste your Job Description. Our AI extracts required and preferred skills with one click.', icon: Sliders },
              { step: '03', title: 'Review Shortlist', desc: 'Candidates are ranked automatically with explainable scores and transparent evidence snippets.', icon: Sparkles },
              { step: '04', title: 'Interview & Hire', desc: 'Progress applicants through the Kanban pipeline, compare finalists, and send batch emails.', icon: Kanban },
            ].map((s, i) => (
              <div key={i} className="p-5 rounded-2xl border border-border bg-card shadow-soft space-y-3">
                <span className="text-2xl font-black text-primary/30">{s.step}</span>
                <h3 className="font-bold text-sm text-text">{s.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. BUILT FOR INDIA */}
      <section id="built-for-india" className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-card space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-teal-300">
            🇮🇳 Tailored for Indian Hiring Workflows
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Designed for Indian Campuses, Startups & Tech Hubs
          </h2>

          <p className="text-sm text-indigo-200 leading-relaxed max-w-2xl">
            Generic Western ATS platforms fail when parsing Indian resumes. HireSwift was engineered specifically for Indian university grading scales and recruitment seasons.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-white/10 border border-white/10 space-y-1">
              <h4 className="font-bold text-xs text-white">CGPA Normalization</h4>
              <p className="text-[11px] text-indigo-200">
                Native normalization for 10-point CGPA scales and CBSE/State Board percentage conversions.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/10 border border-white/10 space-y-1">
              <h4 className="font-bold text-xs text-white">Class 10th & 12th Cutoffs</h4>
              <p className="text-[11px] text-indigo-200">
                Filter by senior secondary board percentages required by campus qualification standards.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/10 border border-white/10 space-y-1">
              <h4 className="font-bold text-xs text-white">Target Batch Batches</h4>
              <p className="text-[11px] text-indigo-200">
                Target specific graduation years (e.g. 2024, 2025, 2026) with automated cutoff enforcement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. PRICING */}
      <section id="pricing" className="py-16 bg-white border-y border-border px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text">Simple, Transparent Pricing</h2>
            <p className="text-xs sm:text-sm text-muted">
              Choose the tier that fits your hiring velocity. Demo pricing shown.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Tier 1 */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-soft space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <Badge variant="secondary" size="sm">Starter Free</Badge>
                <div className="text-3xl font-extrabold text-text">₹0 <span className="text-xs font-normal text-muted">/ forever</span></div>
                <p className="text-xs text-muted">For founders making their first 5 technical hires.</p>
                <ul className="space-y-2.5 text-xs text-text pt-2">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Up to 2 active jobs</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> 100 resumes per batch</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Standard scoring weights</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Basic Kanban pipeline</li>
                </ul>
              </div>
              <Link to={authRoute}>
                <Button variant="outline" className="w-full">Get Started</Button>
              </Link>
            </div>

            {/* Tier 2 */}
            <div className="p-6 rounded-2xl border-2 border-primary bg-indigo-50/20 shadow-card space-y-5 flex flex-col justify-between relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider">
                Most Popular
              </div>
              <div className="space-y-4">
                <Badge variant="default" size="sm">Team Scale</Badge>
                <div className="text-3xl font-extrabold text-text">₹4,999 <span className="text-xs font-normal text-muted">/ month</span></div>
                <p className="text-xs text-muted">For high-velocity engineering and product startups.</p>
                <ul className="space-y-2.5 text-xs text-text pt-2">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Unlimited active jobs</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> 500 resumes per batch</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Custom slider weights & synonyms</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Bulk email & duplicate merge</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Blind screening compliance</li>
                </ul>
              </div>
              <Link to={authRoute}>
                <Button variant="primary" className="w-full">Start 14-Day Trial</Button>
              </Link>
            </div>

            {/* Tier 3 */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-soft space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <Badge variant="secondary" size="sm">Campus & Enterprise</Badge>
                <div className="text-3xl font-extrabold text-text">₹12,499 <span className="text-xs font-normal text-muted">/ month</span></div>
                <p className="text-xs text-muted">For university campus drives and recruitment agencies.</p>
                <ul className="space-y-2.5 text-xs text-text pt-2">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Multi-tenant workspace separation</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Unlimited resume parsing</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Adverse Impact 80% audit panel</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Custom fields & RBAC roles</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Dedicated support & API access</li>
                </ul>
              </div>
              <Link to={authRoute}>
                <Button variant="outline" className="w-full">Contact Sales</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FAQ ACCORDION */}
      <section id="faq" className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text">Frequently Asked Questions</h2>
          <p className="text-xs sm:text-sm text-muted">Everything you need to know about HireSwift ATS.</p>
        </div>

        <div className="space-y-3">
          {[
            { q: 'Which file formats are supported for resume upload?', a: 'HireSwift supports PDF and Microsoft Word (DOCX) files. You can batch upload up to 500 resumes at once via drag-and-drop.' },
            { q: 'How does the Match Scoring algorithm compute rankings?', a: 'Match scores range from 0-100 based on four configurable components: Skills Coverage (synonym-aware), Practical Experience fit, Academic performance (CGPA, 10th/12th), and TF-IDF semantic cosine similarity between the resume text and the job description.' },
            { q: 'Can I customize scoring weights per company or job opening?', a: 'Yes. Scoring weights are fully configurable with interactive sliders that always total 100%. Adjusting weights re-ranks candidate applications live.' },
            { q: 'How does HireSwift handle data privacy and retention?', a: 'HireSwift complies with the Digital Personal Data Protection (DPDP) Act. You can set automated retention periods (e.g. 180 days) after which data is purged, and candidates can request erasure.' },
            { q: 'What is Blind Screening Mode and how does it prevent bias?', a: 'Blind mode automatically masks candidate names, photos, gender, college tiers, and geographic locations during the initial screening round to eliminate unconscious bias.' },
            { q: 'How does duplicate candidate detection work?', a: 'When candidates submit repeated applications using different email variants or updated resumes, HireSwift analyzes phone numbers, email prefixes, and names to group duplicates with a 1-click merge workflow.' },
            { q: 'Can I import and export candidate data?', a: 'Yes. You can export filtered candidate views to CSV or export full organizational JSON datasets at any time from Settings.' },
          ].map((item, idx) => {
            const isOpen = openFaq === idx
            return (
              <div
                key={idx}
                className="rounded-xl border border-border bg-white overflow-hidden shadow-soft transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between p-4 text-left text-xs sm:text-sm font-bold text-text hover:bg-gray-50/70 transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted transition-transform duration-200 shrink-0 ml-2 ${
                      isOpen ? 'transform rotate-180 text-primary' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-muted leading-relaxed border-t border-gray-100 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* 11. FINAL CTA BAND */}
      <section id="cta" className="bg-primary text-white py-16 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Ready to hire faster?</h2>
          <p className="text-sm sm:text-base text-indigo-100 max-w-xl mx-auto leading-relaxed">
            Shortlist your best applicants today with custom scoring and automated pipelines. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/signup">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto font-bold text-primary">
                Start Free
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              onClick={handleLiveDemoClick}
              className="w-full sm:w-auto font-bold bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              Try Live Demo
            </Button>
          </div>
        </div>
      </section>

      {/* 12. FOOTER */}
      <footer id="footer" className="bg-white border-t border-border py-12 px-4 sm:px-6 lg:px-8 text-xs text-muted">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-2 col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white font-bold text-xs">
                ⚡
              </div>
              <span className="font-bold text-sm text-text">HireSwift</span>
            </div>
            <p className="text-[11px] text-muted">
              Intelligent Applicant Tracking System for high-growth tech teams in India.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-text">Product</h4>
            <ul className="space-y-1.5">
              <li><button onClick={() => scrollToSection('features')} className="hover:text-text">Features</button></li>
              <li><button onClick={() => scrollToSection('how-it-works')} className="hover:text-text">How It Works</button></li>
              <li><button onClick={() => scrollToSection('pricing')} className="hover:text-text">Pricing</button></li>
              <li><Link to={loginRoute} className="hover:text-text">{isFeatureEnabled('enableAuth') ? 'Recruiter Sign In' : 'Recruiter Workspace'}</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-text">Resources</h4>
            <ul className="space-y-1.5">
              <li><button onClick={() => scrollToSection('faq')} className="hover:text-text">FAQ</button></li>
              <li><Link to="/careers/novalabs" className="hover:text-text">Sample Careers Portal</Link></li>
              <li><a href="#docs" onClick={(e) => { e.preventDefault(); toast.info('API documentation available in repository README.'); }} className="hover:text-text">API Documentation</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-text">Legal</h4>
            <ul className="space-y-1.5">
              <li><a href="#privacy" onClick={(e) => { e.preventDefault(); toast.info('DPDP Act compliant data retention policies active.'); }} className="hover:text-text">Privacy Policy</a></li>
              <li><a href="#terms" onClick={(e) => { e.preventDefault(); toast.info('HireSwift standard SaaS agreement terms.'); }} className="hover:text-text">Terms of Service</a></li>
              <li><span className="block text-[11px]">support@hireswift.in</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© 2026 HireSwift Technologies Pvt Ltd. All rights reserved.</span>
          <span className="text-[11px]">Built with React, TypeScript & Tailwind CSS</span>
        </div>
      </footer>
    </div>
  )
}
