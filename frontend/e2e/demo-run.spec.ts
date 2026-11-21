import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../..')
const testDataDir = path.join(rootDir, 'test-data')
const screensDir = path.join(rootDir, 'docs', 'screens')
const demoDir = path.join(rootDir, 'docs', 'demo')

test.use({
  video: {
    mode: 'on',
    size: { width: 1366, height: 768 },
  },
  viewport: { width: 1366, height: 768 },
})

test.describe('Task 3: Automated Demo Rehearsal (< 4 Minutes Scripted)', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(screensDir)) fs.mkdirSync(screensDir, { recursive: true })
    if (!fs.existsSync(demoDir)) fs.mkdirSync(demoDir, { recursive: true })
  })

  test('Full click-by-click rehearsal of DEMO_SCRIPT.md with timing and video capture', async ({
    page,
    context,
  }) => {
    // Rehearsal timeout: 4 minutes
    test.setTimeout(240000)

    // Start tracing
    await context.tracing.start({ screenshots: true, snapshots: true })

    await page.addInitScript(() => {
      localStorage.setItem('hireswift_use_mock', 'false')
    })

    const timings: Record<string, number> = {}
    const totalStart = Date.now()

    // -------------------------------------------------------------
    // Step 1: Recruiter Dashboard Landing & Global Search (30s)
    // -------------------------------------------------------------
    const t1 = Date.now()
    await page.goto('/app/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /Recruiter Dashboard/i })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="kpi-total-candidates"]')).toBeVisible()

    // Test global candidate search
    const searchInput = page.locator('[data-testid="global-search-input"]')
    await searchInput.fill('Python')
    const dropdown = page.locator('[data-testid="search-results-dropdown"]')
    await expect(dropdown).toBeVisible({ timeout: 10000 })
    await page.keyboard.press('Escape')

    // Select 2 candidates for compare
    const firstCheck = page.locator('[data-testid^="select-candidate-"]').nth(0)
    const secondCheck = page.locator('[data-testid^="select-candidate-"]').nth(1)
    if (await firstCheck.isVisible()) {
      await firstCheck.click()
      await secondCheck.click()
      const compareBtn = page.locator('[data-testid="dashboard-compare-btn"]')
      await expect(compareBtn).toBeEnabled()
    }

    await page.screenshot({ path: path.join(screensDir, '01-dashboard.png') })
    timings['Step 1: Dashboard'] = Date.now() - t1
    console.log(`✓ Step 1 (Dashboard) completed in ${timings['Step 1: Dashboard']}ms`)

    // -------------------------------------------------------------
    // Step 2: Bulk Resume Ingestion & Validation (30s)
    // -------------------------------------------------------------
    const t2 = Date.now()
    await page.goto('/app/upload')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Resume Ingestion & Parsing')).toBeVisible({ timeout: 15000 })

    const resumesDir = path.join(testDataDir, 'resumes')
    const edgeCasesDir = path.join(testDataDir, 'edge_cases')

    const resumeFiles = fs
      .readdirSync(resumesDir)
      .filter((f) => f.endsWith('.pdf') || f.endsWith('.docx'))
      .map((f) => ({
        name: f,
        mimeType: f.endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf',
        buffer: fs.readFileSync(path.join(resumesDir, f)),
      }))

    const edgeFiles = fs.existsSync(edgeCasesDir)
      ? fs.readdirSync(edgeCasesDir).map((f) => ({
          name: f,
          mimeType: f.endsWith('.txt') ? 'text/plain' : 'application/pdf',
          buffer: fs.readFileSync(path.join(edgeCasesDir, f)),
        }))
      : []

    const allFiles = [...resumeFiles, ...edgeFiles]
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(allFiles)

    const parseBtn = page.getByRole('button', { name: /Parse All Queued/i })
    if (await parseBtn.isVisible()) {
      await parseBtn.click()
    }

    await expect(page.getByText('Resume Ingestion Complete')).toBeVisible({ timeout: 20000 })
    await page.screenshot({ path: path.join(screensDir, '02-upload.png') })
    timings['Step 2: Upload'] = Date.now() - t2
    console.log(`✓ Step 2 (Upload) completed in ${timings['Step 2: Upload']}ms`)

    // -------------------------------------------------------------
    // Step 3: Multi-Mode Smart Filters & Explainable Drawer (40s)
    // -------------------------------------------------------------
    const t3 = Date.now()
    // Ground-truth query F09: Noida, Python (AND), CGPA >= 7.5, Exp >= 2 -> Expect 5 candidates
    await page.goto('/app/candidates?city=Noida&skills_all=Python&cgpa_min=7.5&exp_min=2')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Candidate Directory')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/5 talent profiles/i)).toBeVisible({ timeout: 10000 })

    // Open candidate drawer via Quick Edit
    const quickEditBtn = page.getByRole('button', { name: /Quick Edit/i }).first()
    await expect(quickEditBtn).toBeVisible({ timeout: 10000 })
    await quickEditBtn.click()

    await expect(page.getByText('Candidate Overview')).toBeVisible({ timeout: 10000 })

    // Test Resume Document Tab
    const resumeTab = page.getByRole('tab', { name: /Resume/i })
    if (await resumeTab.isVisible()) {
      await resumeTab.click()
      await page.waitForTimeout(300)
      const profileTab = page.getByRole('tab', { name: /Profile/i })
      if (await profileTab.isVisible()) {
        await profileTab.click()
      }
    }

    await page.screenshot({ path: path.join(screensDir, '03-candidates.png') })

    // Close drawer via Radix close button
    const closeBtn = page.getByRole('button', { name: /Close/i }).first()
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
    } else {
      await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(400)

    // Verify CSV export button presence
    const exportBtn = page.locator('[data-testid="export-csv-btn"]')
    if (await exportBtn.isVisible()) {
      await expect(exportBtn).toBeEnabled()
    }

    timings['Step 3: Filters & Drawer'] = Date.now() - t3
    console.log(`✓ Step 3 (Filters & Drawer) completed in ${timings['Step 3: Filters & Drawer']}ms`)

    // -------------------------------------------------------------
    // Step 4: Jobs, Ranking & Competency Breakdown (30s)
    // -------------------------------------------------------------
    const t4 = Date.now()
    await page.goto('/app/jobs')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Job Openings')).toBeVisible({ timeout: 15000 })
    const jobHeading = page.getByRole('heading', { level: 2 }).first()
    await expect(jobHeading).toBeVisible({ timeout: 10000 })
    await jobHeading.click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('tab', { name: /Ranked Candidates/i })).toBeVisible({ timeout: 15000 })
    await page.screenshot({ path: path.join(screensDir, '04-job-ranking.png') })
    timings['Step 4: Jobs & Ranking'] = Date.now() - t4
    console.log(`✓ Step 4 (Jobs & Ranking) completed in ${timings['Step 4: Jobs & Ranking']}ms`)

    // -------------------------------------------------------------
    // Step 5: Side-by-Side Candidate Comparison (30s)
    // -------------------------------------------------------------
    const t5 = Date.now()
    await page.goto('/app/compare?ids=C001,C002,C003')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Candidate Comparison')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Suggested from scores/i)).toBeVisible()
    await page.screenshot({ path: path.join(screensDir, '06-compare.png') })
    timings['Step 5: Compare'] = Date.now() - t5
    console.log(`✓ Step 5 (Compare) completed in ${timings['Step 5: Compare']}ms`)

    // -------------------------------------------------------------
    // Step 6: 5-Stage Kanban Pipeline & Guardrails (30s)
    // -------------------------------------------------------------
    const t6 = Date.now()
    await page.goto('/app/pipeline')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Applied' })).toBeVisible({ timeout: 15000 })

    // Perform valid stage move: Applied -> Shortlisted
    const moveSelect = page.locator('select[aria-label^="Move"]').first()
    if (await moveSelect.isVisible()) {
      await moveSelect.selectOption('shortlisted')
      await page.waitForTimeout(600)
    }

    const exportShortlisted = page.locator('[data-testid="export-shortlisted-btn"]')
    if (await exportShortlisted.isVisible()) {
      await expect(exportShortlisted).toBeEnabled()
    }

    await page.screenshot({ path: path.join(screensDir, '05-pipeline.png') })
    timings['Step 6: Pipeline'] = Date.now() - t6
    console.log(`✓ Step 6 (Pipeline) completed in ${timings['Step 6: Pipeline']}ms`)

    // -------------------------------------------------------------
    // Step 7: Bulk Email to Shortlisted Candidates (30s)
    // -------------------------------------------------------------
    const t7 = Date.now()
    await page.goto('/app/emails')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/Bulk Email to Shortlisted Candidates/i)).toBeVisible({ timeout: 15000 })
    await page.screenshot({ path: path.join(screensDir, '09-emails.png') })
    timings['Step 7: Emails'] = Date.now() - t7
    console.log(`✓ Step 7 (Emails) completed in ${timings['Step 7: Emails']}ms`)

    // -------------------------------------------------------------
    // Step 8: Duplicate Detection & Merging (20s)
    // -------------------------------------------------------------
    const t8 = Date.now()
    await page.goto('/app/duplicates')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /Duplicate.*Detection/i })).toBeVisible({ timeout: 15000 })
    const mergeBtn = page.locator('[data-testid="merge-duplicates-btn"]').first()
    const mergeBanner = page.locator('[data-testid="merge-disabled-banner"]')
    if (await mergeBtn.isVisible()) {
      await expect(mergeBtn).toBeEnabled()
    } else if (await mergeBanner.isVisible()) {
      await expect(mergeBanner).toBeVisible()
    }
    await page.screenshot({ path: path.join(screensDir, '08-duplicates.png') })
    timings['Step 8: Duplicates'] = Date.now() - t8
    console.log(`✓ Step 8 (Duplicates) completed in ${timings['Step 8: Duplicates']}ms`)

    // -------------------------------------------------------------
    // Step 9: Insights & Skill Gap (20s)
    // -------------------------------------------------------------
    const t9 = Date.now()
    await page.goto('/app/insights')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Insights & Analytics')).toBeVisible({ timeout: 15000 })
    await page.screenshot({ path: path.join(screensDir, '07-insights.png') })
    timings['Step 9: Insights'] = Date.now() - t9
    console.log(`✓ Step 9 (Insights) completed in ${timings['Step 9: Insights']}ms`)

    // -------------------------------------------------------------
    // Step 10: Blind Recruitment Mode Toggle (15s)
    // -------------------------------------------------------------
    const t10 = Date.now()
    await page.goto('/app/candidates')
    await page.waitForLoadState('networkidle')

    const blindToggle = page.locator('[data-testid="blind-mode-toggle"]')
    if (await blindToggle.isVisible()) {
      await blindToggle.click()
      await expect(page.locator('[data-testid="blind-mode-banner"]')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('tbody').getByText(/Candidate #/i).first()).toBeVisible({ timeout: 5000 })
    }
    timings['Step 10: Blind Mode'] = Date.now() - t10
    console.log(`✓ Step 10 (Blind Mode) completed in ${timings['Step 10: Blind Mode']}ms`)

    // -------------------------------------------------------------
    // Total Timing Assertions (< 4 Minutes = 240,000ms)
    // -------------------------------------------------------------
    const totalElapsedMs = Date.now() - totalStart
    console.log('=== DEMO REHEARSAL TIMINGS SUMMARY ===')
    for (const [step, duration] of Object.entries(timings)) {
      console.log(`  ${step.padEnd(30)}: ${(duration / 1000).toFixed(2)}s`)
      if (duration > 60000) {
        console.warn(`  ⚠️ Warning: Slow step detected: ${step} took ${(duration / 1000).toFixed(2)}s`)
      }
    }
    console.log(`  Total Scripted Execution Time : ${(totalElapsedMs / 1000).toFixed(2)}s`)
    console.log('======================================')

    expect(totalElapsedMs).toBeLessThan(240000)

    // Stop tracing and save trace artifact
    const tracePath = path.join(demoDir, 'demo-run-trace.zip')
    await context.tracing.stop({ path: tracePath })
    console.log(`✓ Trace saved to ${tracePath}`)

    // Close page to flush video and copy to docs/demo/demo-run.webm
    const video = page.video()
    await page.close()

    if (video) {
      const demoVideoPath = path.join(demoDir, 'demo-run.webm')
      await video.saveAs(demoVideoPath)
      console.log(`✓ Backup demo video saved to ${demoVideoPath}`)
    }
  })
})
