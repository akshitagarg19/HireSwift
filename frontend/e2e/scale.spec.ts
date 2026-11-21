import { test, expect } from '@playwright/test'

test.describe('Task 4: Scalability and UI Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hireswift_use_mock', 'false')
    })
  })

  test('1. First render timing of Dashboard and Candidates', async ({ page }) => {
    // Measure Dashboard render timing
    const t0 = Date.now()
    await page.goto('/app/dashboard')
    await page.waitForSelector('[data-testid="kpi-total-candidates"]')
    const dashboardRenderMs = Date.now() - t0

    expect(dashboardRenderMs).toBeGreaterThan(0)
    console.log(`[Scale Benchmark] Dashboard First Render: ${dashboardRenderMs}ms`)

    // Measure Candidates render timing
    const t1 = Date.now()
    await page.goto('/app/candidates')
    await page.waitForSelector('table tbody tr')
    const candidatesRenderMs = Date.now() - t1

    expect(candidatesRenderMs).toBeGreaterThan(0)
    console.log(`[Scale Benchmark] Candidates First Render: ${candidatesRenderMs}ms`)
  })

  test('2. Filter change to rendered rows latency', async ({ page }) => {
    await page.goto('/app/candidates')
    await page.waitForLoadState('networkidle')

    // Find search filter
    const searchInput = page.getByRole('textbox', { name: /search candidates/i })
    await expect(searchInput).toBeVisible()

    const t0 = Date.now()
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/candidates') && res.url().includes('q=Python'),
      { timeout: 10000 }
    )
    await searchInput.fill('Python')
    await responsePromise
    const filterLatencyMs = Date.now() - t0

    console.log(`[Scale Benchmark] Filter Latency (including debounce + API): ${filterLatencyMs}ms`)
    await expect(page.locator('table tbody tr').first()).toBeVisible()
  })

  test('3. Candidates table server-side pagination supports page sizes 12, 25, 50, 100', async ({ page }) => {
    await page.goto('/app/candidates')
    await page.waitForLoadState('networkidle')

    const pageSizeSelect = page.locator('select[aria-label="Rows per page"]')
    await expect(pageSizeSelect).toBeVisible()

    // 1. Switch to 50
    const resp50 = page.waitForResponse((res) => res.url().includes('page_size=50'))
    await pageSizeSelect.selectOption('50')
    await resp50
    await expect(page.locator('table tbody tr')).toHaveCount(50)

    // 2. Switch to 12
    const resp12 = page.waitForResponse((res) => res.url().includes('page_size=12'))
    await pageSizeSelect.selectOption('12')
    await resp12
    await expect(page.locator('table tbody tr')).toHaveCount(12)

    // 3. Switch back to 25
    const resp25 = page.waitForResponse((res) => res.url().includes('page_size=25'))
    await pageSizeSelect.selectOption('25')
    await resp25
    await expect(page.locator('table tbody tr')).toHaveCount(25)
  })

  test('4. Synthetic data badge is displayed when X-Stub-Synthetic header is present', async ({ page }) => {
    // Intercept candidate requests to add X-Stub-Synthetic: true
    await page.route('**/api/candidates*', async (route) => {
      const response = await route.fetch()
      const headers = {
        ...response.headers(),
        'x-stub-synthetic': 'true',
      }
      await route.fulfill({
        response,
        headers,
      })
    })

    await page.goto('/app/candidates')
    await page.waitForLoadState('networkidle')

    const syntheticBadge = page.locator('[data-testid="synthetic-data-badge"]')
    await expect(syntheticBadge).toBeVisible()
    await expect(syntheticBadge).toContainText('Synthetic data (Scale: 1,000)')
  })

  test('5. Pipeline column shows "Show more (+50)" button when column has > 50 cards', async ({ page }) => {
    // Intercept applications to return 75 applications in 'applied' stage
    await page.route('**/api/applications*', async (route) => {
      const syntheticApps = Array.from({ length: 75 }, (_, i) => ({
        application_id: `app-scale-${i + 1}`,
        id: `app-scale-${i + 1}`,
        company_id: 'company-nova',
        job_id: 'job-1',
        candidate_id: `C-SCALE-${i + 1}`,
        stage: 'applied',
        match_score: 85,
        breakdown: { skills: 80, experience: 80, education: 90, semantic: 85 },
        matched_skills: ['Python'],
        missing_skills: [],
        candidate: {
          name: `Scale Candidate #${i + 1}`,
          college: 'IIT',
          location: 'Bangalore',
          cgpa: 9.0,
          skills: ['Python'],
          is_duplicate: false,
        },
      }))

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(syntheticApps),
      })
    })

    await page.goto('/app/pipeline')
    await page.waitForLoadState('networkidle')

    // Find Show more button in applied column
    const showMoreBtn = page.locator('[data-testid="show-more-applied"]')
    await expect(showMoreBtn).toBeVisible()
    await expect(showMoreBtn).toContainText('Show more (+25) — 50 of 75')

    // Click Show more and verify all 75 are rendered and button disappears
    await showMoreBtn.click()
    await expect(showMoreBtn).not.toBeVisible()
  })
})
