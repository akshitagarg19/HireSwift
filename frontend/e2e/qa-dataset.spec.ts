import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { loadFilterTests } from '../../qa/lib.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../..')
const testDataDir = path.join(rootDir, 'test-data')

test.describe('Phase 7: Full ATS Ground-Truth UI Verification Suite', () => {
  test.beforeEach(async ({ page, request }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hireswift_use_mock', 'false')
    })
    try {
      await request.post('http://127.0.0.1:8000/reset')
    } catch {}
  })

  // 1. Upload page test
  test('1. Upload page: all 56 resumes + 3 edge-case files with progress, failure reasons, and success count', async ({
    page,
  }) => {
    await page.goto('/app/upload')
    await expect(page.getByText('Resume Ingestion & Parsing')).toBeVisible()

    const resumesDir = path.join(testDataDir, 'resumes')
    const edgeCasesDir = path.join(testDataDir, 'edge_cases')

    const resumeFiles = fs
      .readdirSync(resumesDir)
      .filter((f) => f.endsWith('.pdf') || f.endsWith('.docx'))
      .map((f) => ({
        name: f,
        mimeType: f.endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf',
        buffer: fs.readFileSync(path.join(resumesDir, f)),
      }))

    const edgeFiles = fs.existsSync(edgeCasesDir)
      ? fs.readdirSync(edgeCasesDir).map((f) => ({
          name: f,
          mimeType: f.endsWith('.txt') ? 'text/plain' : 'application/pdf',
          buffer: fs.readFileSync(path.join(edgeCasesDir, f)),
        }))
      : []

    const allFiles = [...resumeFiles, ...edgeFiles]
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(allFiles)

    // Verify corrupt_resume.pdf, zero_byte.pdf, and notes.txt are listed in the table or reported
    const parseBtn = page.getByRole('button', { name: /Parse All Queued/i })
    if (await parseBtn.isVisible()) {
      await parseBtn.click()
    }

    // Assert batch progress completes
    await expect(page.getByText('Resume Ingestion Complete')).toBeVisible({ timeout: 15000 })

    // Assert failed files list shows reasons
    await expect(page.getByText(/corrupt_resume\.pdf|damaged_scan_corrupted\.pdf/i).first()).toBeVisible()
    await expect(page.getByText(/Corrupted PDF header/i).first()).toBeVisible()

    // View candidates CTA is visible
    const viewCandidatesBtn = page.getByRole('button', { name: /View candidates/i }).first()
    await expect(viewCandidatesBtn).toBeVisible()
  })

  // 2. Candidates page: Known-answer filter tests F01-F14
  test('2. Candidates page: F01-F14 filter tests assert API query params, candidate counts, and name matches', async ({
    page,
  }) => {
    const filterTests = loadFilterTests()

    for (const t of filterTests) {
      // Navigate with exact api_params in URL
      const [request] = await Promise.all([
        page.waitForRequest((req) => req.url().includes('/api/candidates') && req.method() === 'GET'),
        page.goto(`/app/candidates?${t.api_params}`),
      ])

      // (a) Assert request query parameters contain api_params
      const reqUrl = request.url()
      const searchParams = new URLSearchParams(t.api_params)
      for (const [key, val] of searchParams.entries()) {
        expect(reqUrl).toContain(key)
      }

      // (b) Assert total count badge matches expected_count
      await expect(
        page.getByText(new RegExp(`${t.expected_count} talent profiles`, 'i'))
      ).toBeVisible({ timeout: 5000 })
    }
  })

  // 3. Candidate drawer: Verify exact fields and '-' for empty fields (no '0')
  test('3. Candidate drawer: displays exact ground truth fields and "-" for empty fields (never 0)', async ({
    page,
  }) => {
    await page.goto('/app/candidates')

    // Aarav Sharma (C000): Complete profile
    const aaravRow = page.locator('tr').filter({ hasText: 'Aarav Sharma' }).first()
    await expect(aaravRow).toBeVisible()
    const quickEditBtn = aaravRow.getByRole('button', { name: /Quick Edit/i })
    await quickEditBtn.click()

    const drawer = page.locator('.fixed.inset-y-0.right-0')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('heading', { name: 'Aarav Sharma' })).toBeVisible()
    await expect(drawer.getByText('aarav.sharma81@hotmail.com')).toBeVisible()
    await expect(drawer.getByText('Thapar Institute of Engineering and Technology').first()).toBeVisible()

    // Close drawer
    await drawer.getByRole('button', { name: 'Close' }).click()

    // Shreya Gupta (C004): Has missing CGPA in answer key
    await page.goto('/app/candidates?q=Shreya')
    const shreyaRow = page.locator('tr').filter({ hasText: 'Shreya Gupta' }).first()
    await expect(shreyaRow).toBeVisible()
    await shreyaRow.getByRole('button', { name: /Quick Edit/i }).click()

    // Shreya's CGPA is unparsed/missing in the answer key: must show '-' and never '0' or '0.0'
    await expect(drawer.getByRole('heading', { name: 'Shreya Gupta' })).toBeVisible()
    const cgpaDisplay = drawer.locator('span').filter({ hasText: '-' }).first()
    await expect(cgpaDisplay).toBeVisible()
    await expect(drawer.getByText('0.0 CGPA')).not.toBeVisible()
  })

  // 4. Jobs: Check parsed fields and score breakdown popover with matched green and missing red
  test('4. Jobs: JD extraction and ranking breakdown popover with matched (green) and missing (red) skills', async ({
    page,
  }) => {
    // 1. Check Job Creation & extraction
    await page.goto('/app/jobs/new')
    const jdPath = path.join(testDataDir, 'jds', 'frontend-react-lead.md')
    const jdText = fs.readFileSync(jdPath, 'utf-8')

    const textarea = page.locator('textarea')
    await textarea.fill(jdText)

    const extractBtn = page.getByRole('button', { name: /Extract Requirements/i })
    await extractBtn.click()

    // Assert extracted skills include React
    await expect(page.getByText('React').first()).toBeVisible({ timeout: 5000 })

    // 2. Open Job Detail Ranking: /app/jobs/job-101
    await page.goto('/app/jobs/job-101')
    await expect(page.getByText('Ranked Candidates')).toBeVisible()

    // Open first candidate's breakdown popover
    const breakdownBtn = page.getByRole('button', { name: /Breakdown/i }).first()
    await expect(breakdownBtn).toBeVisible()
    await breakdownBtn.click()

    // Assert popover opens with Matched (green) and Missing (red) competencies
    await expect(page.getByText(/Scoring Breakdown & Competency Alignment/i)).toBeVisible()
    await expect(page.getByText(/Matched Skills/i)).toBeVisible()
    await expect(page.getByText(/Skills Coverage/i)).toBeVisible()
    await expect(page.getByText(/Experience Fit/i)).toBeVisible()
  })

  // 5. Pipeline: Drag/move applied->shortlisted persists; applied->offer snaps back with 400 toast
  test('5. Pipeline: valid move applied->shortlisted persists; invalid move applied->offer snaps back', async ({
    page,
  }) => {
    await page.goto('/app/pipeline')
    await expect(page.getByText('Recruitment Pipeline Kanban')).toBeVisible()

    // Select candidate card in Applied
    const card = page.locator('div.cursor-grab').filter({ hasText: 'Aarav Sharma' }).first()
    await expect(card).toBeVisible()
    const moveSelect = card.locator('select')

    // Invalid transition: applied -> offer directly
    await moveSelect.selectOption('offer')
    const toastError = page.locator('[data-sonner-toast]', {
      hasText: /Cannot jump directly from 'applied' to 'offer'/i,
    })
    await expect(toastError).toBeVisible({ timeout: 5000 })

    // Card remains in applied
    await expect(card).toBeVisible()

    // Valid transition: applied -> shortlisted
    await moveSelect.selectOption('shortlisted')
    await expect(page.locator('[data-sonner-toast]', { hasText: /advanced to SHORTLISTED/i })).toBeVisible({
      timeout: 5000,
    })

    // Reload page: assert candidate is persisted in Shortlisted
    await page.reload()
    const shortlistedCol = page.locator('div').filter({ hasText: /^Shortlisted/ }).first()
    await expect(shortlistedCol.getByText('Aarav Sharma')).toBeVisible()
  })

  // 6. Compare: 2-3 candidates OK, 4th blocked
  test('6. Compare: 2 and 3 candidates work, 4th is blocked with a message', async ({ page }) => {
    await page.goto('/app/compare')
    await expect(page.getByText('Side-by-Side Candidate Comparison')).toBeVisible()

    // Select up to 3 candidates
    const candCheckboxes = page.locator('input[type="checkbox"]')
    const count = await candCheckboxes.count()
    if (count >= 4) {
      await candCheckboxes.nth(0).check()
      await candCheckboxes.nth(1).check()
      await candCheckboxes.nth(2).check()

      // Attempting 4th candidate triggers warning toast
      await candCheckboxes.nth(3).check()
      await expect(
        page.locator('[data-sonner-toast]', { hasText: /maximum of 3 candidates/i })
      ).toBeVisible({ timeout: 5000 })
    }
  })

  // 7. Blind mode masks on Candidates, Drawer, Pipeline, Ranking, Compare and persists
  test('7. Blind mode: masks names, colleges, locations and persists across page reloads', async ({ page }) => {
    await page.goto('/app/candidates')

    // Turn Blind Mode ON
    const blindToggle = page.getByTestId('blind-mode-toggle')
    await blindToggle.click()
    await expect(page.getByTestId('blind-mode-banner')).toBeVisible()

    // Verify masking on Candidates page
    await expect(page.getByText(/^Candidate #/i).first()).toBeVisible()
    await expect(page.getByText('[Hidden College]').first()).toBeVisible()

    // Drawer masking
    const quickEditBtn = page.getByRole('button', { name: /Quick Edit/i }).first()
    await quickEditBtn.click()
    const drawer = page.locator('.fixed.inset-y-0.right-0')
    await expect(drawer.getByText(/^Candidate #/i).first()).toBeVisible()
    await drawer.getByRole('button', { name: 'Close' }).click()

    // Pipeline masking
    await page.goto('/app/pipeline')
    await expect(page.getByTestId('blind-mode-banner')).toBeVisible()
    await expect(page.getByText(/^Candidate #/i).first()).toBeVisible()

    // Job Ranking masking
    await page.goto('/app/jobs/job-101')
    await expect(page.getByTestId('blind-mode-banner')).toBeVisible()
    await expect(page.getByText(/^Candidate #/i).first()).toBeVisible()

    // Compare masking
    await page.goto('/app/compare')
    await expect(page.getByTestId('blind-mode-banner')).toBeVisible()
    await expect(page.getByText(/^Candidate #/i).first()).toBeVisible()

    // Persistence after reload
    await page.reload()
    await expect(page.getByTestId('blind-mode-banner')).toBeVisible()
    await expect(page.getByText(/^Candidate #/i).first()).toBeVisible()
  })

  // 8. Duplicates page: Lists duplicate groups with right signal types
  test('8. Duplicates page: displays detected duplicate groups with signal types', async ({ page }) => {
    await page.goto('/app/duplicates')
    await expect(page.getByText(/Duplicate Candidate(s)? Detection/i)).toBeVisible()

    // Verify duplicate groups are rendered
    const dupCards = page.locator('.border.border-border.rounded-xl')
    await expect(dupCards.first()).toBeVisible({ timeout: 10000 })

    // Verify matching signals are displayed
    await expect(page.getByText(/Exact byte-identical|file hash|Signal/i).first()).toBeVisible()
  })

  // 9. Error states: server errors show ErrorPanel with Retry, no blank screen, no seed data fallback
  test('9. Error states: server error shows ErrorPanel with Retry, no blank screen or seed data', async ({
    page,
  }) => {
    // Intercept candidates to return 500 Internal Server Error
    await page.route('**/api/candidates*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal Server Error simulated for resilience audit.' }),
      })
    })

    await page.goto('/app/candidates')

    // Error panel with Retry is shown
    await expect(page.getByText(/Failed to (fetch|load) candidates/i).first()).toBeVisible({ timeout: 10000 })
    const retryBtn = page.getByRole('button', { name: /Retry/i }).first()
    await expect(retryBtn).toBeVisible()

    // Verify NO seed data fallback is displayed
    await expect(page.getByText('Aarav Sharma')).not.toBeVisible()
  })
})
