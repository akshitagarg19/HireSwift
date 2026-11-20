# HireSwift ATS — Evaluator Demo Script (< 4 Minutes)

This script walks through the end-to-end recruitment lifecycle on HireSwift in under 4 minutes. In live mode (`VITE_USE_MOCK=false`), HireSwift communicates directly with the FastAPI backend contract specified in `API.md` (or the contract stub server `frontend/tools/stub-server.mjs`).

---

## 📋 Pre-Demo Checklist
Before starting the live walkthrough:
1. **Ensure Backend or Stub Server is Running**:
   - Check health endpoint: `curl http://127.0.0.1:8000/health` (should return 200 OK).
   - If testing against the contract fixture: `node frontend/tools/stub-server.mjs`.
2. **Start Frontend Dev Server**:
   ```bash
   npm --prefix frontend run dev
   # App is available at http://localhost:5173
   ```
3. **Verify Clean Live Mode**:
   - Open browser at `http://localhost:5173/`.
   - Confirm landing page loads cleanly.
   - Click "Open Recruiter Dashboard" or navigate to `/app` (redirects directly to `/app/dashboard` without login gate).
   - Observe sidebar has exactly: **Dashboard**, **Upload**, **Candidates**, **Jobs**, **Pipeline**, **Compare**, **Insights**, **Duplicates**, and **Emails**.
   - Observe the **"Blind Recruitment"** toggle in the top bar.

---

## Step 1: Recruiter Dashboard Landing & Global Search (30 Seconds)
1. **Executive Overview (`/app/dashboard`)**:
   - Point out live KPI cards: **Total Candidates**, **Active Job Openings**, **In Pipeline**, and **Shortlisted**.
   - Review the **Pipeline Conversion Funnel** and the **AI Skill Gap** alert card.
2. **Global Candidate Search**:
   - Type `"Python"` or `"Sharma"` in the top global search bar.
   - Show the 300 ms debounced dropdown results displaying candidate name, college, skills, and match badge.
   - Click any search result to open the Candidate Drawer immediately.
3. **Top 10 Ranked Candidates & Quick Compare**:
   - Select 2 candidates directly in the Top 10 table via checkboxes.
   - Click the **"Compare (2)"** action button to navigate directly into the side-by-side comparison view.

---

## Step 2: Bulk Resume Ingestion & Validation (30 Seconds)
1. **Navigate to Upload (`/app/upload`)**:
   - Select an open job requisition from the dropdown (links uploaded resumes via `job_id`), or choose "Upload to general talent pool".
2. **Batch Drag-and-Drop**:
   - Select or drag & drop 50+ resume files from `test-data/resumes/`.
   - Also include edge cases (`test-data/edge_cases/corrupt_resume.pdf`, `zero_byte.pdf`, `notes.txt`).
3. **Parse Batch & Isolate Failures**:
   - Click **"Parse All Queued Resumes"**.
   - Watch the real-time progress bar poll `GET /batches/{id}/progress`.
   - Show per-file failure handling: corrupted, 0-byte, and invalid format files are isolated in a scrollable list with explicit error reasons, while valid resumes succeed.
   - Click the green **"View candidates"** CTA button that routes to `/app/candidates`.

---

## Step 3: Multi-Mode Smart Filters & Explainable Drawer (40 Seconds)
1. **Navigate to Candidates Directory (`/app/candidates`)**:
   - Point out the server-side page size selector (`12`, `25`, `50`, `100`) synced to URL search parameters.
2. **Demonstrate Tri-State Skill Filtering (AND / OR / NOT)**:
   - Click `React` chip once: turns **Emerald (AND)** (`skills_all=React`).
   - Click `Docker` chip twice: turns **Indigo (OR)** (`skills_any=Docker`).
   - Click `Java` chip three times: turns **Rose (NOT)** (`skills_none=Java`).
   - Observe debounced URL search parameters updating in real-time.
3. **Demonstrate Ground-Truth Query F09**:
   - Set **City**: `Noida`
   - Set **Required Skill**: `Python` (AND mode)
   - Set **CGPA Min**: `7.5`
   - Set **Experience Min**: `2` years
   - Point out the exact result: **5 candidates matched** (`C005`, `C011`, `C016`, `C022`, `C030`), proving deterministic server-driven filtering.
4. **Inspect Candidate Drawer**:
   - Click any candidate row to open the slide-over drawer.
   - Show score rings, category breakdown bars, matched/missing skills, domain learn hints (e.g., Fast-API / Django / Flask hints), and yellow `<mark>` highlighted skill occurrences in the raw resume view.
   - Show unknown data resilience: missing fields render as `"-"` with amber styling, never defaulting to invented values like `0` or `75`.

---

## Step 4: Jobs, Ranking & Competency Breakdown (30 Seconds)
1. **Navigate to Jobs (`/app/jobs`)**:
   - Click into an active requisition (e.g. *Full Stack Engineer*).
2. **Ranked Candidates (`/app/jobs/{id}`)**:
   - Candidates are ordered strictly descending by server match score.
   - Candidates satisfying hard filter criteria strictly outscore candidates who fail hard filters.
3. **Skill Gap Tab**:
   - Switch to the **Skill Gap** tab (`GET /jobs/{id}/skill-gap`) to show applicant talent pool coverage vs. required skills.

---

## Step 5: Side-by-Side Candidate Comparison (30 Seconds)
1. **Navigate to Compare (`/app/compare`)**:
   - Displays 2 to 3 candidates side by side.
   - Highlights category winner badges (**Best Fit**, **Top Academic**, **Highest Exp**).
   - Point out **"Suggested from scores"** AI recommendation banner and the **Skill gap vs job** matrix row.
   - Demonstrate guardrails: Selecting a 4th candidate is blocked with a validation alert enforcing strict 2–3 comparison limits.

---

## Step 6: 5-Stage Kanban Pipeline & Guardrails (30 Seconds)
1. **Navigate to Pipeline (`/app/pipeline`)**:
   - Exactly 5 Kanban columns: **Applied**, **Shortlisted**, **Interview**, **Offer**, **Rejected**.
   - Cards display embedded candidate summaries (name, college, location, CGPA, skills).
   - For high-volume columns, point out the 50-card display limit and the **"Show more (+50)"** pagination button.
2. **Test Transition Validation & Snap-Back**:
   - Drag a candidate card from **Applied** directly to **Offer** (illegal direct jump):
     - The card snaps back immediately to Applied.
     - A toast notification displays the server rejection rule: *"Illegal transition: Cannot move directly from applied to offer. Candidate must complete Interview stage."*
   - Drag candidate card from **Applied** to **Shortlisted** (valid transition):
     - Card smoothly drops into Shortlisted and persists.

---

## Step 7: Bulk Email to Shortlisted Candidates (30 Seconds)
1. **Navigate to Emails (`/app/emails`)**:
   - Automatically pre-selects candidates currently in the **Shortlisted** pipeline stage.
2. **Live Personalization Preview**:
   - Select the "Interview Invitation" or "Screening Invitation" template.
   - Show live per-recipient previews with variable interpolation (`{{candidate_name}}`, `{{job_title}}`, `{{date}}`).
3. **Dispatch & Fallback Actions**:
   - Click **"Send Emails to X Shortlisted Candidates"** to trigger confirmation modal and delivery audit log.
   - Show manual zero-dependency fallback actions: **Copy All Recipient Emails**, **Open in Mail Client** (BCC chunked into <=40 recipient batches), and **Export Shortlist CSV**.

---

## Step 8: Duplicate Detection & Side-by-Side Merging (20 Seconds)
1. **Navigate to Duplicates (`/app/duplicates`)**:
   - Displays detected duplicate groups with signal types (`exact_copy`, `fuzzy_name_same_phone`, `same_email_other_format`, `same_email_updated_resume`).
2. **Diff & Resolution**:
   - Inspect side-by-side field differences between primary and duplicate profiles.
   - Demonstrate 1-click **Merge into Primary**, **Dismiss**, or **Keep Both**.

---

## Step 9: Blind Recruitment Mode Across All Views (20 Seconds)
1. **Toggle Blind Mode in Top Bar**:
   - Click the **Blind Recruitment** toggle switch in the application header.
   - Show immediate anonymization across the entire ATS:
     - Candidate names mask to `"Candidate #<ID>"`.
     - Colleges and locations are masked across Dashboard, Candidates Directory, Candidate Drawer, Jobs Ranking, Pipeline Kanban, and Compare view.
   - Show persistent yellow banner: *"Blind mode active — Identifying information is masked."*
   - Refresh the page to demonstrate localStorage persistence.

---

## Quick Reset for Fresh Testing
To reset local UI state at any time:
- In DevTools console:
  ```js
  localStorage.clear(); location.reload();
  ```
