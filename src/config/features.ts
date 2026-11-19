/**
 * Feature Flags Configuration
 * Controls active modules across the HireSwift ATS.
 * All must-have and bonus recruiting modules are active.
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

export const FEATURES: FeatureFlags = {
  enableAuth: true,
  enableCompanySwitcher: true,
  enableOnboarding: true,
  enableCareers: true,
  enableFairness: true,
  enableEmails: true,
  enableSettings: true,
  enableDuplicates: true,
  enableDashboard: true,
}

export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  return Boolean(FEATURES[feature])
}
