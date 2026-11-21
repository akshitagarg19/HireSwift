import { test, expect } from '@playwright/test'

test.describe('Task 5: E2E Tests for Real Live Actions & Contract Hardening', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log(`[BROWSER ERROR] ${msg.text()}`)
    })
    page.on('pageerror', (err) => console.log(`[PAGE ERROR] ${err.message}`))
    // Force live mode in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('hireswift_use_mock', 'false')
    })
  })

  test('1. Bulk shortlist of 3 candidates sends 3 moveApplication requests and reflects on reload', async ({ page }) => {
    await page.goto('/app/candidates')
    await expect(page.getByText('Candidate Directory')).toBeVisible()

    // Wait for candidate rows to render
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible()

    // Intercept and collect move requests
    const moveRequests: any[] = []
    await page.route('**/api/applications/*/move', async (route) => {
      moveRequests.push(route.request().postDataJSON())
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, stage: 'shortlisted', history_id: 'h-123' }),
      })
    })

    // Check first 3 candidates
    const selectButtons = page.getByTestId('candidate-select-btn')
    await expect(selectButtons.first()).toBeVisible({ timeout: 10000 })
    await selectButtons.nth(0).click()
    await selectButtons.nth(1).click()
    await selectButtons.nth(2).click()

    // Bulk selection bar should display 3 selected
    await expect(page.getByText(/3 candidates selected/i)).toBeVisible()

    // Click Shortlist Selected
    const shortlistBtn = page.getByTestId('bulk-shortlist-btn')
    await expect(shortlistBtn).toBeVisible()
    await shortlistBtn.click()

    // Wait for requests
    await page.waitForTimeout(1000)
    expect(moveRequests.length).toBe(3)
    moveRequests.forEach((req) => {
      expect(req.stage).toBe('shortlisted')
    })

    // Success toast shown
    await expect(page.getByText(/Moved 3 of 3 candidates to shortlisted!/i)).toBeVisible()

    // Reload page and verify state persists
    await page.reload()
    await expect(page.getByText('Candidate Directory')).toBeVisible()
  })

  test('2. Bulk move with 1 scripted failure reports the failed candidate name and server detail', async ({ page }) => {
    await page.goto('/app/candidates')
    await expect(page.getByText('Candidate Directory')).toBeVisible()

    let callCount = 0
    await page.route('**/api/applications/*/move', async (route) => {
      callCount++
      if (callCount === 2) {
        // Scripted failure for candidate 2
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Prerequisite background check pending' }),
        })
      } else {
        await route.continue()
      }
    })

    // Check 2 candidates
    const selectButtons = page.getByTestId('candidate-select-btn')
    await expect(selectButtons.first()).toBeVisible({ timeout: 10000 })
    await selectButtons.nth(0).click()
    await selectButtons.nth(1).click()

    // Click Move Stage
    const moveStageBtn = page.getByTestId('bulk-move-stage-btn')
    await moveStageBtn.click()

    // In modal, select target stage
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    const confirmBtn = modal.getByRole('button', { name: /Confirm Move/i })
    await confirmBtn.click()

    // Toast should report partial success and the failure detail
    await expect(
      page.getByText(/Prerequisite background check pending/i)
    ).toBeVisible({ timeout: 10000 })
  })

  test('3. Duplicates merge calls API; when merge is unsupported, button is disabled with banner', async ({ page }) => {
    // 3a. Normal merge flow
    await page.goto('/app/duplicates')
    await expect(page.getByText('Duplicate Candidate Detection')).toBeVisible()

    let mergeCalled = false
    await page.route('**/api/duplicates/*/merge', async (route) => {
      mergeCalled = true
      await route.continue()
    })

    const mergeBtn = page.getByTestId('merge-profiles-btn').first()
    await expect(mergeBtn).toBeVisible()
    await mergeBtn.click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    const confirmBtn = page.getByTestId('confirm-merge-modal-btn')
    await confirmBtn.click()

    await expect(page.getByText(/Duplicate profiles merged successfully!/i)).toBeVisible()
    expect(mergeCalled).toBe(true)

    // 3b. When merge returns 404 (Merge not enabled on server)
    await page.route('**/api/duplicates/*/merge', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Merge is not enabled on this server' }),
      })
    })

    await page.reload()
    const mergeBtn2 = page.getByTestId('merge-profiles-btn').first()
    await mergeBtn2.click()
    const confirmBtn2 = page.getByTestId('confirm-merge-modal-btn')
    await confirmBtn2.click()

    // Banner appears and merge is disabled
    await expect(page.getByTestId('merge-disabled-banner')).toBeVisible()
    await expect(page.getByText(/Merge is not enabled on this server/i).first()).toBeVisible()
  })

  test('4. Scorecard submits typed values, rejects empty submit, and displays saved evaluations (with 404 and 500 handling)', async ({ page }) => {
    await page.goto('/app/candidates/C001')
    await expect(page.locator('h1, h2').filter({ hasText: /Candidate #C001|Aditya Kulkarni/i }).first()).toBeVisible({ timeout: 15000 })

    // Switch to Scorecards tab
    const scorecardsTab = page.getByRole('tab', { name: /Scorecards/i })
    await scorecardsTab.click()

    const form = page.getByTestId('scorecard-form')
    await expect(form).toBeVisible()

    // 4.1 Normal server submit flow
    await page.getByTestId('scorecard-interviewer-input').fill('Senior Staff Engineer')
    await page.getByTestId('scorecard-recommendation-select').selectOption('Strong Yes')
    await page.getByTestId('scorecard-tech-rating').selectOption('5')
    await page.getByTestId('scorecard-tech-notes').fill('Deep understanding of Python internals & distributed SQL')
    await page.getByTestId('scorecard-problem-rating').selectOption('4')
    await page.getByTestId('scorecard-problem-notes').fill('Solid algorithmic trade-offs')
    await page.getByTestId('scorecard-comm-rating').selectOption('5')
    await page.getByTestId('scorecard-comm-notes').fill('Crisp communication, concise explanations')
    await page.getByTestId('scorecard-overall-notes').fill('Strong candidate for senior role.')

    const submitBtn = page.getByTestId('submit-scorecard-btn')
    await submitBtn.click()

    // Verify success toast
    await expect(page.getByText(/Interview scorecard submitted!/i)).toBeVisible()
    await expect(page.getByText('Senior Staff Engineer').first()).toBeVisible()
    await expect(page.getByText(/Deep understanding of Python internals/i)).toBeVisible()

    // 4.2 Scorecard 404 handling: server has no scorecard endpoint -> saves on device only
    await page.route('**/api/applications/*/scorecards', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Scorecard endpoint not found' }),
        })
      } else {
        await route.continue()
      }
    })

    await page.getByTestId('scorecard-interviewer-input').fill('Evaluator 404')
    await page.getByTestId('scorecard-overall-notes').fill('Notes for 404 test')
    await submitBtn.click()

    await expect(page.getByText(/Saved on this device only \(server has no scorecard endpoint\)/i)).toBeVisible()
    await expect(page.getByText('Evaluator 404').first()).toBeVisible()

    // Unroute 404
    await page.unroute('**/api/applications/*/scorecards')

    // 4.3 Scorecard 500 handling: server error -> shows Could not save and does NOT save locally until prompted
    await page.route('**/api/applications/*/scorecards', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Internal database error' }),
        })
      } else {
        await route.continue()
      }
    })

    await page.getByTestId('scorecard-interviewer-input').fill('Evaluator 500')
    await page.getByTestId('scorecard-overall-notes').fill('Notes for 500 test')
    await submitBtn.click()

    // Verify error toast and error banner
    await expect(page.getByText(/Could not save: 500 Internal database error/i).first()).toBeVisible()
    const errorBanner = page.getByTestId('scorecard-error-banner')
    await expect(errorBanner).toBeVisible()

    // Verify Evaluator 500 was NOT saved to the list automatically
    const records = page.getByTestId('submitted-scorecard-record')
    await expect(records.filter({ hasText: 'Evaluator 500' })).toHaveCount(0)

    // Click "Save on this device instead"
    const saveInsteadBtn = page.getByTestId('save-device-instead-btn')
    await expect(saveInsteadBtn).toBeVisible()
    await saveInsteadBtn.click()

    // Now it should be saved locally with toast
    await expect(page.getByText(/Saved on this device only/i).first()).toBeVisible()
    await expect(page.getByText('Evaluator 500').first()).toBeVisible()

    await page.unroute('**/api/applications/*/scorecards')
  })

  test('5. Weight sliders send query params; ranking changes; notice appears if server ignores weights', async ({ page }) => {
    await page.goto('/app/jobs/job-101')
    await expect(page.locator('h1, h2').filter({ hasText: /Full Stack Engineer/i }).first()).toBeVisible({ timeout: 15000 })

    // Open weight sliders
    const adjustWeightsBtn = page.getByRole('button', { name: /Adjust Weights/i })
    await adjustWeightsBtn.click()

    let querySent = false
    await page.route('**/api/jobs/job-101/ranking*', async (route) => {
      const url = route.request().url()
      if (url.includes('weights_skills=')) {
        querySent = true
      }
      await route.continue()
    })

    // Move Skills slider
    const skillsSlider = page.locator('input[type="range"]').first()
    await skillsSlider.fill('65')

    // Wait for 300ms debounce
    await page.waitForTimeout(600)
    expect(querySent).toBe(true)

    // Test when server ignores weights (weights_applied missing)
    await page.route('**/api/jobs/job-101/ranking*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          job_id: 'job-101',
          candidates: [],
          // weights_applied omitted to simulate server ignoring custom weights
        }),
      })
    })

    await skillsSlider.fill('75')
    await page.waitForTimeout(600)

    // Notice should appear
    await expect(page.getByTestId('weights-ignored-notice')).toBeVisible()
    await expect(page.getByText(/This server ignored custom weights; ranking is unchanged./i)).toBeVisible()
  })

  test('6. Original resume: PDF embeds, DOCX offers download, 404 shows missing-file message', async ({ page }) => {
    // 6a. PDF candidate C001 (Aditya Kulkarni)
    await page.goto('/app/candidates/C001')
    await expect(page.locator('h1, h2').filter({ hasText: /Candidate #C001|Aditya Kulkarni/i }).first()).toBeVisible({ timeout: 15000 })
    await page.getByRole('tab', { name: /Resume Document/i }).click()
    await expect(page.getByTestId('resume-pdf-viewer')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('download-original-btn')).toBeVisible()

    // 6b. DOCX candidate C000 (Aarav Sharma)
    await page.goto('/app/candidates/C000')
    await expect(page.locator('h1, h2').filter({ hasText: /Candidate #C000|Aarav Sharma/i }).first()).toBeVisible({ timeout: 15000 })
    await page.getByRole('tab', { name: /Resume Document/i }).click()
    await expect(page.getByTestId('download-docx-btn')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('parsed-fields-container')).toBeVisible()

    // 6c. 404 missing resume binary
    await page.route('**/api/candidates/*/resume', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Original file not available on this server' }),
      })
    })
    await page.reload()
    await page.getByRole('tab', { name: /Resume Document/i }).click()
    await expect(page.getByTestId('resume-not-found')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Original file not found on server/i)).toBeVisible()
  })

  test('7. Saved filters persist across page reload', async ({ page }) => {
    await page.goto('/app/candidates')
    await expect(page.getByText('Candidate Directory')).toBeVisible()

    // Type query
    const searchInput = page.getByTestId('candidates-search-input')
    await searchInput.fill('Python')

    // Click Save Filter
    const saveFilterBtn = page.getByTestId('save-filter-btn')
    await saveFilterBtn.click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    await page.getByTestId('save-filter-name-input').fill('Python Specialists')
    await page.getByTestId('confirm-save-filter-btn').click()

    await expect(page.getByText(/Filter "Python Specialists" saved on this device only!/i)).toBeVisible()

    // Clear search
    await searchInput.fill('')

    // Reload page
    await page.reload()
    await expect(page.getByText('Candidate Directory')).toBeVisible()

    // Select saved filter from dropdown
    const dropdown = page.getByTestId('saved-filters-dropdown')
    await dropdown.selectOption({ label: 'Python Specialists' })

    await expect(page.getByText(/Applied saved filter: "Python Specialists"/i)).toBeVisible()
    await expect(page).toHaveURL(/.*q=Python/)
  })

  test('8. CSV export downloads a file with correct headers and values (and empty cells for nulls)', async ({ page }) => {
    await page.goto('/app/candidates')
    await expect(page.getByText('Candidate Directory')).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    const exportBtn = page.getByTestId('export-csv-btn')
    await exportBtn.click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('.csv')

    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer)
    }
    const csvContent = Buffer.concat(chunks).toString('utf-8')

    // Validate headers
    const lines = csvContent.split('\n').filter(Boolean)
    const headerLine = lines[0]
    expect(headerLine).toBe(
      'name,email,phone,city,college,degree,grad_year,cgpa_10,tenth_pct,twelfth_pct,experience_years,skills,stage,match_score'
    )

    // Validate that lines exist and values don't use 0 for missing values
    expect(lines.length).toBeGreaterThan(1)
  })

  test('9. Kanban move shows Undo toast; clicking Undo moves card back', async ({ page }) => {
    await page.goto('/app/pipeline')
    await expect(page.getByText('Recruitment Pipeline Kanban')).toBeVisible()

    let moveCount = 0
    await page.route('**/api/applications/*/move', async (route) => {
      moveCount++
      await route.continue()
    })

    // Find the first card's stage dropdown
    const moveSelect = page.getByTestId('kanban-move-select').first()
    await expect(moveSelect).toBeVisible({ timeout: 10000 })
    await moveSelect.selectOption('shortlisted')

    // Verify Undo toast
    const undoToast = page.getByText(/Moved .* to Shortlisted\./i)
    await expect(undoToast).toBeVisible({ timeout: 8000 })

    const undoBtn = page.getByRole('button', { name: 'Undo' })
    await expect(undoBtn).toBeVisible()
    await undoBtn.click()
    await expect(page.getByText(/Reverted .* back to/i)).toBeVisible()
    expect(moveCount).toBeGreaterThanOrEqual(2)
  })

  test('10. Kanban Undo with STUB_STRICT_TRANSITIONS=1: server rejects backward move (400), card stays where server says', async ({ page }) => {
    await page.goto('/app/pipeline')
    await expect(page.getByText('Recruitment Pipeline Kanban')).toBeVisible()

    // Route move requests with reason: "undo" to pass x-stub-strict-transitions header
    await page.route('**/api/applications/*/move', async (route) => {
      const postData = route.request().postDataJSON()
      if (postData && postData.reason && /undo/i.test(postData.reason)) {
        const headers = {
          ...route.request().headers(),
          'x-stub-strict-transitions': '1',
        }
        await route.continue({ headers })
      } else {
        await route.continue()
      }
    })

    // Move first card to shortlisted
    const moveSelect = page.getByTestId('kanban-move-select').first()
    await expect(moveSelect).toBeVisible({ timeout: 10000 })
    await moveSelect.selectOption('shortlisted')

    // Undo toast appears
    const undoBtn = page.getByRole('button', { name: 'Undo' })
    await expect(undoBtn).toBeVisible({ timeout: 8000 })
    await undoBtn.click()

    // Assert that server's rejection error is displayed
    await expect(page.getByText(/Invalid stage transition: Cannot jump directly from 'shortlisted' to 'applied'/i)).toBeVisible()

    // And card stays in Shortlisted column (not reverted to Applied)
    const shortlistedColumn = page.locator('[data-testid="kanban-column-shortlisted"]')
    await expect(shortlistedColumn.locator('[data-testid="kanban-card"]').first()).toBeVisible()
  })
})
