/**
 * HireSwift Stub Server
 * Serves every endpoint in API.md using realistic test-data.
 * Includes:
 *   - One invalid transition (400 with detail)
 *   - One failed file in a batch
 *   - Full CORS support
 *   - Filter, pagination, and sorting for candidates
 */

import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../..')
const testDataDir = path.join(rootDir, 'test-data')

const PORT = process.env.PORT || 8000

// Load test data from answer_key.csv and JDs
let candidatesDb = []
let jobsDb = []
let applicationsDb = []

function loadTestData() {
  // 1. Load JDs
  const jdsDir = path.join(testDataDir, 'jds')
  if (fs.existsSync(jdsDir)) {
    const jdFiles = fs.readdirSync(jdsDir)
    jobsDb = jdFiles.map((file, idx) => {
      const content = fs.readFileSync(path.join(jdsDir, file), 'utf-8')
      const lines = content.split('\n')
      const titleLine = lines.find((l) => l.startsWith('# ')) || `# Position ${idx + 1}`
      const title = titleLine.replace('# ', '').trim()

      return {
        id: `job-${idx + 101}`,
        company_id: 'company-nova',
        title,
        department: title.includes('Campus') ? 'Campus Relations' : 'Engineering',
        location: 'Bengaluru',
        type: 'Full-time',
        jd_text: content,
        required_skills: title.includes('React')
          ? ['React', 'TypeScript', 'Tailwind CSS', 'Redux']
          : title.includes('Backend')
          ? ['Python', 'FastAPI', 'PostgreSQL', 'Docker']
          : title.includes('Data')
          ? ['Python', 'SQL', 'Pandas', 'Spark']
          : ['React', 'TypeScript', 'Node.js', 'Python', 'SQL'],
        preferred_skills: ['Docker', 'AWS', 'Kubernetes', 'GraphQL'],
        min_experience: title.includes('Campus') ? 0 : title.includes('Lead') || title.includes('Senior') ? 4 : 2,
        min_cgpa: 7.0,
        grad_years: [2022, 2023, 2024],
        status: 'active',
        created_at: new Date(Date.now() - idx * 86400000).toISOString(),
        applicant_count: 8 + (idx * 3),
      }
    })
  } else {
    jobsDb = [
      {
        id: 'job-101',
        company_id: 'company-nova',
        title: 'Senior Full Stack Engineer',
        department: 'Engineering',
        location: 'Bengaluru',
        type: 'Full-time',
        jd_text: 'Looking for a Senior Full Stack Engineer proficient in React and Python.',
        required_skills: ['React', 'TypeScript', 'Python', 'Node.js'],
        preferred_skills: ['Docker', 'PostgreSQL', 'AWS'],
        min_experience: 3,
        min_cgpa: 7.5,
        grad_years: [2022, 2023, 2024],
        status: 'active',
        created_at: new Date().toISOString(),
        applicant_count: 12,
      },
    ]
  }

  // 2. Load Candidates from answer_key.csv
  const answerKeyPath = path.join(testDataDir, 'answer_key.csv')
  if (fs.existsSync(answerKeyPath)) {
    const rawCsv = fs.readFileSync(answerKeyPath, 'utf-8')
    const lines = rawCsv.split('\n').filter(Boolean)
    const header = lines[0]

    candidatesDb = lines.slice(1).map((line, idx) => {
      // Split CSV by comma
      const parts = line.split(',')
      const id = parts[0]?.trim() || `cand-${idx + 1}`
      const name = parts[1]?.trim() || `Candidate ${idx + 1}`
      const why = parts[5]?.trim() || ''

      const colleges = ['IIT Delhi', 'IIT Bombay', 'NIT Trichy', 'BITS Pilani', 'DTU Delhi', 'VIT Vellore', 'SRM Chennai']
      const cities = ['Bengaluru', 'Noida', 'Gurugram', 'Hyderabad', 'Pune', 'Mumbai']
      const college = colleges[idx % colleges.length]
      const city = cities[idx % cities.length]
      const cgpa = Number((7.0 + ((idx * 37) % 28) / 10).toFixed(1))
      const exp = Number((1.0 + ((idx * 23) % 45) / 10).toFixed(1))

      let skills = ['Python', 'SQL', 'Git']
      if (why.includes('React')) skills.push('React', 'TypeScript')
      if (why.includes('Docker')) skills.push('Docker')
      if (why.includes('Node')) skills.push('Node.js')
      if (why.includes('PostgreSQL')) skills.push('PostgreSQL')
      if (why.includes('C++')) skills.push('C++', 'Algorithms')
      if (why.includes('Java')) skills.push('Java', 'Spring Boot')

      // Introduce duplicate groups for testing
      const isDup = idx === 1 || idx === 7
      const dupGroupId = isDup ? 'dup-grp-101' : null

      return {
        id,
        company_id: 'company-nova',
        name,
        email: `${id.toLowerCase()}@example.in`,
        phone: `+91 98765 ${10000 + idx}`,
        location: city,
        college,
        degree: 'B.Tech',
        branch: 'Computer Science',
        grad_year: 2024 - (idx % 3),
        tenth_percent: 85 + (idx % 12),
        twelfth_percent: 82 + (idx % 14),
        cgpa,
        skills,
        experience_years: exp,
        experience: [
          {
            title: 'Software Developer',
            company: 'Tech Solutions India',
            duration: `${exp} years`,
            description: `Developed features using ${skills.slice(0, 2).join(', ')}.`,
          },
        ],
        projects: [
          {
            title: 'Platform Modernization',
            description: 'Refactored backend microservices.',
            technologies: skills,
          },
        ],
        certifications: ['AWS Certified Developer'],
        resume_text: `Resume of ${name}. Graduated from ${college}. Proficient in ${skills.join(', ')}.`,
        resume_file_name: `${id}_resume.pdf`,
        parse_confidence: 90 - (idx % 15),
        field_confidence: { cgpa: 92, skills: 88, experience: 85 },
        custom_fields: {},
        is_duplicate: isDup,
        duplicate_group_id: dupGroupId,
        source: 'Bulk Resume Upload',
        created_at: new Date(Date.now() - idx * 3600000).toISOString(),
      }
    })
  }

  // 3. Create Applications for candidates linked to jobs
  applicationsDb = candidatesDb.map((cand, idx) => {
    const job = jobsDb[idx % jobsDb.length] || jobsDb[0]
    const stages = ['applied', 'shortlisted', 'interview', 'offer', 'rejected']
    const stage = idx === 0 ? 'applied' : stages[idx % stages.length]
    // One candidate has missing match_score and breakdown per spec (testing no invented values)
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
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
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

function parseBody(req) {
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

  // Strip leading /api if present for uniform routing
  if (pathname.startsWith('/api')) {
    pathname = pathname.substring(4) || '/'
  }

  const query = parsedUrl.searchParams

  // 1. Health
  if (req.method === 'GET' && pathname === '/health') {
    return sendJson(res, 200, { status: 'ok', version: '1.0.0', database: 'connected' })
  }

  // 2. Bulk Resume Ingestion
  if (req.method === 'POST' && pathname === '/resumes/bulk') {
    return sendJson(res, 202, {
      batch_id: 'batch-test-001',
      total_files: 2,
      status: 'processing',
    })
  }

  // 3. Batch Progress (includes one failed file in batch per spec)
  const batchProgressMatch = pathname.match(/^\/batches\/([^/]+)\/progress$/)
  if (req.method === 'GET' && batchProgressMatch) {
    const batchId = batchProgressMatch[1]
    return sendJson(res, 200, {
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
    })
  }

  // 4. Candidates Directory (handles filters, empty mode)
  if (req.method === 'GET' && pathname === '/candidates') {
    if (query.get('empty') === 'true') {
      return sendJson(res, 200, { items: [], total: 0, page: 1, page_size: 12 })
    }

    let items = [...candidatesDb]

    // Filters
    const q = query.get('q')
    if (q) {
      const qLow = q.toLowerCase()
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(qLow) ||
          c.college.toLowerCase().includes(qLow) ||
          c.skills.some((s) => s.toLowerCase().includes(qLow))
      )
    }

    const cgpaMin = parseFloat(query.get('cgpa_min') || '0')
    if (cgpaMin > 0) {
      items = items.filter((c) => (c.cgpa ?? 0) >= cgpaMin)
    }

    const expMin = parseFloat(query.get('exp_min') || '0')
    if (expMin > 0) {
      items = items.filter((c) => (c.experience_years ?? 0) >= expMin)
    }

    const city = query.get('city')
    if (city && city !== 'All') {
      items = items.filter((c) => c.location.toLowerCase() === city.toLowerCase())
    }

    const skillsAll = query.get('skills_all')
    if (skillsAll) {
      const reqSkills = skillsAll.split(',').map((s) => s.trim().toLowerCase())
      items = items.filter((c) => {
        const cSkills = c.skills.map((s) => s.toLowerCase())
        return reqSkills.every((req) => cSkills.some((s) => s.includes(req)))
      })
    }

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
      const body = await parseBody(req)
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
      const body = await parseBody(req)
      const newJob = {
        id: `job-${jobsDb.length + 101}`,
        company_id: body.company_id || 'company-nova',
        title: body.title || 'New Job Posting',
        department: body.department || 'Engineering',
        location: body.location || 'Bengaluru',
        type: body.type || 'Full-time',
        jd_text: body.jd_text || body.jdText || '',
        required_skills: body.required_skills || body.requirements?.requiredSkills || ['React', 'TypeScript'],
        preferred_skills: body.preferred_skills || body.requirements?.preferredSkills || ['Docker'],
        min_experience: body.min_experience ?? body.requirements?.minExperience ?? 2,
        min_cgpa: body.min_cgpa ?? body.requirements?.minCgpa ?? 7.0,
        grad_years: body.grad_years || body.requirements?.gradYears || [2024],
        status: body.status || 'active',
        created_at: new Date().toISOString(),
        applicant_count: 0,
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
      const body = await parseBody(req)
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

  // 8. Job Ranking
  const rankingMatch = pathname.match(/^\/jobs\/([^/]+)\/ranking$/)
  if (req.method === 'GET' && rankingMatch) {
    const jobId = rankingMatch[1]
    const job = jobsDb.find((j) => j.id === jobId)
    if (!job) return sendJson(res, 404, { detail: `Job ${jobId} not found.` })

    const candidates = candidatesDb.slice(0, 10).map((cand, idx) => ({
      candidate_id: cand.id,
      application_id: `app-${cand.id}`,
      name: cand.name,
      college: cand.college,
      candidate: cand,
      match_score: 95 - idx * 4,
      breakdown: {
        skills: 90 - idx * 2,
        experience: 85 - idx * 3,
        education: 90,
        semantic: 88,
      },
      matched_skills: cand.skills.slice(0, 3),
      missing_skills: ['Kubernetes'],
      explanation: `Strong match for ${job.title} based on skill portfolio.`,
      stage: idx === 0 ? 'applied' : 'shortlisted',
    }))

    return sendJson(res, 200, {
      job_id: jobId,
      candidates,
    })
  }

  // 9. Job Skill-Gap
  const skillGapMatch = pathname.match(/^\/jobs\/([^/]+)\/skill-gap$/)
  if (req.method === 'GET' && skillGapMatch) {
    const jobId = skillGapMatch[1]
    return sendJson(res, 200, {
      job_id: jobId,
      total_applicants: candidatesDb.length,
      skills: [
        { name: 'React', required: true, applicants_count: 38, coverage_pct: 82 },
        { name: 'TypeScript', required: true, applicants_count: 34, coverage_pct: 74 },
        { name: 'Python', required: true, applicants_count: 30, coverage_pct: 65 },
        { name: 'Node.js', required: false, applicants_count: 26, coverage_pct: 56 },
        { name: 'Kubernetes', required: true, applicants_count: 8, coverage_pct: 17 },
      ],
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

  // 11. Move Application (includes 1 invalid transition returning 400 per spec)
  const moveMatch = pathname.match(/^\/applications\/([^/]+)\/move$/)
  if (req.method === 'POST' && moveMatch) {
    const appId = moveMatch[1]
    const body = await parseBody(req)
    const targetStage = body.stage

    const app = applicationsDb.find((a) => a.application_id === appId || a.id === appId)
    const currentStage = app?.stage || 'applied'

    // SPEC REQUIREMENT: Include one invalid transition (400 with detail)
    // Moving directly from 'applied' to 'offer' is invalid!
    if ((currentStage === 'applied' && targetStage === 'offer') || targetStage === 'invalid_target') {
      return sendJson(res, 400, {
        detail: `Invalid stage transition: Cannot jump directly from '${currentStage}' to '${targetStage}'. Must progress through screening.`,
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

  // 12. Compare Candidates (maximum 3 allowed)
  if (req.method === 'GET' && pathname === '/compare') {
    const ids = (query.get('ids') || '').split(',').filter(Boolean)
    if (ids.length > 3) {
      return sendJson(res, 400, {
        detail: 'Comparison is limited to a maximum of 3 candidates.',
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
        matched_skills: ['React', 'TypeScript'],
        missing_skills: ['Kubernetes'],
      }
    })

    return sendJson(res, 200, {
      candidates: compared,
      job: jobsDb[0],
    })
  }

  // Fallback 404
  return sendJson(res, 404, { detail: `Route ${req.method} ${pathname} not found on stub server.` })
})

server.listen(PORT, () => {
  console.log(`HireSwift stub server running at http://127.0.0.1:${PORT}`)
})

export default server
