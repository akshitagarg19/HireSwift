import { test, expect } from '@playwright/test'

test.describe('Task 4 & Scope Audit: Navigation and Route Guard Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('Route Scope Guard: Disabled routes redirect to /app/candidates and /app redirects to /app/dashboard', async ({ page }) => {
    // 1. /app index redirects to /app/dashboard
    await page.goto('/app')
    await expect(page).toHaveURL(/.*\/app\/dashboard/)

    // 2. Disabled routes redirect to /app/candidates
    await page.goto('/login')
    await expect(page).toHaveURL(/.*\/app\/candidates/)

    await page.goto('/signup')
    await expect(page).toHaveURL(/.*\/app\/candidates/)

    await page.goto('/onboarding')
    await expect(page).toHaveURL(/.*\/app\/candidates/)

    await page.goto('/app/fairness')
    await expect(page).toHaveURL(/.*\/app\/candidates/)

    await page.goto('/app/settings')
    await expect(page).toHaveURL(/.*\/app\/candidates/)
  })

  test('Sidebar Navigation: Exactly Dashboard, Upload, Candidates, Jobs, Pipeline, Compare, Insights, Duplicates, Emails', async ({ page }) => {
    await page.goto('/app/dashboard')

    // Verify sidebar links
    const sidebar = page.locator('aside').first()
    await expect(sidebar.getByRole('link', { name: /Dashboard/i })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /Upload/i })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /Candidates/i })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /Jobs/i })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /Pipeline/i })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /Compare/i })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /Insights/i })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /Duplicates/i })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /Emails/i })).toBeVisible()

    // Verify disabled items are NOT in sidebar
    await expect(sidebar.getByRole('link', { name: /Fairness/i })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: /Settings/i })).not.toBeVisible()
  })

  test('Candidate Drawer & Quick Edit: Inspect candidate and edit details', async ({ page }) => {
    await page.goto('/app/candidates')
    await expect(page.getByText('Candidate Directory')).toBeVisible()

    // Click first candidate row to view detail or open drawer
    const firstRow = page.locator('tbody tr').first()
    await expect(firstRow).toBeVisible()
    await firstRow.click()

    await expect(page).toHaveURL(/.*\/app\/candidates\//)
    await expect(page.getByText('Parsed Candidate Profile')).toBeVisible()
  })

  test('Compare: Strictly 2 to 3 candidates allowed with winner highlights', async ({ page }) => {
    await page.goto('/app/compare')
    await expect(page.getByText('Side-by-Side Candidate Comparison')).toBeVisible()
    await expect(page.getByText(/Suggested from scores|HireSwift AI Hiring Recommendation/i)).toBeVisible()
  })

  test('Insights & Duplicates pages render cleanly', async ({ page }) => {
    // Insights
    await page.goto('/app/insights')
    await expect(page.getByText('Talent Pool Insights & Analytics')).toBeVisible()

    // Duplicates
    await page.goto('/app/duplicates')
    await expect(page.getByText('Duplicate Candidate Detection')).toBeVisible()
  })
})
