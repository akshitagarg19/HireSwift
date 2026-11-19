import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { isFeatureEnabled } from '@/config/features'

// Lazy-loaded Marketing & Auth Pages
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import('@/pages/auth/SignupPage').then((m) => ({ default: m.SignupPage })))
const OnboardingPage = lazy(() => import('@/pages/auth/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))
const CareersPage = lazy(() => import('@/pages/careers/CareersPage').then((m) => ({ default: m.CareersPage })))
const JobApplicationPage = lazy(() => import('@/pages/careers/JobApplicationPage').then((m) => ({ default: m.JobApplicationPage })))

// Lazy-loaded App Pages
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const JobsPage = lazy(() => import('@/pages/jobs/JobsPage').then((m) => ({ default: m.JobsPage })))
const JobCreatePage = lazy(() => import('@/pages/jobs/JobCreatePage').then((m) => ({ default: m.JobCreatePage })))
const JobDetailPage = lazy(() => import('@/pages/jobs/JobDetailPage').then((m) => ({ default: m.JobDetailPage })))
const CandidatesPage = lazy(() => import('@/pages/candidates/CandidatesPage').then((m) => ({ default: m.CandidatesPage })))
const CandidateDetailPage = lazy(() => import('@/pages/candidates/CandidateDetailPage').then((m) => ({ default: m.CandidateDetailPage })))
const UploadPage = lazy(() => import('@/pages/upload/UploadPage').then((m) => ({ default: m.UploadPage })))
const PipelinePage = lazy(() => import('@/pages/pipeline/PipelinePage').then((m) => ({ default: m.PipelinePage })))
const ComparePage = lazy(() => import('@/pages/compare/ComparePage').then((m) => ({ default: m.ComparePage })))
const InsightsPage = lazy(() => import('@/pages/insights/InsightsPage').then((m) => ({ default: m.InsightsPage })))
const EmailsPage = lazy(() => import('@/pages/emails/EmailsPage').then((m) => ({ default: m.EmailsPage })))
const DuplicatesPage = lazy(() => import('@/pages/duplicates/DuplicatesPage').then((m) => ({ default: m.DuplicatesPage })))
const FairnessPage = lazy(() => import('@/pages/fairness/FairnessPage').then((m) => ({ default: m.FairnessPage })))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))

const PageLoadingFallback: React.FC = () => (
  <div className="flex h-[60vh] w-full items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <span className="text-xs text-muted font-medium">Loading view...</span>
    </div>
  </div>
)

export const App: React.FC = () => {
  const defaultAppRoute = isFeatureEnabled('enableDashboard') ? '/app/dashboard' : '/app/candidates'

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          {/* Public Marketing Landing Page */}
          <Route path="/" element={<HomePage />} />

          {/* Public Auth & Careers Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/careers/:companySlug" element={<CareersPage />} />
          <Route path="/careers/:companySlug/:jobId" element={<JobApplicationPage />} />

          {/* Protected App Routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to={defaultAppRoute} replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="jobs/new" element={<JobCreatePage />} />
            <Route path="jobs/:id" element={<JobDetailPage />} />
            <Route path="candidates" element={<CandidatesPage />} />
            <Route path="candidates/:id" element={<CandidateDetailPage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="pipeline" element={<PipelinePage />} />
            <Route path="compare" element={<ComparePage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="emails" element={<EmailsPage />} />
            <Route path="duplicates" element={<DuplicatesPage />} />
            <Route path="fairness" element={<FairnessPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
