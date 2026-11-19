/**
 * Demo Data Loader for Evaluators and automated walkthroughs.
 * Instantly loads 50+ realistic candidate profiles, jobs, rankings, and pipeline state.
 */
import { useAppStore } from '../src/store'
import { generateSeedCandidatesAndApplications, SEED_COMPANIES, SEED_USERS, SEED_JOBS } from '../src/data/seedData'

export function load50CandidateDemoDataSet(): { candidateCount: number; jobsCount: number } {
  localStorage.removeItem('hireswift-storage')
  const seed = generateSeedCandidatesAndApplications()

  useAppStore.setState({
    currentCompanyId: 'company-nova',
    currentUser: SEED_USERS[0],
    companies: SEED_COMPANIES,
    users: SEED_USERS,
    jobs: SEED_JOBS,
    candidates: seed.candidates,
    applications: seed.applications,
    stageHistories: seed.stageHistories,
    duplicateGroups: seed.duplicateGroups,
  })

  return {
    candidateCount: seed.candidates.length,
    jobsCount: SEED_JOBS.length,
  }
}
