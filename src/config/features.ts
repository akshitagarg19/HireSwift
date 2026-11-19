/**
 * Feature Flags Configuration
 * Controls scope for the single-tenant live build served by FastAPI.
 */
export interface FeatureFlags {
  enableAuth: boolean;
  enableCompanySwitcher: boolean;
  enableOnboarding: boolean;
  enableCareers: boolean;
  enableFairness: boolean;
  enableEmails: boolean;
  enableSettings: boolean;
  enableDuplicates: boolean;
  enableDashboard: boolean;
}

// Sidebar defaults strictly limited to the 6 core recruiting routes per Task 6:
// (Upload, Candidates, Jobs, Pipeline, Compare, Insights)
export const FEATURES: FeatureFlags = {
  enableAuth: true,
  enableCompanySwitcher: true,
  enableOnboarding: true,
  enableCareers: true,
  enableFairness: false,
  enableEmails: false,
  enableSettings: false,
  enableDuplicates: false,
  enableDashboard: false,
}

export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  return Boolean(FEATURES[feature])
}
