import { test, expect } from '@playwright/test'

test.describe('Task 7: Live Mode & Stub Server Contract Tests', () => {
  // Helper to ensure live mode is forced in localStorage before module init
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hireswift_use_mock', 'false')
    })
  })

  test('1. Upload flow shows no fake candidates, displays API failed files, and provides View Candidates navigation', async ({ page }) => {
    await page.goto('/app/upload')

    // In live mode, simulate/fake buttons must be hidden
    await expect(page.getByText('Simulate 5 Resumes')).not.toBeVisible()
    await expect(page.getByText('⚡ Load 50 Test Candidates')).not.toBeVisible()

    // File input accepts valid resumes
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'aditi_sharma_resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test resume content'),
    })

    // Queued files table should display the added file
    await expect(page.getByText('aditi_sharma_resume.pdf')).toBeVisible()

    // Click Parse button to trigger API batch flow
    const parseBtn = page.getByRole('button', { name: /Parse All Queued/i })
    await expect(parseBtn).toBeVisible()
    await parseBtn.click()

    // Stub server returns batch completed with 1 failed file per contract
    await expect(page.getByText('Resume Ingestion Complete')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('damaged_scan_corrupted.pdf')).toBeVisible()
    await expect(page.getByText(/Corrupted PDF header/i)).toBeVisible()

    // "View candidates" CTA button is rendered and navigates to /app/candidates
    const viewCandidatesBtn = page.getByRole('button', { name: /View candidates/i }).first()
    await expect(viewCandidatesBtn).toBeVisible()
    await viewCandidatesBtn.click()

    await expect(page).toHaveURL(/.*\/app\/candidates/)
    await expect(page.getByText('Candidate Directory')).toBeVisible()

    // Verify candidate list loaded from stub server API is displayed
    await expect(page.getByText('Aditi Sharma').first()).toBeVisible()
  })

  test('2. Pipeline cards come directly from /api/applications', async ({ page }) => {
    await page.goto('/app/pipeline')

    await expect(page.getByText('Recruitment Pipeline Kanban')).toBeVisible()

    // Ensure the 5 canonical columns exist
    const appliedCol = page.locator('div').filter({ hasText: /^Applied/ }).first()
    const shortlistedCol = page.locator('div').filter({ hasText: /^Shortlisted/ }).first()
    const interviewCol = page.locator('div').filter({ hasText: /^Interview/ }).first()
    const offerCol = page.locator('div').filter({ hasText: /^Offer/ }).first()
    const rejectedCol = page.locator('div').filter({ hasText: /^Rejected/ }).first()

    await expect(appliedCol).toBeVisible()
    await expect(shortlistedCol).toBeVisible()
    await expect(interviewCol).toBeVisible()
    await expect(offerCol).toBeVisible()
    await expect(rejectedCol).toBeVisible()

    // Verify candidates from stub server /api/applications exist in their mapped stages
    // app-01_aditi_sharma is in Applied
    await expect(page.getByText('Aditi Sharma').first()).toBeVisible()
    // app-18_karthik_sundaram is in Shortlisted
    await expect(page.getByText('Karthik Sundaram').first()).toBeVisible()
    // app-02_priya_patel is in Interview
    await expect(page.getByText('Priya Patel').first()).toBeVisible()
    // app-03_vikram_singh is in Offer
    await expect(page.getByText('Vikram Singh').first()).toBeVisible()
    // app-13_deepak_joshi is in Rejected
    await expect(page.getByText('Deepak Joshi').first()).toBeVisible()
  })

  test('3. An invalid move snaps back with the server message', async ({ page }) => {
    await page.goto('/app/pipeline')
    await expect(page.getByText('Recruitment Pipeline Kanban')).toBeVisible()

    // Find the Kanban card for Aditi Sharma in the Applied column
    const aditiCard = page.locator('div.cursor-grab').filter({ hasText: 'Aditi Sharma' }).first()
    await expect(aditiCard).toBeVisible()

    // Select the "Move to:" dropdown inside Aditi Sharma's card
    const moveToSelect = aditiCard.locator('select')
    await expect(moveToSelect).toBeVisible()

    // Attempt invalid transition: Applied -> Offer directly (returns 400 Bad Request on stub server)
    await moveToSelect.selectOption('offer')

    // Toast error with server detail message must appear
    const toastError = page.locator('[data-sonner-toast]', {
      hasText: /Cannot jump directly from 'applied' to 'offer'/i,
    })
    await expect(toastError).toBeVisible({ timeout: 5000 })

    // Aditi Sharma card snaps back and remains in the Applied column
    await expect(aditiCard).toBeVisible()
    const currentSelectValue = await moveToSelect.inputValue()
    expect(currentSelectValue).not.toBe('offer')
  })

  test('4. An empty database shows clean empty states with no seed data fallback', async ({ page }) => {
    // Intercept live API calls to return empty sets
    await page.route('**/api/candidates*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 12 }),
      })
    })

    await page.route('**/api/jobs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.route('**/api/applications*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    // Check Candidates page shows EmptyState
    await page.goto('/app/candidates')
    await expect(page.getByText('No candidates match your criteria')).toBeVisible()
    await expect(page.getByText('0 talent profiles')).toBeVisible()
    // Verify no fallback seed candidate is rendered
    await expect(page.getByText('Aarav Sharma')).not.toBeVisible()

    // Check Jobs page shows EmptyState
    await page.goto('/app/jobs')
    await expect(page.getByText(/No job postings found/i)).toBeVisible()
    // Verify no fallback seed job is rendered
    await expect(page.getByText('Senior Full Stack Engineer')).not.toBeVisible()

    // Check Pipeline page shows 0 cards
    await page.goto('/app/pipeline')
    await expect(page.getByText('Recruitment Pipeline Kanban')).toBeVisible()
    const pipelineCards = page.locator('.cursor-grab, [data-draggable="true"]')
    expect(await pipelineCards.count()).toBe(0)
  })

  test('5. Blind mode toggle masks name, college, location across Candidates, Drawer, Pipeline, Jobs Ranking, Compare', async ({ page }) => {
    await page.goto('/app/candidates')
    await expect(page.getByText('Candidate Directory')).toBeVisible()

    // Turn Blind Mode ON via the top bar toggle button
    const blindToggle = page.getByTestId('blind-mode-toggle')
    await expect(blindToggle).toBeVisible()
    await blindToggle.click()

    // Assert "Blind mode on" banner is visible at the top
    await expect(page.getByTestId('blind-mode-banner')).toBeVisible()

    // 1. In Candidates Directory:
    // Name is masked as "Candidate #..."
    await expect(page.getByText(/^Candidate #/i).first()).toBeVisible()
    // College is masked as "[Hidden College]"
    await expect(page.getByText('[Hidden College]').first()).toBeVisible()
    // Location is masked as "[Hidden Location]"
    await expect(page.getByText('[Hidden Location]').first()).toBeVisible()

    // 2. Open Candidate Drawer via Quick Edit button
    const quickEditBtn = page.getByRole('button', { name: /Quick Edit/i }).first()
    await expect(quickEditBtn).toBeVisible()
    await quickEditBtn.click()

    const drawer = page.locator('.fixed.inset-y-0.right-0')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText(/^Candidate #/i).first()).toBeVisible()
    await expect(drawer.getByText('[Hidden College]').first()).toBeVisible()
    await expect(drawer.getByText('[Hidden Location]').first()).toBeVisible()

    // Close drawer
    const closeBtn = drawer.getByRole('button', { name: 'Close' })
    await closeBtn.click()

    // 3. Pipeline Kanban
    await page.goto('/app/pipeline')
    await expect(page.getByTestId('blind-mode-banner')).toBeVisible()
    await expect(page.getByText(/^Candidate #/i).first()).toBeVisible()
    await expect(page.getByText('[Hidden College]').first()).toBeVisible()

    // 4. Job Ranking
    await page.goto('/app/jobs/job-101')
    await expect(page.getByTestId('blind-mode-banner')).toBeVisible()
    await expect(page.getByText('Ranked Candidates')).toBeVisible()
    await expect(page.getByText(/^Candidate #/i).first()).toBeVisible()
    await expect(page.getByText('[Hidden College]').first()).toBeVisible()

    // 5. Compare Page
    await page.goto('/app/compare')
    await expect(page.getByTestId('blind-mode-banner')).toBeVisible()
    // Check comparison matrix or top recommendation masks candidate info
    await expect(page.getByText(/^Candidate #/i).first()).toBeVisible()
    await expect(page.getByText('[Hidden College]').first()).toBeVisible()

    // 6. Persistence check: Reload page and assert blind mode remains enabled
    await page.reload()
    await expect(page.getByTestId('blind-mode-banner')).toBeVisible()
    await expect(page.getByText(/^Candidate #/i).first()).toBeVisible()
  })

  test('6. Unscored applications render "-" and no default "75" appears', async ({ page }) => {
    await page.goto('/app/pipeline')
    await expect(page.getByText('Recruitment Pipeline Kanban')).toBeVisible()

    // In the stub server, the 5th application (Deepak Joshi) has match_score: null
    const unscoredCard = page.locator('div.cursor-grab').filter({ hasText: 'Deepak Joshi' }).first()
    await expect(unscoredCard).toBeVisible()

    // Score ring inside this card must render "-"
    await expect(unscoredCard.locator('[data-testid="score-ring"]')).toHaveText('-')

    // Must NOT display invented default score "75" or "75%"
    await expect(unscoredCard.getByText('75%')).not.toBeVisible()
    await expect(unscoredCard.getByText('75')).not.toBeVisible()
  })

  test('7. Upload job dropdown shows an empty state when the API returns no jobs', async ({ page }) => {
    // Intercept jobs API to return empty list
    await page.route('**/api/jobs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.goto('/app/upload')

    // EmptyState for jobs must be visible
    const emptyJobsState = page.getByTestId('upload-no-jobs-empty-state')
    await expect(emptyJobsState).toBeVisible()
    await expect(emptyJobsState.getByText(/No job requisitions found/i)).toBeVisible()

    // Dropdown contains only "Upload to talent pool" option
    const jobSelect = page.getByTestId('upload-job-select')
    await expect(jobSelect).toBeVisible()
    const options = jobSelect.locator('option')
    await expect(options).toHaveCount(1)
    await expect(options.first()).toHaveText('Upload to talent pool')
  })

  test('8. Bulk upload request includes job_id form field in POST /resumes/bulk', async ({ page }) => {
    await page.goto('/app/upload')

    // Ensure jobs are loaded and select a specific job
    const jobSelect = page.getByTestId('upload-job-select')
    await expect(jobSelect).toBeVisible()
    await expect(jobSelect.locator('option')).not.toHaveCount(1, { timeout: 10000 })
    await jobSelect.selectOption('job-101')

    // Upload a valid resume file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'candidate_test_resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test resume content'),
    })

    await expect(page.getByText('candidate_test_resume.pdf')).toBeVisible()

    // Setup request interception to verify multipart body contains job_id
    let capturedJobId: string | null = null
    await page.route('**/api/resumes/bulk', async (route) => {
      const postData = route.request().postData() || ''
      if (postData.includes('name="job_id"')) {
        const match = postData.match(/name="job_id"\r?\n\r?\n([^\r\n]+)/)
        capturedJobId = match ? match[1].trim() : 'present'
      }
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          batch_id: 'batch-test-bulk-job',
          total_files: 1,
          status: 'processing',
        }),
      })
    })

    const parseBtn = page.getByRole('button', { name: /Parse All Queued/i })
    await parseBtn.click()

    // Wait until request finishes and verify captured job_id corresponds to the selected job (job-101)
    await expect.poll(() => capturedJobId).toBeTruthy()
    expect(capturedJobId).toBe('job-101')
  })
})
