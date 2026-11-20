import { test, expect } from '@playwright/test'

test.describe('HireSwift Landing Page & Public Navigation', () => {
  test('Load home page, test navigation, and try live demo', async ({ page }) => {
    // 1. Load home page
    await page.goto('/')
    await expect(page).toHaveTitle(/HireSwift - Intelligent Multi-Tenant ATS/)
    await expect(page.getByRole('heading', { name: /Shortlist in minutes/i })).toBeVisible()

    // 2. Click nav link to smooth-scroll to pricing
    const pricingNavBtn = page.getByRole('button', { name: 'Pricing' }).first()
    await pricingNavBtn.click()
    await expect(page.locator('#pricing')).toBeVisible()
    await expect(page.getByText('Simple, Transparent Pricing')).toBeVisible()

    // 3. Click "Try live demo" and verify it logs in and navigates to app workspace
    const liveDemoBtn = page.getByRole('button', { name: /Try live demo/i }).first()
    await liveDemoBtn.click()
    await expect(page).toHaveURL(/.*\/app\/(upload|dashboard|candidates)/)

    // 4. Return to home page while logged in, verify workspace CTA button is shown
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Go to Dashboard|Launch App/i }).first()).toBeVisible()
  })

  test('Polished 404 page for unknown routes', async ({ page }) => {
    await page.goto('/unknown-page-route-does-not-exist')
    await expect(page.getByText('404')).toBeVisible()
    await expect(page.getByText('Page Not Found')).toBeVisible()

    // Click "Back to Home"
    await page.click('button:has-text("Back to Home")')
    await expect(page).toHaveURL(/http:\/\/localhost:5173\/?$/)
  })
})
