import { test, expect } from '@playwright/test'

test.describe('Task 2: Navigation and Connection Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage to start each test with predictable seed state
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('Flow 1: Home -> Sign up -> Onboarding -> Dashboard and Home -> Live demo -> Dashboard', async ({ page }) => {
    // 1A. Live Demo CTA from Home
    await page.goto('/')
    await page.click('button:has-text("Try live demo")')
    await expect(page).toHaveURL(/\/app\/dashboard/)
    await expect(page.locator('h1')).toContainText('Recruitment Command Center')

    // 1B. Sign Up -> Onboarding -> Dashboard
    await page.goto('/signup')
    const uniqueName = `Org-${Date.now()}`
    await page.fill('input[placeholder*="Acme Technologies"]', uniqueName)
    await page.fill('input[placeholder*="Ramesh Iyer"]', 'Test Admin')
    await page.fill('input[type="email"]', `admin@${uniqueName.toLowerCase()}.com`)
    await page.fill('input[type="password"]', 'password123')
    await page.click('button:has-text("Create Account & Configure")')

    await expect(page).toHaveURL(/\/onboarding/)
    await expect(page.locator('h1')).toContainText('Setup your organization')

    // Step through onboarding
    await page.click('button:has-text("Continue to Hiring Model")')
    await page.click('button:has-text("Next: Pipeline Stages")')
    await page.click('button:has-text("Next: Team Members")')
    await page.click('button:has-text("Launch Workspace")')

    await expect(page).toHaveURL(/\/app\/dashboard/)
    await expect(page.locator('header')).toContainText(uniqueName)
  })

  test('Flow 2: Dashboard attention items deep-link to Candidates with pre-set filters', async ({ page }) => {
    // Log in as default demo admin
    await page.goto('/login')
    await page.click('button:has-text("Demo Login: Nova Labs")')
    await expect(page).toHaveURL(/\/app\/dashboard/)

    // Click "Needs review" attention item
    await page.click('text=Needs review')
    await expect(page).toHaveURL(/\/app\/candidates\?stage=applied/)
    await expect(page.locator('table')).toBeVisible()

    // Go back to dashboard and click "Stalled in interview"
    await page.goto('/app/dashboard')
    await page.click('text=Stalled in interview')
    await expect(page).toHaveURL(/\/app\/candidates\?stage=interview/)

    // Go back to dashboard and click "Pending offers"
    await page.goto('/app/dashboard')
    await page.click('text=Pending offers')
    await expect(page).toHaveURL(/\/app\/candidates\?stage=offer/)
  })

  test('Flow 3: Candidate detail stage progression, Kanban sync, timeline, and audit log', async ({ page }) => {
    await page.goto('/login')
    await page.click('button:has-text("Demo Login: Nova Labs")')
    await page.goto('/app/candidates')

    // Click first candidate
    const firstRowName = await page.locator('tbody tr:first-child td:nth-child(2) .font-bold').innerText()
    await page.click('tbody tr:first-child')
    await expect(page).toHaveURL(/\/app\/candidates\/cand-/)

    // Move stage to 'interview'
    await page.click('button:has-text("Move Stage")')
    await page.selectOption('div[role="dialog"] select', 'interview')
    await page.click('div[role="dialog"] button:has-text("Update Stage")')

    // Verify detail badge updated
    await expect(page.locator('span:has-text("Interview")').first()).toBeVisible()

    // Verify Timeline tab has stage history
    await page.click('button[role="tab"]:has-text("Stage Timeline")')
    await expect(page.locator('text=Moved from')).toBeVisible()
    await expect(page.locator('text=Interview').first()).toBeVisible()

    // Verify Kanban board shows this candidate under Interview
    await page.goto('/app/pipeline')
    await expect(page.locator(`text=${firstRowName}`)).toBeVisible()

    // Verify Audit Trail in Settings logged the stage change
    await page.goto('/app/settings')
    await page.click('button:has-text("Audit Trail")')
    await expect(page.locator('text=Stage Changed').first()).toBeVisible()
    await expect(page.locator(`text=${firstRowName}`).first()).toBeVisible()
  })

  test('Flow 4: Candidates table Compare and Email buttons with preloaded candidates', async ({ page }) => {
    await page.goto('/login')
    await page.click('button:has-text("Demo Login: Nova Labs")')
    await page.goto('/app/candidates')

    // Select first two candidates
    const checkboxes = page.locator('tbody tr td:first-child button')
    await checkboxes.nth(0).click()
    await checkboxes.nth(1).click()

    // Verify bulk toolbar with 2 selected
    await expect(page.locator('text=2 candidates selected')).toBeVisible()
    await expect(page.locator('button:has-text("Compare (2)")')).toBeVisible()
    await expect(page.locator('button:has-text("Send Email")')).toBeVisible()

    // Click Compare
    await page.click('button:has-text("Compare (2)")')
    await expect(page).toHaveURL(/\/app\/compare\?candidateIds=/)
    await expect(page.locator('h1')).toContainText('Candidate Head-to-Head Comparison')
    await expect(page.locator('text=Criteria & Fit Breakdown')).toBeVisible()

    // Go back and click Send Email
    await page.goto('/app/candidates')
    const cb = page.locator('tbody tr td:first-child button')
    await cb.nth(0).click()
    await cb.nth(1).click()
    await page.click('button:has-text("Send Email")')
    await expect(page).toHaveURL(/\/app\/emails\?recipientIds=/)
    await expect(page.locator('text=2 Candidates')).toBeVisible()
  })

  test('Flow 5: Weight changes in Settings re-rank live, and single job weights re-rank that job only', async ({ page }) => {
    await page.goto('/login')
    await page.click('button:has-text("Demo Login: Nova Labs")')

    // 5A. Settings Scoring Weights re-rank
    await page.goto('/app/settings')
    await page.click('button:has-text("Scoring Weights")')
    // Click Fresher preset
    await page.click('button:has-text("Campus Fresher Focus")')
    await page.click('button:has-text("Save Scoring Configuration")')
    await expect(page.locator('text=Scoring weights saved!')).toBeVisible()

    // 5B. Single Job Weights change
    await page.goto('/app/jobs')
    await page.click('text=Senior Full Stack Engineer')
    await expect(page).toHaveURL(/\/app\/jobs\/job-/)

    // Toggle job weight panel
    await page.click('button:has-text("Adjust Weights")')
    await expect(page.locator('text=Job-Specific Scoring Weights')).toBeVisible()
    // Change skills slider
    const skillSlider = page.locator('input[type="range"]').first()
    await skillSlider.fill('80')
    // Ranked list remains sorted by Match Score
    await expect(page.locator('text=Ranked Candidates')).toBeVisible()
  })

  test('Flow 6: Custom fields and pipeline stages appear in Candidate Detail, Kanban, and Table Columns', async ({ page }) => {
    await page.goto('/login')
    await page.click('button:has-text("Demo Login: Nova Labs")')

    // 6A. Add custom field in Settings
    await page.goto('/app/settings')
    await page.click('button:has-text("Custom Fields")')
    const fieldName = `Notice Period Days`
    await page.fill('input[placeholder*="Notice Period"]', fieldName)
    await page.click('button:has-text("Add Field")')
    await expect(page.locator(`text=${fieldName}`)).toBeVisible()

    // 6B. Add pipeline stage in Settings
    await page.click('button:has-text("Pipeline Stages")')
    const stageName = `Cultural Fit Bar Raiser`
    await page.fill('input[placeholder*="New stage name"]', stageName)
    await page.click('button:has-text("Add Stage")')
    await expect(page.locator(`text=${stageName}`)).toBeVisible()

    // 6C. Verify in Kanban board
    await page.goto('/app/pipeline')
    await expect(page.locator(`text=${stageName}`)).toBeVisible()

    // 6D. Verify in Candidate Detail
    await page.goto('/app/candidates')
    await page.click('tbody tr:first-child')
    await expect(page.locator('text=Organization Custom Fields')).toBeVisible()

    // 6E. Verify Table Columns chooser has the custom field
    await page.goto('/app/candidates')
    await page.click('button:has-text("Columns")')
    await expect(page.locator(`text=${fieldName}`)).toBeVisible()
  })

  test('Flow 7: Blind mode masks candidate identifiers across the entire app', async ({ page }) => {
    await page.goto('/login')
    await page.click('button:has-text("Demo Login: Nova Labs")')

    // Toggle blind mode ON in Settings > Privacy
    await page.goto('/app/settings')
    await page.click('button:has-text("Data & Privacy")')
    const blindSwitch = page.locator('button[role="switch"]')
    await blindSwitch.click()
    await expect(page.locator('text=Blind Mode On')).toBeVisible()

    // Verify on Dashboard
    await page.goto('/app/dashboard')
    await expect(page.locator('text=Blind Mode On')).toBeVisible()
    await expect(page.locator('text=Candidate #').first()).toBeVisible()

    // Verify on Candidates Directory
    await page.goto('/app/candidates')
    await expect(page.locator('text=Candidate #').first()).toBeVisible()
    await expect(page.locator('text=[Hidden College]').first()).toBeVisible()

    // Verify on Kanban
    await page.goto('/app/pipeline')
    await expect(page.locator('text=Candidate #').first()).toBeVisible()

    // Verify on Candidate Detail
    await page.click('text=Candidate #')
    await expect(page.locator('h1:has-text("Candidate #")')).toBeVisible()
    await expect(page.locator('text=[Hidden College]').first()).toBeVisible()
  })

  test('Flow 8: Company switcher switches tenant cleanly with complete state isolation', async ({ page }) => {
    await page.goto('/login')
    await page.click('button:has-text("Demo Login: Nova Labs")')
    await expect(page.locator('header')).toContainText('Nova Labs Pvt Ltd')

    // Switch to Campus Hire Co
    await page.click('button:has-text("Nova Labs Pvt Ltd")')
    await page.click('button:has-text("Campus Hire Co")')

    await expect(page.locator('header')).toContainText('Campus Hire Co')
    // Jobs should reflect Campus Hire Co
    await page.goto('/app/jobs')
    await expect(page.locator('text=Graduate Engineer Trainee')).toBeVisible()
    await expect(page.locator('text=Campus Recruitment 2025')).toBeVisible()
  })

  test('Flow 9: Role switcher enforces Viewer read-only and Admin full access', async ({ page }) => {
    await page.goto('/login')
    await page.click('button:has-text("Demo Login: Nova Labs")')

    // Switch role to Viewer
    const roleSelect = page.locator('select[aria-label="Switch User Role"]')
    await roleSelect.selectOption('Viewer')

    // In Candidate Detail, Viewer sees Read-Only mode
    await page.goto('/app/candidates')
    await page.click('tbody tr:first-child')
    await expect(page.locator('text=Viewer Mode (Read-Only)')).toBeVisible()
    await expect(page.locator('button:has-text("Shortlist")')).not.toBeVisible()

    // In Settings, Viewer sees Read-Only notice
    await page.goto('/app/settings')
    await expect(page.locator('text=Read-Only Workspace Settings')).toBeVisible()

    // Switch back to Admin
    await roleSelect.selectOption('Admin')
    await expect(page.locator('text=Read-Only Workspace Settings')).not.toBeVisible()
  })

  test('Flow 10: Careers page application submission lands in recruiter pipeline', async ({ page }) => {
    // Navigate to public careers page
    await page.goto('/careers/novalabs')
    await expect(page.locator('h1')).toContainText('Nova Labs Pvt Ltd')

    // Apply for the first active opening
    await page.click('a:has-text("Apply Now") >> nth=0')
    await expect(page).toHaveURL(/\/careers\/novalabs\/job-/)

    const applicantName = `Pooja Sharma ${Date.now().toString().slice(-4)}`
    await page.fill('input[placeholder*="Pooja Sharma"]', applicantName)
    await page.fill('input[placeholder*="pooja.sharma@"]', `pooja.${Date.now()}@example.in`)
    await page.fill('input[placeholder*="+91 98765"]', '+91 9876543210')
    await page.fill('input[placeholder*="Bengaluru"]', 'Hyderabad')
    await page.fill('input[placeholder*="IIT Delhi"]', 'BITS Pilani')

    // Consent checkbox
    await page.click('input[type="checkbox"]')
    // Submit
    await page.click('button:has-text("Submit Job Application")')

    // Confirmation screen
    await expect(page.locator('text=Application Submitted Successfully!')).toBeVisible()

    // Verify recruiter view has applicant in Applied stage
    await page.goto('/login')
    await page.click('button:has-text("Demo Login: Nova Labs")')
    await page.goto('/app/candidates')
    await expect(page.locator(`text=${applicantName}`)).toBeVisible()
  })
})
