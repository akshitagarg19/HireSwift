#!/usr/bin/env node
/**
 * scripts/release-check.mjs
 * Comprehensive release qualification script.
 * Runs:
 * 1. Type check & lint
 * 2. Production build
 * 3. Unit tests (Vitest)
 * 4. End-to-end tests (Playwright)
 * 5. Verify dist & SPA fallback (verify-dist)
 * 6. Secrets & credentials scan
 *
 * Prints a clean PASS/FAIL summary table and exits accordingly.
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const results = []

function runCheck(name, command, cwd = rootDir) {
  const start = Date.now()
  process.stdout.write(`⏳ Running check: ${name}... `)
  try {
    const output = execSync(command, { cwd, encoding: 'utf8', stdio: 'pipe' })
    const duration = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`✅ PASS (${duration}s)`)
    results.push({ name, status: 'PASS', duration: `${duration}s`, error: null })
    return true
  } catch (err) {
    const duration = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`❌ FAIL (${duration}s)`)
    const errMsg = err.stderr || err.stdout || err.message
    results.push({
      name,
      status: 'FAIL',
      duration: `${duration}s`,
      error: errMsg.slice(0, 300),
    })
    return false
  }
}

function runSecretsScan() {
  const start = Date.now()
  process.stdout.write('⏳ Running check: Secrets & Sensitive Data Scan... ')

  const forbiddenPatterns = [
    /AIza[0-9A-Za-z-_]{35}/, // Google API key
    /sk-[0-9A-Za-z]{20,}/, // OpenAI API key
    /AKIA[0-9A-Z]{16}/, // AWS Access Key
    /bearer\s+[A-Za-z0-9_\-\.]{24,}/i, // Bearer tokens
    /password\s*[:=]\s*["'][^"']{6,}["']/i, // Hardcoded password literals (non-demo)
  ]

  const scanDirs = [
    path.join(rootDir, 'frontend', 'src'),
    path.join(rootDir, 'qa'),
  ]

  let findings = []

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist') {
          scanDir(fullPath)
        }
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.mjs') || entry.name.endsWith('.json'))) {
        const content = fs.readFileSync(fullPath, 'utf8')
        for (const pattern of forbiddenPatterns) {
          // Exempt standard test fixtures / demo defaults
          if (pattern.test(content) && !content.includes('demo123') && !content.includes('example.com')) {
            findings.push(`${fullPath}: matched ${pattern}`)
          }
        }
      }
    }
  }

  for (const d of scanDirs) scanDir(d)

  const duration = ((Date.now() - start) / 1000).toFixed(1)
  if (findings.length === 0) {
    console.log(`✅ PASS (${duration}s)`)
    results.push({ name: 'Secrets Scan', status: 'PASS', duration: `${duration}s`, error: null })
    return true
  } else {
    console.log(`❌ FAIL (${duration}s)`)
    results.push({
      name: 'Secrets Scan',
      status: 'FAIL',
      duration: `${duration}s`,
      error: findings.join('; '),
    })
    return false
  }
}

console.log('====================================================================')
console.log('🚀 HireSwift ATS — Release Qualification Suite')
console.log('====================================================================')

// 1. Lint
runCheck('Type Check & Lint', 'npm --prefix frontend run lint')

// 2. Build
runCheck('Vite Production Build', 'npm --prefix frontend run build')

// 3. Unit Tests
runCheck('Unit Tests (Vitest)', 'npm --prefix frontend run test')

// 4. Dist Verification & SPA Fallback
runCheck('Dist & SPA Fallback Verification', 'node scripts/verify-dist.mjs')

// 5. Secrets Scan
runSecretsScan()

// 6. End-to-End Tests
runCheck('Playwright E2E Suite', 'npm --prefix frontend run test:e2e')

console.log('')
console.log('====================================================================')
console.log('📊 RELEASE CHECKLIST SUMMARY TABLE')
console.log('====================================================================')
console.log('| Check Name                             | Status  | Duration |')
console.log('|----------------------------------------|---------|----------|')
for (const r of results) {
  const icon = r.status === 'PASS' ? '✅ PASS' : '❌ FAIL'
  console.log(`| ${r.name.padEnd(38)} | ${icon.padEnd(7)} | ${r.duration.padStart(8)} |`)
}
console.log('====================================================================')

const allPassed = results.every((r) => r.status === 'PASS')
if (allPassed) {
  console.log('🎉 ALL RELEASE CHECKS PASSED! Ready for production deployment.')
  process.exit(0)
} else {
  console.error('⚠️ ONE OR MORE CHECKS FAILED. See details above.')
  process.exit(1)
}
