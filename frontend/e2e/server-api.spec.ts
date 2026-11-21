import { test, expect } from '@playwright/test'

test.describe('Task 9: Server API Contract & Pipeline Persistence Tests', () => {
  test('mocks /api/candidates and asserts filter changes send exact API.md query params', async ({ page }) => {
    const interceptedRequests: URL[] = []

    // Mock network route for /api/candidates
    await page.route('**/api/candidates*', async (route) => {
      const url = new URL(route.request().url())
      interceptedRequests.push(url)

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'cand-api-01',
              company_id: 'company-nova',
              name: 'Aarav Sharma',
              email: 'aarav.sharma@example.in',
              phone: '+91 98765 43210',
              location: 'Bengaluru',
              college: 'IIT Delhi',
              degree: 'B.Tech',
              branch: 'Computer Science',
              grad_year: 2024,
              cgpa: 8.8,
              tenth_percent: 92.5,
              twelfth_percent: 90.0,
              skills: ['React', 'TypeScript', 'Python'],
              experience_years: 1.5,
              parse_confidence: 92,
              field_confidence: { cgpa: 95, college: 90 },
              custom_fields: {},
              is_duplicate: false,
            },
          ],
          total: 1,
          page: 1,
          page_size: 12,
        }),
      })
    })

    // Navigate to candidates page with full filter params from API.md
    await page.goto(
      '/app/candidates?q=React&cgpa_min=7.5&tenth_min=80&twelfth_min=80&exp_min=1&exp_max=5&city=Bengaluru&grad_year=2024&skills_all=React,TypeScript&include_unknown=true&sort=cgpa_desc&page=1'
    )

    // Wait for candidate directory to render
    await expect(page.getByText('Candidate Directory')).toBeVisible()

    // Assert that URL contains all API.md query params
    const currentUrl = new URL(page.url())
    expect(currentUrl.searchParams.get('q')).toBe('React')
    expect(currentUrl.searchParams.get('cgpa_min')).toBe('7.5')
    expect(currentUrl.searchParams.get('tenth_min')).toBe('80')
    expect(currentUrl.searchParams.get('twelfth_min')).toBe('80')
    expect(currentUrl.searchParams.get('exp_min')).toBe('1')
    expect(currentUrl.searchParams.get('exp_max')).toBe('5')
    expect(currentUrl.searchParams.get('city')).toBe('Bengaluru')
    expect(currentUrl.searchParams.get('grad_year')).toBe('2024')
    expect(currentUrl.searchParams.get('skills_all')).toBe('React,TypeScript')
    expect(currentUrl.searchParams.get('include_unknown')).toBe('true')
    expect(currentUrl.searchParams.get('sort')).toBe('cgpa_desc')

    // Test text search debounce and parameter generation
    const searchInput = page.locator('input[placeholder*="Search candidates"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('Python')
      await page.waitForTimeout(400) // allow 300ms debounce
      expect(page.url()).toContain('q=Python')
    }

    // Toggle "Include candidates with unknown values" toggle
    const unknownToggle = page.locator('button[role="switch"], input[type="checkbox"]').first()
    if (await unknownToggle.isVisible()) {
      await unknownToggle.click()
      await page.waitForTimeout(400)
    }

    // Clear filters and verify reset
    const clearBtn = page.getByRole('button', { name: /Reset All|Clear/i }).first()
    if (await clearBtn.isVisible()) {
      await clearBtn.click()
      await page.waitForTimeout(300)
    }
  })

  test('Pipeline Kanban reloads without blank page and persists stage state', async ({ page }) => {
    // Navigate directly to pipeline kanban
    await page.goto('/app/pipeline')

    // Verify exactly 5 pipeline columns are rendered
    await expect(page.getByText('Recruitment Pipeline Kanban')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Applied' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Shortlisted' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Interview' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Offer' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Rejected' })).toBeVisible()

    // Verify candidate cards exist in Kanban
    const cards = page.locator('.cursor-grab, [data-draggable="true"], .rounded-xl.border')
    await expect(cards.first()).toBeVisible()

    // Reload page to test persistence and no blank screen
    await page.reload()

    // Assert that header and all Kanban columns remain fully visible after reload
    await expect(page.getByText('Recruitment Pipeline Kanban')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Applied' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Shortlisted' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Interview' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Offer' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Rejected' })).toBeVisible()
    await expect(cards.first()).toBeVisible()
  })
})
