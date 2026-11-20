import { test, expect } from '@playwright/test'

test.describe('HireSwift ATS Core Recruitment Flow', () => {
  test('Complete end-to-end lifecycle', async ({ page }) => {
    // 1. Visit App (no login gate required per plan)
    await page.goto('/app/upload')
    await expect(page).toHaveURL(/.*\/app\/upload/)
    await expect(page.getByText('Resume Ingestion & Parsing')).toBeVisible()

    // 2. Simulate 5 resumes upload (in dev mock mode)
    const simulateBtn = page.locator('button:has-text("Simulate 5 Resumes")')
    if (await simulateBtn.isVisible()) {
      await simulateBtn.click()
      await expect(page.getByText(/Upload Queue/)).toBeVisible()

      // Parse all queued
      const parseAllBtn = page.getByRole('button', { name: /Parse All Queued/i })
      await parseAllBtn.click()

      // Wait for parse to finish and CTA to appear
      const viewBtn = page.getByRole('button', { name: /View Ranked Candidates|View candidates/i }).first()
      await expect(viewBtn).toBeVisible({ timeout: 20000 })
      await viewBtn.click()
    }

    // 6. Navigate to Candidate Directory and apply filters
    await page.click('a[href="/app/candidates"]')
    await expect(page).toHaveURL(/.*\/app\/candidates/)
    await expect(page.getByText('Candidate Directory')).toBeVisible()

    // Use Natural Language filter
    const nlInput = page.locator('input[placeholder*="Try Natural Language"]')
    await nlInput.fill('Python')
    await page.click('button:has-text("Parse Query")')

    // 7. Select a candidate and open detail
    const firstCandidateRow = page.locator('tbody tr').first()
    await firstCandidateRow.click()
    await expect(page).toHaveURL(/.*\/app\/candidates\//)
    await expect(page.getByText('Parsed Candidate Profile')).toBeVisible()

    // Click Shortlist button if present in top header actions
    const shortlistBtn = page.getByRole('button', { name: 'Shortlist' })
    if (await shortlistBtn.isVisible()) {
      await shortlistBtn.click()
      await expect(page.getByText(/moved to Shortlisted/i)).toBeVisible()
    }

    // 8. Move through Pipeline (Kanban)
    await page.click('a[href="/app/pipeline"]')
    await expect(page).toHaveURL(/.*\/app\/pipeline/)
    await expect(page.getByText('Recruitment Pipeline Kanban')).toBeVisible()

    // 9. Compare Candidates
    await page.click('a[href="/app/compare"]')
    await expect(page).toHaveURL(/.*\/app\/compare/)
    await expect(page.getByText('Side-by-Side Candidate Comparison')).toBeVisible()
    await expect(page.getByText('HireSwift AI Hiring Recommendation')).toBeVisible()

    // 10. Send Email
    const emailLink = page.locator('a[href="/app/emails"]')
    if (await emailLink.isVisible()) {
      await emailLink.click()
    } else {
      await page.goto('/app/emails')
    }
    await expect(page).toHaveURL(/.*\/app\/emails/)
    await expect(page.getByText('Email Communications & Automation')).toBeVisible()
    await expect(page.getByText('Live Preview')).toBeVisible()

    await page.click('button:has-text("Send to")')
    await expect(page.getByText(/Successfully dispatched/i)).toBeVisible()

    // 11. Verify Duplicates module (active per plan)
    const dupsLink = page.locator('a[href="/app/duplicates"]')
    if (await dupsLink.isVisible()) {
      await dupsLink.click()
      await expect(page).toHaveURL(/.*\/app\/duplicates/)
      await expect(page.getByText('Duplicate Candidate Detection')).toBeVisible()
    }
  })
})
