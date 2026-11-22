import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const screensDir = path.resolve(__dirname, '../../docs/screens')

test.describe('Application Screenshot Capture (1366x768)', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(screensDir)) {
      fs.mkdirSync(screensDir, { recursive: true })
    }
  })

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.addInitScript(() => {
      localStorage.setItem('hireswift_use_mock', 'false')
    })
  })

  test('01: Dashboard', async ({ page }) => {
    await page.goto('/app/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /Recruiter Dashboard/i })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="dashboard-ranking-table"]')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(screensDir, '01-dashboard.png'), fullPage: false })
  })

  test('02: Upload', async ({ page }) => {
    await page.goto('/app/upload')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Resume Ingestion & Parsing')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(screensDir, '02-upload.png'), fullPage: false })
  })

  test('03: Candidates', async ({ page }) => {
    await page.goto('/app/candidates')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Candidate Directory')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(screensDir, '03-candidates.png'), fullPage: false })
  })

  test('04: Job Ranking', async ({ page }) => {
    await page.goto('/app/jobs')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Job Openings')).toBeVisible({ timeout: 15000 })
    const viewJob = page.locator('a[href*="/app/jobs/"]').first()
    if (await viewJob.isVisible()) {
      await viewJob.click()
    } else {
      await page.goto('/app/jobs/job-1')
    }
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(screensDir, '04-job-ranking.png'), fullPage: false })
  })

  test('05: Pipeline', async ({ page }) => {
    await page.goto('/app/pipeline')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Applied' })).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(screensDir, '05-pipeline.png'), fullPage: false })
  })

  test('06: Compare', async ({ page }) => {
    await page.goto('/app/compare?ids=C001,C002,C003')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Candidate Comparison')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(screensDir, '06-compare.png'), fullPage: false })
  })

  test('07: Insights', async ({ page }) => {
    await page.goto('/app/insights')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Insights & Analytics')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(screensDir, '07-insights.png'), fullPage: false })
  })

  test('08: Duplicates', async ({ page }) => {
    await page.goto('/app/duplicates')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /Duplicate.*Detection/i })).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(screensDir, '08-duplicates.png'), fullPage: false })
  })

  test('09: Emails', async ({ page }) => {
    await page.goto('/app/emails')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/Bulk Email to Shortlisted Candidates/i)).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(screensDir, '09-emails.png'), fullPage: false })
  })
})
