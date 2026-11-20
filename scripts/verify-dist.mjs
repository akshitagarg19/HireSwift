#!/usr/bin/env node
/**
 * scripts/verify-dist.mjs
 * Builds the frontend, starts a tiny static server with SPA fallback,
 * tests core SPA routes, and verifies index.html fallback.
 */

import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const distDir = path.resolve(rootDir, 'frontend', 'dist')
const indexHtmlPath = path.resolve(distDir, 'index.html')

console.log('=== [1/4] Building frontend bundle ===')
try {
  execSync('npm --prefix frontend run build', { stdio: 'inherit', cwd: rootDir })
} catch (err) {
  console.error('❌ Build failed:', err.message)
  process.exit(1)
}

if (!fs.existsSync(indexHtmlPath)) {
  console.error('❌ dist/index.html does not exist!')
  process.exit(1)
}

const indexContent = fs.readFileSync(indexHtmlPath, 'utf8')
if (indexContent.trim().length === 0 || !indexContent.includes('<div id="root">')) {
  console.error('❌ dist/index.html is blank or missing #root mount point!')
  process.exit(1)
}
console.log('✓ Build successful and dist/index.html validated.')

// MIME type lookup
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

console.log('=== [2/4] Starting temporary static server with SPA fallback ===')
const server = http.createServer((req, res) => {
  const urlPath = req.url ? req.url.split('?')[0] : '/'
  const filePath = path.join(distDir, urlPath)

  // Serve static file if it exists
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': contentType })
    fs.createReadStream(filePath).pipe(res)
    return
  }

  // SPA Fallback: serve index.html for all other routes
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(indexContent)
})

server.listen(0, '127.0.0.1', async () => {
  const address = server.address()
  const port = address.port
  const baseUrl = `http://127.0.0.1:${port}`
  console.log(`✓ Server running at ${baseUrl}`)

  const testRoutes = [
    { path: '/', label: 'Root Landing Page' },
    { path: '/app/candidates', label: 'Candidates Directory (Deep Link)' },
    { path: '/app/pipeline', label: 'Pipeline Kanban (Deep Link)' },
    { path: '/app/nonexistent-route-xyz', label: 'Unknown SPA Route (Fallback)' },
  ]

  let allPassed = true
  console.log('=== [3/4] Requesting test routes ===')

  for (const route of testRoutes) {
    try {
      const response = await fetch(`${baseUrl}${route.path}`)
      const text = await response.text()

      if (response.status !== 200) {
        console.error(`❌ ${route.label} (${route.path}) returned HTTP ${response.status} (expected 200)`)
        allPassed = false
        continue
      }

      if (!text || text.trim().length === 0) {
        console.error(`❌ ${route.label} (${route.path}) returned a blank page!`)
        allPassed = false
        continue
      }

      if (!text.includes('<div id="root">')) {
        console.error(`❌ ${route.label} (${route.path}) does not contain #root mount!`)
        allPassed = false
        continue
      }

      console.log(`✓ ${route.label} (${route.path}) -> HTTP 200, HTML length: ${text.length} bytes`)
    } catch (reqErr) {
      console.error(`❌ Failed requesting ${route.path}:`, reqErr.message)
      allPassed = false
    }
  }

  server.close(() => {
    console.log('=== [4/4] Summary ===')
    if (allPassed) {
      console.log('✅ ALL DIST VERIFICATION CHECKS PASSED!')
      process.exitCode = 0
    } else {
      console.error('❌ ONE OR MORE DIST VERIFICATION CHECKS FAILED!')
      process.exitCode = 1
    }
  })
})
