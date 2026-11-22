#!/usr/bin/env node
/**
 * qa/smoke-live.mjs
 * Quick live smoke test against deployed FastAPI backend.
 * Checks:
 *   - GET /health
 *   - GET /candidates?page_size=1
 *   - GET /jobs
 *   - GET /applications
 * Prints HTTP status, response time, top-level JSON keys, and differences from API.md.
 * Exits cleanly with code 1 if QA_BASE_URL is missing or if endpoints fail.
 */

const QA_BASE_URL = process.env.QA_BASE_URL

if (!QA_BASE_URL || !QA_BASE_URL.trim()) {
  console.error('\n❌ ERROR: QA_BASE_URL environment variable is required to run live smoke checks.')
  console.error('Usage:')
  console.error('  QA_BASE_URL=https://<your-backend>.onrender.com/api npm run qa:smoke')
  console.error('  or')
  console.error('  QA_BASE_URL=http://127.0.0.1:8000/api npm run qa:smoke\n')
  process.exit(1)
}

const rawBaseUrl = QA_BASE_URL.trim().replace(/\/+$/, '')
// Ensure base URL points to /api or root as intended
const baseUrl = rawBaseUrl

console.log('\n======================================================')
console.log('🩺 HireSwift Live Backend Smoke Check')
console.log(`📡 Target Base URL: ${baseUrl}`)
console.log(`⏰ Timestamp:       ${new Date().toISOString()}`)
console.log('======================================================\n')

const ENDPOINTS = [
  {
    name: 'System Health',
    method: 'GET',
    path: '/health',
    expectedKeys: ['status'],
    validate: (data) => {
      const diffs = []
      if (!data || typeof data !== 'object') {
        diffs.push('Response is not a JSON object')
        return diffs
      }
      if (!('status' in data)) {
        diffs.push("Missing top-level key 'status' (expected 'ok')")
      }
      return diffs
    },
  },
  {
    name: 'Candidates Directory (1 Item)',
    method: 'GET',
    path: '/candidates?page_size=1',
    expectedKeys: ['candidates', 'total', 'page', 'page_size'],
    validate: (data) => {
      const diffs = []
      if (!data || typeof data !== 'object') {
        diffs.push('Response is not a JSON object')
        return diffs
      }
      const candidatesList = Array.isArray(data) ? data : data.candidates || data.items
      if (!candidatesList) {
        diffs.push("Missing candidates array ('candidates' or 'items')")
      } else if (Array.isArray(candidatesList) && candidatesList.length > 0) {
        const first = candidatesList[0]
        if (!first.id && !first.candidate_id) {
          diffs.push("Candidate item missing 'id' or 'candidate_id'")
        }
        if (!('skills' in first)) {
          diffs.push("Candidate item missing 'skills' array")
        }
        if (!('is_duplicate' in first)) {
          diffs.push("Candidate item missing 'is_duplicate' boolean")
        }
      }
      if (Array.isArray(data)) {
        diffs.push('Returns bare array instead of paginated object { candidates, total, page, page_size }')
      }
      return diffs
    },
  },
  {
    name: 'Job Requisitions',
    method: 'GET',
    path: '/jobs',
    expectedKeys: ['id', 'title', 'department', 'status'],
    validate: (data) => {
      const diffs = []
      const list = Array.isArray(data) ? data : data?.jobs
      if (!list || !Array.isArray(list)) {
        diffs.push('Response is neither an array of jobs nor an object with .jobs array')
        return diffs
      }
      if (list.length > 0) {
        const first = list[0]
        const snakeKeys = ['applicant_count', 'required_skills', 'min_experience']
        const camelKeys = ['applicantCount', 'requiredSkills', 'minExperience']
        const presentCamel = camelKeys.filter((k) => k in first)
        if (presentCamel.length > 0) {
          diffs.push(`Job object uses camelCase keys (${presentCamel.join(', ')}) instead of snake_case per API.md`)
        }
        if (!('id' in first) || !('title' in first)) {
          diffs.push("Job object missing required 'id' or 'title'")
        }
      }
      return diffs
    },
  },
  {
    name: 'Applications List',
    method: 'GET',
    path: '/applications',
    expectedKeys: ['application_id', 'job_id', 'candidate_id', 'stage'],
    validate: (data) => {
      const diffs = []
      const list = Array.isArray(data) ? data : data?.applications
      if (!list || !Array.isArray(list)) {
        diffs.push('Response is neither an array of applications nor an object with .applications array')
        return diffs
      }
      if (list.length > 0) {
        const first = list[0]
        if (!first.application_id && first.id) {
          diffs.push("Application uses 'id' instead of 'application_id' per API.md specification")
        }
        if (!('stage' in first)) {
          diffs.push("Application missing 'stage' field")
        }
        if (!('candidate' in first)) {
          diffs.push("Application missing embedded 'candidate' summary object { name, college, skills, is_duplicate }")
        }
      }
      return diffs
    },
  },
]

async function runSmoke() {
  const summary = []
  let allHealthy = true

  for (const ep of ENDPOINTS) {
    const url = `${baseUrl}${ep.path}`
    const start = performance.now()
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      })
      const durationMs = Math.round(performance.now() - start)
      let body = null
      try {
        body = await res.json()
      } catch {
        // Not JSON
      }

      const statusText = `${res.status} ${res.statusText}`
      const is2xx = res.status >= 200 && res.status < 300
      if (!is2xx) allHealthy = false

      let topKeys = []
      if (body && typeof body === 'object') {
        topKeys = Array.isArray(body)
          ? body.length > 0
            ? Object.keys(body[0]).slice(0, 6).map((k) => `[0].${k}`)
            : ['[] (empty array)']
          : Object.keys(body).slice(0, 8)
      }

      const diffs = body ? ep.validate(body) : [`HTTP ${res.status} error`]

      console.log(`▸ [${ep.method} ${ep.path}]`)
      console.log(`  Status:       ${is2xx ? '✅' : '❌'} ${statusText} (${durationMs}ms)`)
      console.log(`  Top-Level:    ${topKeys.length > 0 ? topKeys.join(', ') : '(empty or non-JSON)'}`)
      if (diffs.length === 0) {
        console.log(`  Contract:     ✅ Matches API.md specification`)
      } else {
        console.log(`  Contract:     ⚠️ Differences from API.md:`)
        diffs.forEach((d) => console.log(`                - ${d}`))
      }
      console.log('')

      summary.push({
        endpoint: `${ep.method} ${ep.path}`,
        status: statusText,
        duration: `${durationMs}ms`,
        passed: is2xx,
        diffCount: diffs.length,
      })
    } catch (err) {
      allHealthy = false
      const durationMs = Math.round(performance.now() - start)
      console.log(`▸ [${ep.method} ${ep.path}]`)
      console.log(`  Status:       ❌ Connection Error (${durationMs}ms)`)
      console.log(`  Error:        ${err.message}`)
      console.log('')
      summary.push({
        endpoint: `${ep.method} ${ep.path}`,
        status: 'CONNECTION_ERROR',
        duration: `${durationMs}ms`,
        passed: false,
        diffCount: 1,
      })
    }
  }

  console.log('------------------------------------------------------')
  console.log('📊 Smoke Test Summary:')
  console.table(summary)

  if (allHealthy) {
    console.log('✅ Live backend responded successfully to all smoke endpoints.\n')
    process.exit(0)
  } else {
    console.error('❌ One or more smoke endpoints failed or returned non-2xx status.\n')
    process.exit(1)
  }
}

runSmoke()
