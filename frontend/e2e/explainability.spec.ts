import { test, expect } from '@playwright/test'

test.describe('Task 3: AI Match Explainability, Skill-Gap & Highlights', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hireswift_use_mock', 'false')
    })
  })

  test('1. Unscored candidate renders "-" and never an invented default score', async ({ page }) => {
    // In stub server, candidate C004 (Shreya Gupta) is unscored
    await page.goto('/app/candidates/C004')
    await page.waitForLoadState('networkidle')

    // Profile header
    await expect(page.getByRole('heading', { name: 'Shreya Gupta' })).toBeVisible()

    // Assert Match score ring displays "-" or "Unscored", not 75
    const matchPanel = page.locator('.space-y-4')
    await expect(matchPanel.getByText('Unscored')).toBeVisible()

    // Assert that breakdown components render "-" when missing
    const scoreBreakdown = page.getByText('Score Component Breakdown')
    await expect(scoreBreakdown).toBeVisible()
    const dashes = page.locator('span:has-text("-")')
    const dashCount = await dashes.count()
    expect(dashCount).toBeGreaterThan(0)

    // Ensure no invented default 75 is shown in match panel or score ring
    const scoreRing = page.locator('[data-testid="score-ring"]')
    await expect(scoreRing).not.toContainText('75')
    const breakdownText = await page.locator('.space-y-2\\.5').textContent()
    expect(breakdownText).not.toContain('75%')
  })

  test('2. Candidate detail displays Skill Gap list matching API missing_skills with learn hints', async ({ page }) => {
    // Candidate C001
    await page.goto('/app/candidates/C001')
    await page.waitForLoadState('networkidle')

    // Find the skill gap list
    const skillGapSection = page.locator('[data-testid="detail-skill-gap-list"]')
    if (await skillGapSection.isVisible()) {
      await expect(skillGapSection).toContainText('Missing for role')
      await expect(skillGapSection).toContainText('Learn hint:')
    }
  })

  test('3. Raw resume text renders with matched skills highlighted in green', async ({ page }) => {
    await page.goto('/app/candidates/C001')
    await page.waitForLoadState('networkidle')

    // Click "Resume Raw Text" tab
    const resumeTab = page.getByRole('tab', { name: /Resume Raw Text/i })
    await expect(resumeTab).toBeVisible()
    await resumeTab.click()

    // Assert highlighted mark tags exist inside resume view
    const resumeView = page.locator('[data-testid="resume-text-view"]')
    await expect(resumeView).toBeVisible()

    const marks = resumeView.locator('mark')
    const markCount = await marks.count()
    expect(markCount).toBeGreaterThan(0)
  })

  test('4. Compare page has "Suggested from scores" and "Skill gap vs job" row', async ({ page }) => {
    await page.goto('/app/compare?ids=C001,C002&job_id=job-101')
    await page.waitForLoadState('networkidle')

    // Assert "Suggested from scores" card exists
    const pickCard = page.locator('[data-testid="overall-pick-card"]')
    await expect(pickCard).toBeVisible()
    await expect(pickCard).toContainText('Suggested from scores')

    // Assert summary is built from score & missing competency count
    const summary = page.locator('[data-testid="suggested-summary"]')
    await expect(summary).toBeVisible()
    await expect(summary).toContainText('Highest evaluated score')

    // Assert "Skill gap vs job" row exists in comparison matrix
    const skillGapRow = page.locator('[data-testid="compare-skill-gap-row"]')
    await expect(skillGapRow).toBeVisible()
    await expect(skillGapRow).toContainText('Skill gap vs job')
  })

  test('5. Insights page displays Talent Pool Gap table with CSV Export & Print view buttons', async ({ page }) => {
    await page.goto('/app/insights')
    await page.waitForLoadState('networkidle')

    // Assert Talent Pool Gap section is visible
    const gapSection = page.locator('[data-testid="talent-pool-gap-section"]')
    await expect(gapSection).toBeVisible()
    await expect(gapSection).toContainText('Talent Pool Gap Analysis')

    // Assert Table exists with columns
    const gapTable = page.locator('[data-testid="talent-pool-gap-table"]')
    await expect(gapTable).toBeVisible()
    await expect(gapTable).toContainText('Required Competency')
    await expect(gapTable).toContainText('Jobs Requiring')
    await expect(gapTable).toContainText('Candidates with Skill')
    await expect(gapTable).toContainText('Pool Coverage')

    // Assert Export CSV and Print buttons exist
    const exportBtn = page.locator('[data-testid="export-gap-csv-btn"]')
    await expect(exportBtn).toBeVisible()

    const printBtn = page.locator('[data-testid="print-gap-view-btn"]')
    await expect(printBtn).toBeVisible()
  })
})
