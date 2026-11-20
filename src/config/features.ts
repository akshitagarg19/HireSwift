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
  enableAuth: false,
  enableCompanySwitcher: false,
  enableOnboarding: false,
  enableCareers: false,
  enableFairness: false,
  enableEmails: true,
  enableSettings: false,
  enableDuplicates: true,
  enableDashboard: false,
}

export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  return Boolean(FEATURES[feature])
}
