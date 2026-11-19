import { test, expect } from '@playwright/test'

test.describe('HireSwift ATS Core Recruitment Flow', () => {
  test('Complete end-to-end lifecycle', async ({ page }) => {
    // 1. Visit Login page
    await page.goto('/login')
    await expect(page.getByText('Shortlist in minutes, not weeks')).toBeVisible()

    // 2. Login as Admin
    await page.fill('input[type="email"]', 'admin@novalabs.com')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button[type="submit"]')

    // 3. Lands on Dashboard
    await expect(page).toHaveURL(/.*\/app\/dashboard/)
    await expect(page.getByText('Hiring Dashboard')).toBeVisible()
    await expect(page.getByRole('main').getByText('Nova Labs Pvt Ltd')).toBeVisible()

    // 4. Navigate to Upload Resumes
    await page.click('a[href="/app/upload"]')
    await expect(page).toHaveURL(/.*\/app\/upload/)
    await expect(page.getByText('Resume Ingestion & Parsing')).toBeVisible()

    // Simulate 5 resumes upload
    await page.click('button:has-text("Simulate 5 Resumes")')
    await expect(page.getByText(/Upload Queue/)).toBeVisible()

    // Parse all queued
    const parseAllBtn = page.getByRole('button', { name: /Parse All Queued/i })
    await parseAllBtn.click()

    // Wait for parse to finish and CTA to appear
    const viewRankedBtn = page.getByRole('button', { name: /View Ranked Candidates/i })
    await expect(viewRankedBtn).toBeVisible({ timeout: 20000 })

    // 5. Open Job Ranking from CTA
    await viewRankedBtn.click()
    await expect(page).toHaveURL(/.*\/app\/jobs\//)
    await expect(page.getByRole('tab', { name: /Ranked Candidates/i })).toBeVisible()

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

    // 11. Change Weights in Settings and verify re-rank
    const settingsLink = page.locator('a[href="/app/settings"]')
    if (await settingsLink.isVisible()) {
      await settingsLink.click()
    } else {
      await page.goto('/app/settings')
    }
    await expect(page).toHaveURL(/.*\/app\/settings/)
    await expect(page.getByText('Workspace Settings')).toBeVisible()

    await page.click('button:has-text("Scoring Weights")')
    await expect(page.getByText('Scoring Weights & Ranking Algorithm')).toBeVisible()

    await page.click('button:has-text("Fresher Preset")')
    await expect(page.getByText(/All candidates re-ranked/i)).toBeVisible()
  })
})
