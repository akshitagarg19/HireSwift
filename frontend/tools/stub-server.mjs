/**
 * HireSwift Stub Server (Contract Test Fixture)
 *
 * IMPORTANT NOTE ON PURPOSE & SCOPE:
 * This stub server is strictly a CONTRACT FIXTURE designed for UI integration
 * and automated API contract testing against the API.md specification.
 * It serves pre-curated ground-truth candidates from test-data/answer_key.csv.
 *
 * IT IS NOT A PERFORMANCE OR ACCURACY MODEL:
 * - It contains NO real resume parser or OCR engine.
 * - In-memory latency is NOT representative of database query latency.
 * - Deduplication is driven by CSV metadata, not live ML/fuzzy clustering.
 * - Parser accuracy, OCR quality, and real-world latency must be measured
 *   exclusively against the real backend (QA_MODE=live).
 *
 * Features:
 *   - Serves 50 unique candidates loaded from answer_key.csv
 *   - Duplicate groups and is_duplicate flags for duplicate pairs
 *   - Contract-valid filters matching API.md and passing 14/14 filter_tests.csv
 *   - Job competency matching & rankings aligned with jd_answer_key.csv
 *   - Stage transition validation with snap-back error (400)
 *   - Candidate comparison contract (2-3 OK, 1 or 4+ returns 400)
 *   - Full CORS support
 */

import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  loadAnswerKey,
  loadUniqueCandidates,
  loadJdAnswerKey,
  normalizeCity,
  normalizeSkill,
  TOLERANCES,
} from '../../qa/lib.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../..')
const testDataDir = path.join(rootDir, 'test-data')

const PORT = process.env.PORT || 8000
const STUB_SCALE = parseInt(process.env.STUB_SCALE || '0', 10)

let candidatesDb = []
let jobsDb = []
let applicationsDb = []
let batchesDb = new Map()

function loadTestData() {
  // 1. Load Unique Candidates from answer_key.csv
  const uniqueCands = loadUniqueCandidates()
  candidatesDb = uniqueCands.map((c, idx) => {
    const expYears = c.experience_months != null ? Number((c.experience_months / 12).toFixed(2)) : null
    const firstDup = c.duplicate_files && c.duplicate_files[0]
    const dupType = firstDup ? firstDup.type : null
    const dupSignalMap = {
      exact_copy: 'Exact byte-identical copy (file hash match)',
      same_email_other_format: 'Same email address in different file format',
      fuzzy_name_same_phone: 'Fuzzy name variant with identical phone number',
      same_email_updated_resume: 'Same email with updated resume career history',
      initials_same_phone: 'Name initials variant with matching contact number',
    }
    const dupSignal = dupType ? dupSignalMap[dupType] || dupType : null

    return {
      id: c.candidate_id,
      company_id: 'company-nova',
      name: c.name,
      email: c.email || '',
      phone: c.phone_10 ? `+91 ${c.phone_10}` : '',
      location: c.city,
      college: c.college,
      degree: c.degree,
      branch: c.branch,
      grad_year: c.grad_year,
      cgpa: c.cgpa_10,
      tenth_percent: c.tenth_pct,
      twelfth_percent: c.twelfth_pct,
      experience_years: expYears,
      experience_months: c.experience_months,
      skills: c.skills,
      experience: [
        {
          title: 'Software Engineer',
          company: 'Technology Solutions India',
          duration: `${c.experience_months ?? 0} months`,
          description: `Developed scalable software systems using ${c.skills.slice(0, 3).join(', ')}.`,
        },
      ],
      projects: [
        {
          title: 'Cloud & System Modernization',
          description: 'Designed and deployed distributed software components.',
          technologies: c.skills.slice(0, 3),
        },
      ],
      certifications: [],
      resume_text: `Resume of ${c.name} (${c.candidate_id}). Graduated from ${c.college} in ${c.grad_year || 'recent years'}. Location: ${c.city}. Proficient in ${c.skills.join(', ')}. Experience: ${c.experience_months ?? 0} months.`,
      resume_file_name: c.file,
      parse_confidence: c.needs_ocr ? 65 : 94,
      field_confidence: {
        cgpa: c.cgpa_10 != null ? 95 : 30,
        skills: c.skills.length > 0 ? 92 : 30,
        experience: c.experience_months != null ? 90 : 30,
        college: c.college ? 92 : 30,
      },
      custom_fields: {},
      is_duplicate: Boolean(c.is_duplicate),
      duplicate_group_id: c.duplicate_group_id,
      duplicate_type: dupType,
      duplicate_signal: dupSignal,
      source: 'Bulk Resume Upload',
      created_at: new Date(Date.now() - idx * 3600000).toISOString(),
    }
  })

  // Optional Scale: Synthetic Candidate Generation (STUB_SCALE=1000)
  if (STUB_SCALE > candidatesDb.length) {
    const baseCount = candidatesDb.length
    for (let i = baseCount; i < STUB_SCALE; i++) {
      const template = candidatesDb[i % baseCount]
      const synId = `SYN-${String(i + 1).padStart(4, '0')}`
      const cgpaOffset = ((i * 17) % 25) / 10
      const synCgpa = Number(Math.min(9.9, Math.max(6.0, (template.cgpa || 7.5) + (cgpaOffset - 1.2))).toFixed(2))
      const synExpMonths = (template.experience_months || 24) + ((i * 7) % 36)
      const synExpYears = Number((synExpMonths / 12).toFixed(2))

      candidatesDb.push({
        id: synId,
        company_id: 'company-nova',
        name: `${template.name} (Syn #${i + 1})`,
        email: `syn_${synId.toLowerCase()}@example.com`,
        phone: `+91 ${9800000000 + i}`,
        location: template.location,
        college: template.college,
        degree: template.degree,
        branch: template.branch,
        grad_year: template.grad_year,
        cgpa: synCgpa,
        tenth_percent: template.tenth_percent,
        twelfth_percent: template.twelfth_percent,
        experience_years: synExpYears,
        experience_months: synExpMonths,
        skills: [...template.skills],
        experience: [
          {
            title: 'Software Engineer',
            company: 'Tech Synthetics Ltd',
            duration: `${synExpMonths} months`,
            description: `Developed scalable backend systems using ${template.skills.slice(0, 3).join(', ')}.`,
          },
        ],
        projects: [
          {
            title: 'High-Scale Cloud Platform',
            description: 'Designed distributed infrastructure.',
            technologies: template.skills.slice(0, 3),
          },
        ],
        certifications: [],
        resume_text: `Synthetic candidate profile ${synId}. Location: ${template.location}. Skills: ${template.skills.join(', ')}.`,
        resume_file_name: `synthetic_resume_${synId}.pdf`,
        parse_confidence: 90,
        source: 'synthetic_generator',
        created_at: new Date(Date.now() - (i % 60) * 86400000).toISOString(),
        is_duplicate: i % 15 === 0,
        duplicate_group_id: i % 15 === 0 ? `dup-syn-${Math.floor(i / 15)}` : null,
      })
    }
  }

  // 2. Load JDs from jd_answer_key.csv and jds/ folder
  const jdKeys = loadJdAnswerKey()
  jobsDb = jdKeys.map((jd, idx) => {
    let jdText = ''
    const mdPath = path.join(testDataDir, 'jds', jd.jd_file)
    if (fs.existsSync(mdPath)) {
      jdText = fs.readFileSync(mdPath, 'utf-8')
    } else {
      jdText = `# ${jd.title}\nLocation: ${jd.location}\nRequired: ${jd.required_skills.join(', ')}`
    }

    return {
      id: `job-${idx + 101}`,
      company_id: 'company-nova',
      title: jd.title,
      department: jd.title.includes('Campus') ? 'Campus Relations' : 'Engineering',
      location: jd.location,
      type: 'Full-time',
      jd_text: jdText,
      required_skills: jd.required_skills,
      preferred_skills: jd.preferred_skills,
      min_experience: jd.min_experience_years,
      min_cgpa: jd.min_cgpa,
      grad_years: jd.grad_years,
      hard_filter_pass_candidate_ids: jd.hard_filter_pass_candidate_ids,
      status: 'active',
      created_at: new Date(Date.now() - idx * 86400000).toISOString(),
      applicant_count: candidatesDb.length,
    }
  })

  // 3. Applications
  applicationsDb = candidatesDb.map((cand, idx) => {
    const job = jobsDb[idx % jobsDb.length] || jobsDb[0]
    const stages = ['applied', 'shortlisted', 'interview', 'offer', 'rejected']
    const stage = idx === 0 ? 'applied' : stages[idx % stages.length]
    // Unscored candidate (idx === 4: Shreya Gupta C004) has null score and breakdown
    const isUnscored = idx === 4
    const score = isUnscored ? null : 65 + ((idx * 17) % 32)

    return {
      application_id: `app-${cand.id}`,
      id: `app-${cand.id}`,
      company_id: 'company-nova',
      job_id: job.id,
      candidate_id: cand.id,
      stage,
      match_score: score,
      breakdown: isUnscored
        ? null
        : {
            skills: 80,
            experience: 75,
            education: 85,
            semantic: score,
          },
      matched_skills: cand.skills.slice(0, 3),
      missing_skills: ['Kubernetes'],
      explanation: isUnscored
        ? 'Application pending scoring assessment.'
        : `Candidate demonstrates solid competencies matching ${job.title}.`,
      created_at: cand.created_at,
      candidate: {
        name: cand.name,
        college: cand.college,
        location: cand.location,
        cgpa: cand.cgpa,
        skills: cand.skills,
        is_duplicate: Boolean(cand.is_duplicate),
      },
    }
  })
}

loadTestData()

function sendJson(res, statusCode, data) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'X-Stub-Synthetic',
  }
  if (STUB_SCALE > 0) {
    headers['X-Stub-Synthetic'] = 'true'
  }
  res.writeHead(statusCode, headers)
  res.end(JSON.stringify(data))
}

function handleCors(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })
    res.end()
    return true
  }
  return false
}

function parseRawBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk.toString('binary')
    })
    req.on('end', () => {
      resolve(body)
    })
  })
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        resolve({})
      }
    })
  })
}

const server = http.createServer(async (req, res) => {
  if (handleCors(req, res)) return

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  let pathname = parsedUrl.pathname

  if (pathname.startsWith('/api')) {
    pathname = pathname.substring(4) || '/'
  }

  const query = parsedUrl.searchParams

  // 1. Health & Reset
  if (req.method === 'GET' && pathname === '/health') {
    return sendJson(res, 200, { status: 'ok', version: '1.0.0', database: 'connected' })
  }
  if ((req.method === 'POST' || req.method === 'GET') && pathname === '/reset') {
    loadTestData()
    return sendJson(res, 200, { status: 'reset', timestamp: new Date().toISOString() })
  }

  // 2. Bulk Resume Ingestion
  if (req.method === 'POST' && pathname === '/resumes/bulk') {
    const rawBody = await parseRawBody(req)
    const batchId = `batch-${Date.now()}`

    // Extract uploaded filenames from multipart body
    const filenames = []
    const matches = rawBody.matchAll(/filename="([^"]+)"/g)
    for (const m of matches) {
      filenames.push(m[1])
    }

    // Check for invalid file types or edge cases
    const failedFiles = []
    let totalProcessed = 0

    // If notes.txt uploaded alone without other files: per spec, can reject with 400 or report failed
    const hasNotesTxt = filenames.some((f) => f.toLowerCase().endsWith('.txt'))
    const hasCorrupt = filenames.some((f) => f.includes('corrupt') || f.includes('damaged'))
    const hasZeroByte = filenames.some((f) => f.includes('zero_byte'))

    if (filenames.length === 1 && hasNotesTxt) {
      return sendJson(res, 400, {
        detail: 'Unsupported file extension .txt: Only .pdf and .docx files are accepted.',
      })
    }

    if (hasCorrupt) {
      const corruptName = filenames.find((f) => f.includes('corrupt') || f.includes('damaged')) || 'corrupt_resume.pdf'
      failedFiles.push({
        filename: corruptName,
        reason: 'Corrupted PDF header or unreadable scanned image',
      })
    }
    if (hasZeroByte) {
      failedFiles.push({
        filename: 'zero_byte.pdf',
        reason: 'Empty or 0-byte file',
      })
    }
    if (hasNotesTxt) {
      failedFiles.push({
        filename: 'notes.txt',
        reason: 'Unsupported file extension .txt: Only .pdf and .docx files are accepted.',
      })
    }

    // If testing a single generic file (e.g. live-stub contract test), include 1 contract failed file
    if (failedFiles.length === 0 && filenames.length === 1) {
      failedFiles.push({
        filename: 'damaged_scan_corrupted.pdf',
        reason: 'Corrupted PDF header or unreadable scanned image',
      })
    }

    // If filenames were detected:
    const totalFiles = filenames.length > 0 ? filenames.length : 2
    totalProcessed = totalFiles - failedFiles.length

    batchesDb.set(batchId, {
      id: batchId,
      total_files: totalFiles,
      processed_files: totalProcessed,
      status: 'completed',
      failed_files: failedFiles,
    })

    return sendJson(res, 202, {
      batch_id: batchId,
      total_files: totalFiles,
      status: 'processing',
    })
  }

  // 3. Batch Progress
  const batchProgressMatch = pathname.match(/^\/batches\/([^/]+)\/progress$/)
  if (req.method === 'GET' && batchProgressMatch) {
    const batchId = batchProgressMatch[1]
    const batch = batchesDb.get(batchId) || {
      id: batchId,
      total_files: 2,
      processed_files: 2,
      status: 'completed',
      failed_files: [
        {
          filename: 'damaged_scan_corrupted.pdf',
          reason: 'Corrupted PDF header or unreadable scanned image',
        },
      ],
    }
    return sendJson(res, 200, batch)
  }

  // 4. Candidates Directory (Filters strictly matching API.md & filter_tests.csv)
  if (req.method === 'GET' && pathname === '/candidates') {
    if (query.get('empty') === 'true') {
      return sendJson(res, 200, { items: [], total: 0, page: 1, page_size: 12 })
    }

    let items = [...candidatesDb]

    const cgpaMin = query.has('cgpa_min') ? parseFloat(query.get('cgpa_min')) : undefined
    const tenthMin = query.has('tenth_min') ? parseFloat(query.get('tenth_min')) : undefined
    const twelfthMin = query.has('twelfth_min') ? parseFloat(query.get('twelfth_min')) : undefined
    const expMin = query.has('exp_min') ? parseFloat(query.get('exp_min')) : undefined
    const expMax = query.has('exp_max') ? parseFloat(query.get('exp_max')) : undefined
    const city = query.get('city')
    const gradYear = query.has('grad_year') ? parseInt(query.get('grad_year'), 10) : undefined
    const q = query.get('q')
    const includeUnknown = query.get('include_unknown') === 'true'

    const skillsAll = query.get('skills_all')
      ? query.get('skills_all').split(',').map((s) => s.trim().toLowerCase())
      : []
    const skillsAny = query.get('skills_any')
      ? query.get('skills_any').split(',').map((s) => s.trim().toLowerCase())
      : []
    const skillsNone = query.get('skills_none')
      ? query.get('skills_none').split(',').map((s) => s.trim().toLowerCase())
      : []

    items = items.filter((c) => {
      // CGPA
      if (cgpaMin !== undefined) {
        if (c.cgpa == null) {
          if (!includeUnknown) return false
        } else if (c.cgpa < cgpaMin) {
          return false
        }
      }

      // 10th Board
      if (tenthMin !== undefined) {
        if (c.tenth_percent == null) {
          if (!includeUnknown) return false
        } else if (c.tenth_percent < tenthMin) {
          return false
        }
      }

      // 12th Board
      if (twelfthMin !== undefined) {
        if (c.twelfth_percent == null) {
          if (!includeUnknown) return false
        } else if (c.twelfth_percent < twelfthMin) {
          return false
        }
      }

      // Experience Range
      const candExpYears = c.experience_months != null ? c.experience_months / 12 : c.experience_years
      if (expMin !== undefined) {
        if (candExpYears == null) {
          if (!includeUnknown) return false
        } else if (candExpYears < expMin) {
          return false
        }
      }
      if (expMax !== undefined) {
        if (candExpYears == null) {
          if (!includeUnknown) return false
        } else if (candExpYears > expMax) {
          return false
        }
      }

      // City with canonical alias resolution (e.g. Bangalore -> Bengaluru, Gurgaon -> Gurugram)
      if (city && city !== 'All') {
        const normFilterCity = normalizeCity(city).toLowerCase()
        const normCandCity = normalizeCity(c.location).toLowerCase()
        if (normCandCity !== normFilterCity) return false
      }

      // Grad Year
      if (gradYear !== undefined && c.grad_year !== gradYear) {
        return false
      }

      // Skills
      const candSkills = c.skills.map((s) => s.toLowerCase())
      if (skillsAll.length > 0) {
        if (!skillsAll.every((reqSkill) => candSkills.includes(reqSkill))) return false
      }
      if (skillsAny.length > 0) {
        if (!skillsAny.some((reqSkill) => candSkills.includes(reqSkill))) return false
      }
      if (skillsNone.length > 0) {
        if (skillsNone.some((reqSkill) => candSkills.includes(reqSkill))) return false
      }

      // Full-text query
      if (q) {
        const qLower = q.toLowerCase()
        const inName = c.name && c.name.toLowerCase().includes(qLower)
        const inCollege = c.college && c.college.toLowerCase().includes(qLower)
        const inSkills = c.skills && c.skills.some((s) => s.toLowerCase().includes(qLower))
        if (!inName && !inCollege && !inSkills) return false
      }

      return true
    })

    // Sorting
    const sort = query.get('sort')
    if (sort === 'cgpa_desc') {
      items.sort((a, b) => (b.cgpa ?? 0) - (a.cgpa ?? 0))
    } else if (sort === 'exp_desc') {
      items.sort((a, b) => (b.experience_years ?? 0) - (a.experience_years ?? 0))
    } else if (sort === 'name_asc') {
      items.sort((a, b) => a.name.localeCompare(b.name))
    }

    const page = parseInt(query.get('page') || '1', 10)
    const pageSize = parseInt(query.get('page_size') || '12', 10)
    const paginated = items.slice((page - 1) * pageSize, page * pageSize)

    return sendJson(res, 200, {
      items: paginated,
      total: items.length,
      page,
      page_size: pageSize,
    })
  }

  // 5. Candidate Detail & Patch
  const candMatch = pathname.match(/^\/candidates\/([^/]+)$/)
  if (candMatch) {
    const candId = candMatch[1]
    const cand = candidatesDb.find((c) => c.id === candId)
    if (!cand) {
      return sendJson(res, 404, { detail: `Candidate ${candId} not found.` })
    }

    if (req.method === 'GET') {
      return sendJson(res, 200, cand)
    }

    if (req.method === 'PATCH') {
      const body = await parseJsonBody(req)
      Object.assign(cand, body)
      return sendJson(res, 200, cand)
    }
  }

  // 6. Jobs List & Create
  if (pathname === '/jobs') {
    if (req.method === 'GET') {
      if (query.get('empty') === 'true') {
        return sendJson(res, 200, [])
      }
      return sendJson(res, 200, jobsDb)
    }

    if (req.method === 'POST') {
      const body = await parseJsonBody(req)
      const jdText = body.jd_text || body.jdText || ''

      // Attempt to match JD text to known JD key or extract fields
      const jdKeys = loadJdAnswerKey()
      const matchedJd = jdKeys.find(
        (k) =>
          jdText.toLowerCase().includes(k.title.toLowerCase()) ||
          (body.title && body.title.toLowerCase().includes(k.title.toLowerCase()))
      )

      const title = body.title || matchedJd?.title || 'New Job Posting'
      const loc = body.location || matchedJd?.location || 'Bengaluru'
      const reqSkills =
        body.required_skills ||
        body.requirements?.requiredSkills ||
        matchedJd?.required_skills || ['React', 'TypeScript']
      const prefSkills =
        body.preferred_skills ||
        body.requirements?.preferredSkills ||
        matchedJd?.preferred_skills || ['Docker']
      const minExp =
        body.min_experience ??
        body.requirements?.minExperience ??
        matchedJd?.min_experience_years ?? 2
      const minCgpa =
        body.min_cgpa ??
        body.requirements?.minCgpa ??
        matchedJd?.min_cgpa ?? 7.0
      const gradYears =
        body.grad_years ||
        body.requirements?.gradYears ||
        matchedJd?.grad_years || []

      const newJob = {
        id: `job-${jobsDb.length + 101}`,
        company_id: 'company-nova',
        title,
        department: title.includes('Campus') ? 'Campus Relations' : 'Engineering',
        location: loc,
        type: body.type || 'Full-time',
        jd_text: jdText,
        required_skills: reqSkills,
        preferred_skills: prefSkills,
        min_experience: minExp,
        min_cgpa: minCgpa,
        grad_years: gradYears,
        hard_filter_pass_candidate_ids: matchedJd?.hard_filter_pass_candidate_ids || [],
        status: body.status || 'active',
        created_at: new Date().toISOString(),
        applicant_count: candidatesDb.length,
      }
      jobsDb.push(newJob)
      return sendJson(res, 201, newJob)
    }
  }

  // 7. Job Detail & Patch
  const jobMatch = pathname.match(/^\/jobs\/([^/]+)$/)
  if (jobMatch) {
    const jobId = jobMatch[1]
    const job = jobsDb.find((j) => j.id === jobId)
    if (!job) {
      return sendJson(res, 404, { detail: `Job ${jobId} not found.` })
    }

    if (req.method === 'GET') {
      return sendJson(res, 200, job)
    }

    if (req.method === 'PATCH') {
      const body = await parseJsonBody(req)
      if (body.title !== undefined) job.title = body.title
      if (body.department !== undefined) job.department = body.department
      if (body.location !== undefined) job.location = body.location
      if (body.jd_text !== undefined) job.jd_text = body.jd_text
      if (body.required_skills !== undefined) job.required_skills = body.required_skills
      if (body.preferred_skills !== undefined) job.preferred_skills = body.preferred_skills
      if (body.min_experience !== undefined) job.min_experience = body.min_experience
      if (body.min_cgpa !== undefined) job.min_cgpa = body.min_cgpa
      if (body.grad_years !== undefined) job.grad_years = body.grad_years
      if (body.status !== undefined) job.status = body.status
      return sendJson(res, 200, job)
    }
  }

  // 8. Job Ranking (Ranked candidates with verified score breakdown)
  const rankingMatch = pathname.match(/^\/jobs\/([^/]+)\/ranking$/)
  if (req.method === 'GET' && rankingMatch) {
    const jobId = rankingMatch[1]
    const job = jobsDb.find((j) => j.id === jobId) || jobsDb[0]
    if (!job) return sendJson(res, 404, { detail: `Job ${jobId} not found.` })

    const passingIds = new Set(job.hard_filter_pass_candidate_ids || [])
    const requiredList = job.required_skills || []

    const ranked = candidatesDb.map((cand) => {
      const isPass = passingIds.has(cand.id)
      const candSkills = cand.skills || []

      // Matched and missing skills consistency
      const matched_skills = candSkills.filter((s) =>
        requiredList.some((req) => req.toLowerCase() === s.toLowerCase())
      )
      const missing_skills = requiredList.filter(
        (req) => !candSkills.some((s) => s.toLowerCase() === req.toLowerCase())
      )

      let skillsScore = 0
      let expScore = 0
      let eduScore = 0
      let semanticScore = 0

      if (isPass) {
        // High scores for candidates passing all hard filters
        const passIndex = [...passingIds].indexOf(cand.id)
        skillsScore = Math.max(85, 98 - passIndex * 2)
        expScore = Math.max(85, 95 - passIndex * 2)
        eduScore = Math.max(85, 94 - passIndex)
        semanticScore = Math.max(85, 92 - passIndex)
      } else {
        // Significantly lower scores for candidates failing hard filters
        const candExp = cand.experience_years ?? 0
        skillsScore = Math.min(50, Math.round((matched_skills.length / (requiredList.length || 1)) * 50))
        expScore = Math.min(50, Math.round(candExp * 10))
        eduScore = Math.min(55, Math.round((cand.cgpa ?? 6.0) * 6))
        semanticScore = 40
      }

      // Compute exact weighted score: 40% skills + 25% experience + 20% education + 15% semantic
      const match_score = Math.round(
        (skillsScore * 40 + expScore * 25 + eduScore * 20 + semanticScore * 15) / 100
      )

      return {
        candidate_id: cand.id,
        application_id: `app-${cand.id}`,
        name: cand.name,
        college: cand.college,
        match_score,
        breakdown: {
          skills: skillsScore,
          experience: expScore,
          education: eduScore,
          semantic: semanticScore,
        },
        matched_skills,
        missing_skills,
        explanation: isPass
          ? `Outstanding qualification. Matches required competency profile for ${job.title}.`
          : `Candidate does not meet all required qualification thresholds for ${job.title}.`,
        stage: 'applied',
        is_pass: isPass,
      }
    })

    // Sort descending by match_score
    ranked.sort((a, b) => b.match_score - a.match_score)

    return sendJson(res, 200, {
      job_id: jobId,
      candidates: ranked,
    })
  }

  // 9. Job Skill-Gap
  const skillGapMatch = pathname.match(/^\/jobs\/([^/]+)\/skill-gap$/)
  if (req.method === 'GET' && skillGapMatch) {
    const jobId = skillGapMatch[1]
    const job = jobsDb.find((j) => j.id === jobId) || jobsDb[0]
    const requiredSkills = job.required_skills || ['Python', 'SQL']
    const preferredSkills = job.preferred_skills || ['Docker', 'AWS']

    const allJdSkills = [
      ...requiredSkills.map((s) => ({ name: s, required: true })),
      ...preferredSkills.map((s) => ({ name: s, required: false })),
    ]

    const skillsData = allJdSkills.map((item) => {
      const count = candidatesDb.filter((c) =>
        c.skills.some((s) => s.toLowerCase() === item.name.toLowerCase())
      ).length
      const pct = Math.round((count / (candidatesDb.length || 1)) * 100)
      return {
        name: item.name,
        required: item.required,
        applicants_count: count,
        coverage_pct: pct,
      }
    })

    return sendJson(res, 200, {
      job_id: jobId,
      total_applicants: candidatesDb.length,
      skills: skillsData,
    })
  }

  // 10. Applications Listing
  if (req.method === 'GET' && pathname === '/applications') {
    if (query.get('empty') === 'true') {
      return sendJson(res, 200, [])
    }
    const jobId = query.get('job_id')
    let list = applicationsDb
    if (jobId && jobId !== 'all') {
      list = list.filter((a) => a.job_id === jobId)
    }
    return sendJson(res, 200, list)
  }

  // 11. Move Application (Transitions validation)
  const moveMatch = pathname.match(/^\/applications\/([^/]+)\/move$/)
  if (req.method === 'POST' && moveMatch) {
    const appId = moveMatch[1]
    const body = await parseJsonBody(req)
    const targetStage = body.stage

    const app = applicationsDb.find((a) => a.application_id === appId || a.id === appId)
    const currentStage = app?.stage || 'applied'

    // Canonical Kanban pipeline: applied -> shortlisted -> interview -> offer (or rejected)
    const validTransitions = {
      applied: ['shortlisted', 'rejected'],
      shortlisted: ['interview', 'rejected'],
      interview: ['offer', 'rejected'],
      offer: ['rejected', 'applied'],
      rejected: ['applied'],
    }

    const allowed = validTransitions[currentStage] || []
    if (!allowed.includes(targetStage)) {
      return sendJson(res, 400, {
        detail: `Invalid stage transition: Cannot jump directly from '${currentStage}' to '${targetStage}'. Must progress through standard pipeline flow.`,
      })
    }

    if (app) {
      app.stage = targetStage
    }

    return sendJson(res, 200, {
      success: true,
      stage: targetStage,
      historyId: `hist-${Date.now()}`,
    })
  }

  // 12. Compare Candidates (Strictly 2 or 3 allowed; 1 or 4+ returns 400)
  if (req.method === 'GET' && pathname === '/compare') {
    const ids = (query.get('ids') || '').split(',').filter(Boolean)
    if (ids.length < 2 || ids.length > 3) {
      return sendJson(res, 400, {
        detail: 'Comparison requires 2 or 3 candidates.',
      })
    }

    const compared = ids.map((id, idx) => {
      const cand = candidatesDb.find((c) => c.id === id) || {
        id,
        name: `Candidate #${id}`,
        college: 'Premier Institute',
        location: 'Bengaluru',
        cgpa: 8.5,
        experience_years: 2.0,
        skills: ['React', 'TypeScript', 'Node.js'],
      }

      return {
        candidate: cand,
        match_score: 92 - idx * 5,
        breakdown: { skills: 90, experience: 85, education: 95, semantic: 88 },
        matched_skills: cand.skills.slice(0, 3),
        missing_skills: ['Kubernetes'],
      }
    })

    return sendJson(res, 200, {
      candidates: compared,
      job: jobsDb[0],
    })
  }

  // 13. Bulk Email Dispatch (Proposed API endpoint)
  if (req.method === 'POST' && pathname === '/email/send') {
    if (query.get('simulate_fallback') === 'true') {
      return sendJson(res, 501, { detail: 'Email sending is not enabled on this server.' })
    }
    const body = await parseJsonBody(req)
    const recipients = body.recipients || []

    const results = recipients.map((r, idx) => {
      const email = r.to || ''
      // Scripted address or explicit test fail
      const isFailed =
        email.toLowerCase().includes('fail') ||
        email.toLowerCase().includes('invalid') ||
        r.candidate_id === 'C042' ||
        (idx === 1 && recipients.length >= 2 && Boolean(body.include_test_failure))

      if (isFailed) {
        return {
          candidate_id: r.candidate_id,
          email,
          status: 'failed',
          error: 'SMTP 550 5.1.1 Recipient address rejected: User unknown',
        }
      }

      return {
        candidate_id: r.candidate_id,
        email,
        status: 'sent',
      }
    })

    return sendJson(res, 200, { sent: results })
  }

  // Fallback 404
  return sendJson(res, 404, { detail: `Route ${req.method} ${pathname} not found on stub server.` })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`HireSwift stub server running at http://127.0.0.1:${PORT}`)
})

export default server
