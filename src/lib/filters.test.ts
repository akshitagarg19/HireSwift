import { describe, it, expect } from 'vitest'
import { generateSeedCandidatesAndApplications, SEED_COMPANIES, SEED_JOBS } from '@/data/seedData'
import { hasSkillWithSynonyms } from './scoring'

describe('Candidate Filtering on Seed Data (Spot Checks)', () => {
  const seed = generateSeedCandidatesAndApplications()
  const novaCandidates = seed.candidates.filter((c) => c.companyId === 'company-nova')
  const novaSynonyms = SEED_COMPANIES[0].settings.skillSynonyms

  it('Filter Combination 1: High CGPA filter (CGPA >= 8.5)', () => {
    const results = novaCandidates.filter((c) => c.cgpa >= 8.5)
    expect(results.length).toBeGreaterThan(0)
    results.forEach((c) => {
      expect(c.cgpa).toBeGreaterThanOrEqual(8.5)
    })
  })

  it('Filter Combination 2: Synonym-aware skill filter (Kubernetes matches K8s)', () => {
    const results = novaCandidates.filter((c) =>
      hasSkillWithSynonyms(c.skills, 'Kubernetes', novaSynonyms)
    )
    expect(results.length).toBeGreaterThan(0)
    results.forEach((c) => {
      const hasDirect = c.skills.includes('Kubernetes')
      const hasSyn = c.skills.includes('K8s')
      expect(hasDirect || hasSyn).toBe(true)
    })
  })

  it('Filter Combination 3: Graduation Batch filter (Batch 2024)', () => {
    const results = novaCandidates.filter((c) => c.gradYear === 2024)
    expect(results.length).toBeGreaterThan(0)
    results.forEach((c) => {
      expect(c.gradYear).toBe(2024)
    })
  })

  it('Filter Combination 4: Location filter (Bengaluru or Pune)', () => {
    const targetLocations = ['Bengaluru', 'Pune']
    const results = novaCandidates.filter((c) => targetLocations.includes(c.location))
    expect(results.length).toBeGreaterThan(0)
    results.forEach((c) => {
      expect(targetLocations).toContain(c.location)
    })
  })

  it('Filter Combination 5: Combinable Multi-filter (CGPA >= 8.0 + Python + Bengaluru)', () => {
    const results = novaCandidates.filter(
      (c) =>
        c.cgpa >= 8.0 &&
        c.location === 'Bengaluru' &&
        hasSkillWithSynonyms(c.skills, 'Python', novaSynonyms)
    )
    expect(results.length).toBeGreaterThan(0)
    results.forEach((c) => {
      expect(c.cgpa).toBeGreaterThanOrEqual(8.0)
      expect(c.location).toBe('Bengaluru')
      expect(hasSkillWithSynonyms(c.skills, 'Python', novaSynonyms)).toBe(true)
    })
  })

  it('Filter Combination 6: Experience Range filter (Experience between 2 and 5 years)', () => {
    const results = novaCandidates.filter(
      (c) => c.experienceYears >= 2 && c.experienceYears <= 5
    )
    expect(results.length).toBeGreaterThan(0)
    results.forEach((c) => {
      expect(c.experienceYears).toBeGreaterThanOrEqual(2)
      expect(c.experienceYears).toBeLessThanOrEqual(5)
    })
  })
})
