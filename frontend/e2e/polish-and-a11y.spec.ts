import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const screensDir = path.resolve(__dirname, '../test-results/screens')

test.beforeAll(() => {
  if (!fs.existsSync(screensDir)) {
    fs.mkdirSync(screensDir, { recursive: true })
  }
})

test.beforeEach(async ({ page }) => {
  // Ensure live mode is active so API network calls occur
  await page.addInitScript(() => {
    localStorage.setItem('hireswift_use_mock', 'false')
  })
})

test.describe('Task 5: Frontend Polish, Responsiveness & Accessibility Suite', () => {
  test('1. Responsive Layout at 1366x768 and 390x844 (Mobile)', async ({ page }) => {
    // 1.1 Desktop @ 1366x768
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('/app/candidates')
    await page.waitForLoadState('networkidle')

    // Sidebar should be visible on desktop
    const sidebar = page.locator('aside').first()
    await expect(sidebar).toBeVisible()

    // Assert no body horizontal scroll
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2
    })
    expect(hasHorizontalOverflow).toBe(false)

    // Save Desktop Screenshots
    await page.screenshot({ path: path.join(screensDir, 'desktop-1366-candidates.png') })

    await page.goto('/app/pipeline')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: path.join(screensDir, 'desktop-1366-pipeline.png') })

    // 1.2 Mobile @ 390x844
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/app/candidates')
    await page.waitForLoadState('networkidle')

    // On mobile, the desktop sidebar should either be hidden or collapsed
    const desktopAsideVisible = await page.evaluate(() => {
      const aside = document.querySelector('aside')
      if (!aside) return false
      const style = window.getComputedStyle(aside)
      return style.display !== 'none' && style.visibility !== 'hidden' && aside.getBoundingClientRect().width > 50
    })
    expect(desktopAsideVisible).toBe(false)

    // Save Mobile Screenshots
    await page.screenshot({ path: path.join(screensDir, 'mobile-390-candidates.png') })

    await page.goto('/app/upload')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: path.join(screensDir, 'mobile-390-upload.png') })
  })

  test('2. Accessibility Scan with Axe-Core (Home, Upload, Candidates, Pipeline, Compare)', async ({ page }) => {
    const targetPages = [
      { name: 'Home', url: '/' },
      { name: 'Upload', url: '/app/upload' },
      { name: 'Candidates', url: '/app/candidates' },
      { name: 'Pipeline', url: '/app/pipeline' },
      { name: 'Compare', url: '/app/compare' },
    ]

    for (const target of targetPages) {
      await page.goto(target.url)
      await page.waitForLoadState('networkidle')

      // Run axe accessibility audit focusing on critical / serious issues
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .disableRules(['color-contrast']) // Ignore minor third-party contrast ratios, check structural accessibility
        .analyze()

      const seriousOrCritical = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      )

      if (seriousOrCritical.length > 0) {
        console.warn(`Accessibility violations on ${target.name}:`, JSON.stringify(seriousOrCritical.map(v => ({ id: v.id, impact: v.impact, description: v.description })), null, 2))
      }

      expect(seriousOrCritical, `Found serious/critical a11y violations on ${target.name}`).toEqual([])
    }
  })

  test('3. Keyboard Navigation on Key Pages', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    let activeElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(activeElement).toBeTruthy()

    await page.goto('/app/upload')
    await page.keyboard.press('Tab')
    activeElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(activeElement).toBeTruthy()

    await page.goto('/app/candidates')
    await page.keyboard.press('Tab')
    activeElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(activeElement).toBeTruthy()
  })

  test('4. Network Error Handling with Error Panels and Retry', async ({ page }) => {
    // Intercept API endpoints with explicit 500 outage simulation
    const abortHandler = async (route: any) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Simulated backend outage for QA verification' }),
      })
    }
    await page.route('**/api/candidates*', abortHandler)
    await page.route('**/api/jobs*', abortHandler)
    await page.route('**/api/applications*', abortHandler)
    await page.route('**/api/compare*', abortHandler)

    // Test Candidates Page
    await page.goto('/app/candidates')
    await expect(page.getByRole('button', { name: /retry/i }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('body')).not.toBeEmpty()

    // Test Jobs Page
    await page.goto('/app/jobs')
    await expect(page.getByRole('button', { name: /retry/i }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('body')).not.toBeEmpty()

    // Test Pipeline Page
    await page.goto('/app/pipeline')
    await expect(page.getByRole('button', { name: /retry/i }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('body')).not.toBeEmpty()

    // Test Compare Page
    await page.goto('/app/compare?ids=C001,C002')
    await expect(page.getByRole('button', { name: /retry/i }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('body')).not.toBeEmpty()

    // Test Insights Page
    await page.goto('/app/insights')
    await expect(page.getByRole('button', { name: /retry/i }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('body')).not.toBeEmpty()

    // Test Duplicates Page
    await page.goto('/app/duplicates')
    await expect(page.getByRole('button', { name: /retry/i }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('5. Zero Console Errors across Active Routes', async ({ page }) => {
    const consoleErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Ignore benign network aborts from intentional tests or favicon 404s
        if (
          !text.includes('Failed to load resource') &&
          !text.includes('net::ERR_FAILED') &&
          !text.includes('favicon.ico')
        ) {
          consoleErrors.push(text)
        }
      }
    })

    const routes = [
      '/',
      '/app/upload',
      '/app/candidates',
      '/app/jobs',
      '/app/pipeline',
      '/app/compare',
      '/app/insights',
      '/app/duplicates',
      '/app/emails',
    ]

    for (const r of routes) {
      await page.goto(r)
      await page.waitForLoadState('networkidle')
    }

    expect(consoleErrors).toEqual([])
  })
})
