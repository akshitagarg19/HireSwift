import { describe, it, expect } from 'vitest'
import {
  matchScore,
  hasSkillWithSynonyms,
  normalizeCgpaToPercent,
  computeSemanticSimilarity,
} from './scoring'
import { Candidate, Job, ScoringWeights } from '@/types'

describe('Scoring Engine', () => {
  const dummyCandidate: Candidate = {
    id: 'cand-test-1',
    companyId: 'company-nova',
    name: 'Aarav Sharma',
    email: 'aarav@example.com',
    phone: '+91 9876543210',
    location: 'Bengaluru',
    college: 'IIT Delhi',
    degree: 'B.Tech',
    branch: 'Computer Science',
    gradYear: 2022,
    tenthPercent: 92,
    twelfthPercent: 90,
    cgpa: 8.8,
    skills: ['JS', 'ReactJS', 'Node', 'K8s', 'Python'],
    experienceYears: 3,
    experience: [],
    projects: [],
    certifications: [],
    resumeText: 'Experienced full stack software engineer proficient in React, Node, microservices and Kubernetes infrastructure.',
    resumeFileName: 'aarav_resume.pdf',
    parseConfidence: 95,
    fieldConfidence: {},
    source: 'LinkedIn',
    createdAt: new Date().toISOString(),
    customFields: {},
  }

  const dummyJob: Job = {
    id: 'job-test-1',
    companyId: 'company-nova',
    title: 'Senior Full Stack Engineer',
    department: 'Engineering',
    location: 'Bengaluru',
    type: 'Full-time',
    jdText: 'Looking for a senior full stack developer with experience in React, JavaScript, Node.js, and Kubernetes.',
    requirements: {
      requiredSkills: ['JavaScript', 'React', 'Node.js'],
      preferredSkills: ['Kubernetes', 'AWS'],
      minExperience: 3,
      minCgpa: 7.5,
      gradYears: [2020, 2021, 2022],
    },
    status: 'Active',
    createdAt: new Date().toISOString(),
  }

  const synonyms = {
    'JavaScript': ['JS', 'ES6'],
    'React': ['ReactJS', 'React.js'],
    'Node.js': ['Node', 'NodeJS'],
    'Kubernetes': ['K8s'],
    'Machine Learning': ['ML', 'AI'],
  }

  describe('Skill Synonyms', () => {
    it('matches exact skills', () => {
      expect(hasSkillWithSynonyms(['Python', 'Docker'], 'Python', synonyms)).toBe(true)
      expect(hasSkillWithSynonyms(['Python', 'Docker'], 'Java', synonyms)).toBe(false)
    })

    it('matches synonyms correctly (JS -> JavaScript, K8s -> Kubernetes)', () => {
      expect(hasSkillWithSynonyms(['JS'], 'JavaScript', synonyms)).toBe(true)
      expect(hasSkillWithSynonyms(['ReactJS'], 'React', synonyms)).toBe(true)
      expect(hasSkillWithSynonyms(['K8s'], 'Kubernetes', synonyms)).toBe(true)
      expect(hasSkillWithSynonyms(['Node'], 'Node.js', synonyms)).toBe(true)
    })
  })

  describe('CGPA & Percentage Normalization', () => {
    it('normalizes 10-point CGPA into percentage scale', () => {
      expect(normalizeCgpaToPercent(8.5)).toBe(85)
      expect(normalizeCgpaToPercent(10.0)).toBe(100)
      expect(normalizeCgpaToPercent(7.2)).toBe(72)
    })

    it('handles already percentage values gracefully', () => {
      expect(normalizeCgpaToPercent(88)).toBe(88)
    })
  })

  describe('Required vs Preferred Skills Weighting', () => {
    it('gives full credit to required and partial credit to preferred', () => {
      const result = matchScore(dummyCandidate, dummyJob, { skills: 100, experience: 0, education: 0, semantic: 0 }, synonyms)
      // Candidate has all 3 required (JavaScript via JS, React via ReactJS, Node.js via Node) = 3.0 points
      // Candidate has 1 preferred (Kubernetes via K8s) = 0.5 points
      // Total possible = 3 * 1.0 + 2 * 0.5 = 4.0 points
      // Earned = 3.5 / 4.0 = 87.5% -> ~88%
      expect(result.breakdown.skills).toBe(88)
      expect(result.matchedSkills).toContain('JavaScript')
      expect(result.matchedSkills).toContain('React')
      expect(result.matchedSkills).toContain('Node.js')
      expect(result.matchedSkills).toContain('Kubernetes')
      expect(result.missingSkills).toContain('AWS')
    })
  })

  describe('Hard Requirements Enforcement', () => {
    it('caps score and flags violation when CGPA is below requirement', () => {
      const lowCgpaCandidate: Candidate = {
        ...dummyCandidate,
        cgpa: 6.2, // Job min is 7.5
      }
      const result = matchScore(lowCgpaCandidate, dummyJob, undefined, synonyms)
      expect(result.hardRequirementViolation).toBeDefined()
      expect(result.hardRequirementViolation).toContain('CGPA 6.2 is below required minimum 7.5')
      expect(result.score).toBeLessThanOrEqual(45)
    })

    it('caps score when graduation year does not match target batch', () => {
      const wrongBatchCandidate: Candidate = {
        ...dummyCandidate,
        gradYear: 2016, // Job wants 2020, 2021, 2022
      }
      const result = matchScore(wrongBatchCandidate, dummyJob, undefined, synonyms)
      expect(result.hardRequirementViolation).toBeDefined()
      expect(result.hardRequirementViolation).toContain('Graduation year 2016 not in target batch')
      expect(result.score).toBeLessThanOrEqual(45)
    })
  })

  describe('Semantic Cosine Similarity', () => {
    it('computes higher similarity for overlapping technical keywords', () => {
      const textA = 'React TypeScript frontend engineer building web applications'
      const textB = 'Looking for a React and TypeScript frontend engineer'
      const textC = 'Senior accountant with expertise in audit and taxation'

      const simHigh = computeSemanticSimilarity(textA, textB)
      const simLow = computeSemanticSimilarity(textA, textC)

      expect(simHigh).toBeGreaterThan(simLow)
      expect(simHigh).toBeGreaterThan(50)
    })
  })

  describe('Live Weight Adjustments', () => {
    it('recalculates total score when weights shift from skills to education', () => {
      const candidate: Candidate = {
        ...dummyCandidate,
        skills: ['JS'], // Weak skills
        cgpa: 9.8,      // Stellar academic
        tenthPercent: 98,
        twelfthPercent: 96,
      }

      const skillsHeavyWeights: ScoringWeights = { skills: 80, experience: 10, education: 10, semantic: 0 }
      const eduHeavyWeights: ScoringWeights = { skills: 10, experience: 10, education: 80, semantic: 0 }

      const resultSkills = matchScore(candidate, dummyJob, skillsHeavyWeights, synonyms)
      const resultEdu = matchScore(candidate, dummyJob, eduHeavyWeights, synonyms)

      expect(resultEdu.score).toBeGreaterThan(resultSkills.score)
    })
  })
})
