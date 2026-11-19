import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

// Marketing & Auth Pages
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { OnboardingPage } from '@/pages/auth/OnboardingPage'
import { CareersPage } from '@/pages/careers/CareersPage'
import { JobApplicationPage } from '@/pages/careers/JobApplicationPage'

// App Shell Pages
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { JobsPage } from '@/pages/jobs/JobsPage'
import { JobCreatePage } from '@/pages/jobs/JobCreatePage'
import { JobDetailPage } from '@/pages/jobs/JobDetailPage'
import { CandidatesPage } from '@/pages/candidates/CandidatesPage'
import { CandidateDetailPage } from '@/pages/candidates/CandidateDetailPage'
import { UploadPage } from '@/pages/upload/UploadPage'
import { PipelinePage } from '@/pages/pipeline/PipelinePage'
import { ComparePage } from '@/pages/compare/ComparePage'
import { EmailsPage } from '@/pages/emails/EmailsPage'
import { DuplicatesPage } from '@/pages/duplicates/DuplicatesPage'
import { FairnessPage } from '@/pages/fairness/FairnessPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

export const App: React.FC = () => {
  return (
    <BrowserRouter>
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
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/new" element={<JobCreatePage />} />
          <Route path="jobs/:id" element={<JobDetailPage />} />
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="candidates/:id" element={<CandidateDetailPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="emails" element={<EmailsPage />} />
          <Route path="duplicates" element={<DuplicatesPage />} />
          <Route path="fairness" element={<FairnessPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* 404 Catch-All */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
