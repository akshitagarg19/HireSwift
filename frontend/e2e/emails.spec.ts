import { test, expect } from '@playwright/test'

test.describe('Task 2: Bulk Email to Shortlisted Candidates (Contract & Fallback Tests)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hireswift_use_mock', 'false')
    })
  })

  test('1. Demo banner is visible and shortlisted recipients populate', async ({ page }) => {
    await page.goto('/app/emails')
    await page.waitForLoadState('networkidle')

    // Verify demo banner is visible
    const banner = page.locator('[data-testid="email-demo-banner"]')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('emails are simulated, nothing is sent')

    // Job filter exists
    const jobFilter = page.locator('[data-testid="email-job-filter"]')
    await expect(jobFilter).toBeVisible()

    // Send button exists
    const sendBtn = page.locator('[data-testid="send-emails-btn"]')
    await expect(sendBtn).toBeVisible()
  })

  test('2. Send flow in stub mode shows result table including sent and failed rows', async ({ page }) => {
    await page.goto('/app/emails')
    await page.waitForLoadState('networkidle')

    const sendBtn = page.locator('[data-testid="send-emails-btn"]')
    await expect(sendBtn).toBeVisible()

    // Click Send -> Confirm dialog opens
    await sendBtn.click()

    // Confirm in dialog
    const confirmBtn = page.getByRole('button', { name: /Send .* Emails/i })
    await expect(confirmBtn).toBeVisible()
    await confirmBtn.click()

    // Results table appears
    const resultsPanel = page.locator('[data-testid="send-results-panel"]')
    await expect(resultsPanel).toBeVisible({ timeout: 10000 })
    await expect(resultsPanel).toContainText('Batch Delivery Results')

    // Table contains both Sent and Failed status badges
    const statusBadges = resultsPanel.locator('tbody tr')
    await expect(statusBadges.first()).toBeVisible()
    await expect(resultsPanel).toContainText('Sent')
    await expect(resultsPanel).toContainText('Failed')
  })

  test('3. Fallback mode (endpoint 404/501): displays fallback banner and 3 fallback actions without claiming sent', async ({ page }) => {
    // Intercept /api/email/send with 501 / 404
    await page.route('**/api/email/send*', (route) => {
      route.fulfill({
        status: 501,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Email sending is not enabled on this server.' }),
      })
    })

    await page.goto('/app/emails')
    await page.waitForLoadState('networkidle')

    const sendBtn = page.locator('[data-testid="send-emails-btn"]')
    await sendBtn.click()

    const confirmBtn = page.getByRole('button', { name: /Send .* Emails/i })
    await confirmBtn.click()

    // Fallback banner appears
    const fallbackBanner = page.locator('[data-testid="email-fallback-banner"]')
    await expect(fallbackBanner).toBeVisible({ timeout: 5000 })
    await expect(fallbackBanner).toContainText('Email sending is not enabled on this server.')

    // 3 Fallback actions are visible
    await expect(page.locator('[data-testid="fallback-copy-btn"]')).toBeVisible()
    await expect(page.locator('[data-testid="fallback-mailto-btn"]')).toBeVisible()
    await expect(page.locator('[data-testid="fallback-csv-btn"]')).toBeVisible()

    // Crucially: never claim sent
    const resultsPanel = page.locator('[data-testid="send-results-panel"]')
    await expect(resultsPanel).not.toBeVisible()
  })
})
