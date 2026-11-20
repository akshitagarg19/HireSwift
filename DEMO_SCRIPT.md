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
   - Click "Try Live Demo" or navigate to `/app` (redirects directly to `/app/upload` without login gate).
   - Observe sidebar has exactly: **Upload**, **Candidates**, **Jobs**, **Pipeline**, **Compare**, **Insights**, **Duplicates**, and **Emails**.
   - Observe the **"Blind Recruitment"** toggle in the top bar.

---

## Step 1: Bulk Resume Ingestion & Validation (45 Seconds)
1. **Navigate to Upload**: Click **Upload** in the left sidebar (`/app/upload`).
2. **Highlight Job Link & Batch Drag-and-Drop**:
   - Show the target job selector (links uploaded resumes directly to an open position via `job_id`).
   - Drag & drop or select PDF/DOCX resume files from `test-data/resumes/`.
   - Notice client validation enforcing allowed extensions and file limits.
3. **Run Batch Ingestion**:
   - Click **"Parse All Queued Resumes"**.
   - Watch the real-time progress bar poll `GET /batches/{id}/progress`.
   - Show per-file failure handling: corrupted files (e.g. `corrupt_resume.pdf`) are isolated with explicit error reasons while valid resumes succeed.
   - Click the green **"View candidates"** CTA button that routes to `/app/candidates`.

---

## Step 2: Multi-Mode Smart Filters & Explainable Drawer (45 Seconds)
1. **Navigate to Candidates Directory**: Click **Candidates** in the sidebar (`/app/candidates`).
2. **Demonstrate Tri-State Skill Filtering (AND / OR / NOT)**:
   - Click the `React` skill chip once: turns **Emerald (AND)** (`skills_all=React`).
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
   - Point out missing data resilience: unparsed or absent fields render as `"-"` with amber low-confidence styling, never defaulting to invented values like `0` or `75`.
5. **Toggle Blind Mode**:
   - Click the **Blind Recruitment** switch in the top bar.
   - Notice candidate names instantly mask to `"Candidate #<ID>"`, colleges and locations are masked across the directory and drawer.
   - Show the yellow banner: *"Blind mode active — Identifying information is masked."*

---

## Step 3: Jobs, Explainable Match Scoring & Ranking (45 Seconds)
1. **Navigate to Jobs**: Click **Jobs** in the sidebar (`/app/jobs`).
2. **Inspect Job Detail & Candidate Ranking**:
   - Click into an active job requisition (e.g., *Full Stack Engineer*).
   - Switch to the **Ranked Candidates** tab (`/app/jobs/{id}`).
   - Candidates are sorted strictly descending by server match score.
   - Candidates satisfying hard filter criteria strictly outscore candidates who fail hard filters.
3. **Explainability Popover**:
   - Click on the score chip or breakdown icon:
   - Green chips with checkmarks (`✓ React`, `✓ TypeScript`, `✓ Docker`) show matched competencies.
   - Red chips with crosses (`✕ GraphQL`) show missing competencies.
4. **Skill-Gap Analytics**:
   - Switch to the **Skill Gap** tab (`GET /jobs/{id}/skill-gap`) to show applicant talent pool coverage versus required skills.

---

## Step 4: 5-Stage Kanban Pipeline & Guardrails (45 Seconds)
1. **Navigate to Pipeline**: Click **Pipeline** in the sidebar (`/app/pipeline`).
2. **Verify 5 Stages**:
   - Exactly 5 Kanban columns: **Applied**, **Shortlisted**, **Interview**, **Offer**, **Rejected**.
   - Cards display embedded candidate summaries (name, college, location, CGPA, skills).
3. **Test Transition Validation & Snap-Back**:
   - Drag a candidate card from **Applied** directly to **Offer** (illegal direct jump):
     - The card snaps back immediately to Applied.
     - A toast notification displays the server rejection rule: *"Illegal transition: Cannot move directly from applied to offer. Candidate must complete Interview stage."*
   - Drag candidate card from **Applied** to **Shortlisted** (valid transition):
     - Card smoothly drops into the Shortlisted column and persists.

---

## Step 5: Side-by-Side Compare & Bonus Superpowers (40 Seconds)
1. **Side-by-Side Compare**:
   - Navigate to **Compare** (`/app/compare`) or select 2–3 candidates in Candidates Directory.
   - Shows category winner badges (**Best Fit**, **Top Academic**, **Highest Exp**) and HireSwift AI recommendation.
   - Show that selecting a 4th candidate is blocked with an alert (enforcing strict 2–3 comparison limits).
2. **Duplicate Detection**:
   - Navigate to **Duplicates** (`/app/duplicates`).
   - Displays detected duplicate groups with signal types (`exact_copy`, `fuzzy_name_same_phone`, `same_email_other_format`).
   - Side-by-side diff viewer with 1-click merge, dismiss, or keep both.
3. **Bulk Email Outreach**:
   - Navigate to **Emails** (`/app/emails`).
   - Review personalized candidate outreach with variable interpolation (`{{candidate_name}}`, `{{job_title}}`).

---

## Quick Reset for Fresh Testing
To reset local UI state at any time:
- In DevTools console:
  ```js
  localStorage.clear(); location.reload();
  ```
