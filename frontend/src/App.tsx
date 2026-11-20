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
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          {/* Public Marketing Landing Page */}
          <Route path="/" element={<HomePage />} />

          {/* Public Auth & Careers Routes - Disabled routes redirect to /app/candidates */}
          <Route
            path="/login"
            element={isFeatureEnabled('enableAuth') ? <LoginPage /> : <Navigate to="/app/candidates" replace />}
          />
          <Route
            path="/signup"
            element={isFeatureEnabled('enableAuth') ? <SignupPage /> : <Navigate to="/app/candidates" replace />}
          />
          <Route
            path="/onboarding"
            element={isFeatureEnabled('enableOnboarding') ? <OnboardingPage /> : <Navigate to="/app/candidates" replace />}
          />
          <Route
            path="/careers/:companySlug"
            element={isFeatureEnabled('enableCareers') ? <CareersPage /> : <Navigate to="/app/candidates" replace />}
          />
          <Route
            path="/careers/:companySlug/:jobId"
            element={isFeatureEnabled('enableCareers') ? <JobApplicationPage /> : <Navigate to="/app/candidates" replace />}
          />

          {/* Main App Routes - /app redirects to /app/upload */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route
              path="dashboard"
              element={isFeatureEnabled('enableDashboard') ? <DashboardPage /> : <Navigate to="/app/candidates" replace />}
            />
            <Route path="upload" element={<UploadPage />} />
            <Route path="candidates" element={<CandidatesPage />} />
            <Route path="candidates/:id" element={<CandidateDetailPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="jobs/new" element={<JobCreatePage />} />
            <Route path="jobs/:id" element={<JobDetailPage />} />
            <Route path="pipeline" element={<PipelinePage />} />
            <Route path="compare" element={<ComparePage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route
              path="duplicates"
              element={isFeatureEnabled('enableDuplicates') ? <DuplicatesPage /> : <Navigate to="/app/candidates" replace />}
            />
            <Route
              path="emails"
              element={isFeatureEnabled('enableEmails') ? <EmailsPage /> : <Navigate to="/app/candidates" replace />}
            />
            <Route
              path="fairness"
              element={isFeatureEnabled('enableFairness') ? <FairnessPage /> : <Navigate to="/app/candidates" replace />}
            />
            <Route
              path="settings"
              element={isFeatureEnabled('enableSettings') ? <SettingsPage /> : <Navigate to="/app/candidates" replace />}
            />
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
