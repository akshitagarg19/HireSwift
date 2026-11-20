import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
export const rootDir = path.resolve(__dirname, '..')
export const testDataDir = path.join(rootDir, 'test-data')

/**
 * Robust CSV Parser that handles quoted cells, commas inside quotes, and trims fields.
 */
export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []

  const parseRow = (line) => {
    const row = []
    let inQuotes = false
    let current = ''
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === ',' && !inQuotes) {
        row.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    row.push(current.trim())
    return row
  }

  const headers = parseRow(lines[0])
  const records = []

  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i])
    const obj = {}
    headers.forEach((h, idx) => {
      obj[h] = row[idx] !== undefined ? row[idx] : ''
    })
    records.push(obj)
  }

  return records
}

/**
 * Normalization helpers
 */
export function normalizeCity(city) {
  if (!city) return ''
  const trimmed = city.trim().toLowerCase()
  if (trimmed === 'bangalore' || trimmed === 'bengaluru') return 'Bengaluru'
  if (trimmed === 'gurgaon' || trimmed === 'gurugram') return 'Gurugram'
  if (trimmed === 'bombay' || trimmed === 'mumbai') return 'Mumbai'
  if (trimmed === 'calcutta' || trimmed === 'kolkata') return 'Kolkata'
  if (trimmed.includes('noida')) return 'Noida'
  if (trimmed.includes('delhi')) return 'Delhi'
  if (trimmed === 'jaipur') return 'Jaipur'
  if (trimmed === 'pune') return 'Pune'
  if (trimmed === 'hyderabad') return 'Hyderabad'
  return city.trim()
}

export function normalizePhone10(phone) {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits
}

export function normalizeSkill(skill) {
  if (!skill) return ''
  const s = skill.trim()
  const lower = s.toLowerCase()
  if (lower === 'js' || lower === 'javascript') return 'JavaScript'
  if (lower === 'react' || lower === 'reactjs' || lower === 'react.js') return 'React'
  if (lower === 'node' || lower === 'nodejs' || lower === 'node.js') return 'Node.js'
  if (lower === 'k8s' || lower === 'kubernetes') return 'Kubernetes'
  if (lower === 'postgres' || lower === 'postgresql') return 'PostgreSQL'
  if (lower === 'golang' || lower === 'go') return 'Golang'
  if (lower === 'amazon web services' || lower === 'aws') return 'AWS'
  if (lower === 'ml' || lower === 'machine learning') return 'Machine Learning'
  if (lower === 'pyspark') return 'PySpark'
  return s
}

/**
 * Loads answer_key.csv (all 56 rows)
 */
export function loadAnswerKey(filePath = path.join(testDataDir, 'answer_key.csv')) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const rows = parseCsv(content)

  return rows.map((r) => {
    const cgpa_10 = r.cgpa_10 ? parseFloat(r.cgpa_10) : null
    const tenth_pct = r.tenth_pct ? parseFloat(r.tenth_pct) : null
    const twelfth_pct = r.twelfth_pct ? parseFloat(r.twelfth_pct) : null
    const experience_months = r.experience_months !== '' ? parseInt(r.experience_months, 10) : null
    const grad_year = r.grad_year ? parseInt(r.grad_year, 10) : null
    const skills = r.skills
      ? r.skills
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    return {
      file: r.file,
      candidate_id: r.candidate_id,
      name: r.name,
      email: r.email,
      phone_10: r.phone_10,
      city: normalizeCity(r.city),
      college: r.college,
      degree: r.degree,
      branch: r.branch,
      grad_year,
      cgpa_raw: r.cgpa_raw,
      cgpa_10,
      tenth_pct,
      twelfth_pct,
      experience_months,
      skills,
      uses_present: r.uses_present === 'True',
      layout: r.layout,
      needs_ocr: r.needs_ocr === 'True',
      dup_of: r.dup_of || null,
      dup_type: r.dup_type || null,
    }
  })
}

/**
 * Loads unique candidates (50 candidates: C000 to C049), linking duplicate information
 */
export function loadUniqueCandidates(filePath = path.join(testDataDir, 'answer_key.csv')) {
  const allRows = loadAnswerKey(filePath)
  const uniqueMap = new Map()

  // Find all duplicates
  const dupMap = new Map() // target candidate_id -> list of dup rows
  for (const row of allRows) {
    if (row.dup_of) {
      const parent = allRows.find((p) => p.file === row.dup_of)
      const parentId = parent ? parent.candidate_id : row.candidate_id
      if (!dupMap.has(parentId)) dupMap.set(parentId, [])
      dupMap.get(parentId).push(row)
    }
  }

  for (const row of allRows) {
    if (!row.dup_of && !uniqueMap.has(row.candidate_id)) {
      const dups = dupMap.get(row.candidate_id) || []
      const isDuplicate = dups.length > 0
      const duplicateGroupId = isDuplicate ? `dup-grp-${row.candidate_id}` : null

      uniqueMap.set(row.candidate_id, {
        ...row,
        is_duplicate: isDuplicate,
        duplicate_group_id: duplicateGroupId,
        duplicate_files: dups.map((d) => ({ file: d.file, type: d.dup_type })),
      })
    }
  }

  return Array.from(uniqueMap.values())
}

/**
 * Loads filter_tests.csv (14 tests F01-F14)
 */
export function loadFilterTests(filePath = path.join(testDataDir, 'filter_tests.csv')) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const rows = parseCsv(content)

  return rows.map((r) => ({
    test_id: r.test_id,
    description: r.description,
    api_params: r.api_params,
    expected_count: parseInt(r.expected_count, 10),
    expected_candidate_ids: r.expected_candidate_ids
      ? r.expected_candidate_ids.split('|').map((id) => id.trim()).filter(Boolean)
      : [],
  }))
}

/**
 * Loads jd_answer_key.csv (5 JDs)
 */
export function loadJdAnswerKey(filePath = path.join(testDataDir, 'jd_answer_key.csv')) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const rows = parseCsv(content)

  return rows.map((r) => ({
    jd_file: r.jd_file,
    title: r.title,
    location: normalizeCity(r.location),
    required_skills: r.required_skills ? r.required_skills.split('|').map((s) => s.trim()) : [],
    preferred_skills: r.preferred_skills ? r.preferred_skills.split('|').map((s) => s.trim()) : [],
    min_experience_years: r.min_experience_years !== '' ? parseFloat(r.min_experience_years) : 0,
    min_cgpa: r.min_cgpa !== '' ? parseFloat(r.min_cgpa) : 0,
    grad_years: r.grad_years ? r.grad_years.split('|').map((y) => parseInt(y.trim(), 10)) : [],
    hard_filter_pass_candidate_ids: r.hard_filter_pass_candidate_ids
      ? r.hard_filter_pass_candidate_ids.split('|').map((id) => id.trim())
      : [],
    hard_filter_pass_count: parseInt(r.hard_filter_pass_count, 10),
  }))
}

/**
 * Tolerances and comparison utilities
 */
export const TOLERANCES = {
  cgpa_10: 0.05,
  tenth_pct: 0.1,
  twelfth_pct: 0.1,
  experience_months: 2,
}

export function compareCgpa(actual, expected) {
  if (expected == null) return actual == null
  if (actual == null) return false
  return Math.abs(actual - expected) <= TOLERANCES.cgpa_10 + 1e-6
}

export function comparePercentage(actual, expected) {
  if (expected == null) return actual == null
  if (actual == null) return false
  return Math.abs(actual - expected) <= TOLERANCES.tenth_pct + 1e-6
}

export function compareExperienceMonths(actual, expected) {
  if (expected == null) return actual == null
  if (actual == null) return false
  return Math.abs(actual - expected) <= TOLERANCES.experience_months
}

export function compareSkills(actualSkills = [], expectedSkills = []) {
  const actualSet = new Set(actualSkills.map((s) => normalizeSkill(s).toLowerCase()))
  const expectedSet = new Set(expectedSkills.map((s) => normalizeSkill(s).toLowerCase()))

  let truePositives = 0
  for (const s of actualSet) {
    if (expectedSet.has(s)) truePositives++
  }

  const precision = actualSet.size > 0 ? truePositives / actualSet.size : expectedSet.size === 0 ? 1 : 0
  const recall = expectedSet.size > 0 ? truePositives / expectedSet.size : 1
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0

  return { precision, recall, f1, truePositives, actualCount: actualSet.size, expectedCount: expectedSet.size }
}

/**
 * Maps a backend candidate record to an answer key record by:
 * 1. Resume file name
 * 2. Email
 * 3. 10-digit phone
 */
export function matchCandidateToAnswerKey(cand, answerKeyList) {
  const fileName = cand.resume_file_name || cand.resumeFileName || cand.file
  if (fileName) {
    const byFile = answerKeyList.find((k) => k.file === fileName)
    if (byFile) return byFile
  }

  if (cand.email) {
    const candEmail = cand.email.trim().toLowerCase()
    const byEmail = answerKeyList.find((k) => k.email && k.email.trim().toLowerCase() === candEmail)
    if (byEmail) return byEmail
  }

  const candPhone = normalizePhone10(cand.phone || cand.phone_10)
  if (candPhone) {
    const byPhone = answerKeyList.find((k) => k.phone_10 === candPhone)
    if (byPhone) return byPhone
  }

  // Fallback: candidate ID directly if matches C0xx format
  if (cand.id && cand.id.startsWith('C0')) {
    const byId = answerKeyList.find((k) => k.candidate_id === cand.id)
    if (byId) return byId
  }

  return null
}

/**
 * Collapses duplicate candidates
 */
export function collapseCandidates(candidatesList) {
  const groupMap = new Map()
  const collapsed = []

  for (const cand of candidatesList) {
    let key = null
    if (cand.duplicate_group_id) {
      key = `grp:${cand.duplicate_group_id}`
    } else if (cand.email) {
      key = `email:${cand.email.trim().toLowerCase()}`
    } else if (cand.phone) {
      const p = normalizePhone10(cand.phone)
      if (p) key = `phone:${p}`
    }

    if (key) {
      if (!groupMap.has(key)) {
        groupMap.set(key, cand)
        collapsed.push(cand)
      }
    } else {
      collapsed.push(cand)
    }
  }

  return {
    rawCount: candidatesList.length,
    collapsedCount: collapsed.length,
    collapsed,
  }
}
