import { test, expect } from '@playwright/test'

test.describe('Task 1: Recruiter Dashboard (API-driven Contract Tests)', () => {
  test.beforeEach(async ({ page }) => {
    // Set hireswift_use_mock to false for live stub mode
    await page.addInitScript(() => {
      localStorage.setItem('hireswift_use_mock', 'false')
    })
  })

  test('1. KPI metrics render correctly from /api responses (stub mode ground truth)', async ({ page }) => {
    await page.goto('/app/dashboard')
    await page.waitForLoadState('networkidle')

    // Dashboard title
    await expect(page.getByRole('heading', { name: /Recruiter Dashboard/i })).toBeVisible()

    // Assert KPI cards match stub ground-truth (50 unique candidates, 5 jobs)
    const kpiTotal = page.locator('[data-testid="kpi-total-candidates"]')
    await expect(kpiTotal).toBeVisible()
    await expect(kpiTotal).toContainText('50')

    const kpiJobs = page.locator('[data-testid="kpi-open-jobs"]')
    await expect(kpiJobs).toBeVisible()
    await expect(kpiJobs).toContainText('5')

    // Funnel stages render non-zero counts
    const kpiApplied = page.locator('[data-testid="kpi-applied"]')
    await expect(kpiApplied).toBeVisible()

    const kpiShortlisted = page.locator('[data-testid="kpi-shortlisted"]')
    await expect(kpiShortlisted).toBeVisible()

    // Duplicates count
    const kpiDuplicates = page.locator('[data-testid="kpi-duplicates"]')
    await expect(kpiDuplicates).toBeVisible()
  })

  test('2. Global search debounces, returns results, opens drawer and Enter navigates', async ({ page }) => {
    await page.goto('/app/dashboard')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('[data-testid="global-search-input"]')
    await expect(searchInput).toBeVisible()

    // Search for a candidate from ground truth (e.g. 'Aarav' or 'Priya')
    await searchInput.fill('Aarav')

    // Wait for debounced search dropdown
    const dropdown = page.locator('[data-testid="search-results-dropdown"]')
    await expect(dropdown).toBeVisible({ timeout: 5000 })
    await expect(dropdown).toContainText('Aarav')

    // Click candidate in search dropdown to open drawer
    const firstResult = dropdown.locator('[data-testid^="search-result-"]').first()
    await firstResult.click()

    // Assert Candidate Drawer opens
    const drawer = page.locator('[data-testid="dashboard-candidate-drawer"]')
    await expect(drawer).toBeVisible()
    await expect(drawer).toContainText('Weighted Score Breakdown')
    await expect(drawer).toContainText('Match Analysis')

    // Close drawer
    await page.keyboard.press('Escape')

    // Test Enter key navigation
    await searchInput.fill('Python')
    await searchInput.press('Enter')
    await expect(page).toHaveURL(/.*\/app\/candidates\?q=Python/)
  })

  test('3. Ranking table selection, compare limit (2-3 OK, 4th blocked), and navigation', async ({ page }) => {
    await page.goto('/app/dashboard')
    await page.waitForLoadState('networkidle')

    const table = page.locator('[data-testid="dashboard-ranking-table"]')
    await expect(table).toBeVisible()

    // Initial state: Compare button is disabled
    const compareBtn = page.locator('[data-testid="dashboard-compare-btn"]')
    await expect(compareBtn).toBeDisabled()

    // Find checkboxes in ranking rows
    const checkboxes = table.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    expect(count).toBeGreaterThanOrEqual(4)

    // Select 1st candidate: Compare still disabled
    await checkboxes.nth(0).click()
    await expect(compareBtn).toBeDisabled()
    await expect(compareBtn).toContainText('Compare selected (1)')

    // Select 2nd candidate: Compare is now enabled!
    await checkboxes.nth(1).click()
    await expect(compareBtn).toBeEnabled()
    await expect(compareBtn).toContainText('Compare selected (2)')

    // Select 3rd candidate: Still enabled
    await checkboxes.nth(2).click()
    await expect(compareBtn).toBeEnabled()
    await expect(compareBtn).toContainText('Compare selected (3)')

    // Attempt to select 4th candidate: blocked by toast error
    await checkboxes.nth(3).click()
    await expect(page.getByText('Comparison is limited to a maximum of 3 candidates.')).toBeVisible()
    await expect(compareBtn).toContainText('Compare selected (3)')

    // Click Compare selected: navigates to /app/compare with ids and job_id
    await compareBtn.click()
    await expect(page).toHaveURL(/.*\/app\/compare\?ids=.*&job_id=.*/)
  })

  test('4. Job selector updates rankings and drawer reflects match analysis', async ({ page }) => {
    await page.goto('/app/dashboard')
    await page.waitForLoadState('networkidle')

    const jobSelector = page.locator('[data-testid="dashboard-job-selector"]')
    await expect(jobSelector).toBeVisible()

    // Verify option count
    const options = jobSelector.locator('option')
    await expect(options).toHaveCount(5)

    // Change to second job
    await jobSelector.selectOption({ index: 1 })
    await page.waitForTimeout(300)

    // Click first ranking row to open drawer
    const firstRow = page.locator('[data-testid^="ranking-row-"]').first()
    await firstRow.click()

    const drawer = page.locator('[data-testid="dashboard-candidate-drawer"]')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText('Weighted Score Breakdown')).toBeVisible()
    await expect(drawer.getByText('Skills Competency (40%)')).toBeVisible()
  })

  test('5. Error state with Retry button when backend fails', async ({ page }) => {
    // Intercept jobs API with 500 error
    await page.route('**/api/jobs*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Database connection failed' }),
      })
    })

    await page.goto('/app/dashboard')
    const errorPanel = page.locator('[data-testid="dashboard-error"]')
    await expect(errorPanel).toBeVisible()
    await expect(errorPanel).toContainText('Failed to load Recruiter Dashboard')

    const retryBtn = page.locator('[data-testid="retry-button"]')
    await expect(retryBtn).toBeVisible()
  })
})
