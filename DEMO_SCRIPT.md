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
   - Press `?` to open the Keyboard Shortcuts modal.

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

## Step 3: Multi-Mode Filters, Bulk Shortlist & Document Viewer (45 Seconds)
1. **Navigate to Candidates Directory (`/app/candidates`)**:
   - Point out the server-side page size selector (`12`, `25`, `50`, `100`) synced to URL search parameters.
2. **Demonstrate Tri-State Skill Filtering (AND / OR / NOT)**:
   - Click `React` chip once: turns **Emerald (AND)** (`skills_all=React`).
   - Click `Docker` chip twice: turns **Indigo (OR)** (`skills_any=Docker`).
   - Click `Java` chip three times: turns **Rose (NOT)** (`skills_none=Java`).
   - Observe debounced URL search parameters updating in real-time.
3. **Demonstrate Ground-Truth Query F09 & Saved Filters**:
   - Set **City**: `Noida`, **Required Skill**: `Python` (AND mode), **CGPA Min**: `7.5`, **Experience Min**: `2` years.
   - Point out the exact result: **5 candidates matched** (`C005`, `C011`, `C016`, `C022`, `C030`), proving deterministic server-driven filtering.
   - Click **"Save Filter"**: Give it a name (e.g. *"Noida Python Seniors"*). Observe the label *"Saved on this device only"*.
4. **Bulk Actions & Ground-Truth CSV Export**:
   - Check multiple candidates using table checkboxes.
   - In the sticky bulk action bar, select a target job requisition from the **job picker** dropdown.
   - Click **"Shortlist (X)"**: Fires concurrent `POST /applications/{id}/move` calls (concurrency 5) with a live progress indicator and toast reporting.
   - Click **"Export CSV"**: Exports directory up to 1,000 candidates with clean headers and empty cells for null/missing values (never invented `0` or `75`).
5. **Inspect Candidate Drawer & Original Resume Viewer**:
   - Click any candidate row to open the slide-over drawer.
   - Switch between **"Profile Overview"** and **"Resume Document"** tabs.
   - For PDF files: Renders embedded browser viewer (`<object>`).
   - For DOCX files: Renders prominent **Download Original** button with side-by-side parsed fields and amber extraction confidence indicators (< 0.7 or missing).
   - If file is missing on server: Displays clean notice: *"Original file not available on this server"*.

---

## Step 4: Jobs, Ranking, Custom Weights & Re-Match (30 Seconds)
1. **Navigate to Jobs (`/app/jobs`)**:
   - Click into an active requisition (e.g. *Full Stack Engineer*).
2. **Ranked Candidates (`/app/jobs/{id}`)**:
   - Candidates are ordered strictly descending by server match score.
   - Candidates satisfying hard filter criteria strictly outscore candidates who fail hard filters.
3. **Custom Scoring Weights**:
   - Adjust the weight sliders (Skills, Experience, Education, Semantic).
   - Sliders debounce (300ms) and pass `weights_skills`, `weights_experience`, etc., to the ranking endpoint.
   - If the backend omits `weights_applied`, the UI immediately displays a transparent notice: *"This server ignored custom weights; ranking is unchanged."*
4. **Talent Pool Re-Match**:
   - Click **"Re-match talent pool"**: Calls `POST /jobs/{id}/rematch` if present, or refetches ranking with notice: *"Ranking refreshed from the server"*.
5. **Skill Gap Tab**:
   - Switch to the **Skill Gap** tab (`GET /jobs/{id}/skill-gap`) to show applicant talent pool coverage vs. required skills.

---

## Step 5: Side-by-Side Candidate Comparison (25 Seconds)
1. **Navigate to Compare (`/app/compare`)**:
   - Displays 2 to 3 candidates side by side.
   - Highlights category winner badges (**Best Fit**, **Top Academic**, **Highest Exp**).
   - Point out **"Suggested from scores"** AI recommendation banner and the **Skill gap vs job** matrix row.
   - Demonstrate guardrails: Selecting a 4th candidate is blocked with a validation alert enforcing strict 2–3 comparison limits.

---

## Step 6: 5-Stage Kanban Pipeline & 8-Second Undo (30 Seconds)
1. **Navigate to Pipeline (`/app/pipeline`)**:
   - Exactly 5 Kanban columns: **Applied**, **Shortlisted**, **Interview**, **Offer**, **Rejected**.
   - Cards display embedded candidate summaries (name, college, location, CGPA, skills).
   - For high-volume columns, point out the 50-card display limit and the **"Show more (+50)"** pagination button.
2. **Test Transition Validation & Snap-Back**:
   - Drag a candidate card from **Applied** directly to **Offer** (illegal direct jump):
     - The card snaps back immediately to Applied with server error toast.
   - Move candidate card from **Applied** to **Shortlisted** (valid transition):
     - Card smoothly drops into Shortlisted.
     - An **8-second Undo toast** appears at the bottom.
     - Click **"Undo"**: Calls the server to revert the stage back to Applied.
3. **Export Shortlisted**:
   - Click **"Export Shortlisted"** to download a targeted CSV of candidates in the Shortlisted column.

---

## Step 7: Bulk Email to Shortlisted Candidates (25 Seconds)
1. **Navigate to Emails (`/app/emails`)**:
   - Automatically pre-selects candidates currently in the **Shortlisted** pipeline stage.
2. **Live Personalization Preview**:
   - Select the "Interview Invitation" or "Screening Invitation" template.
   - Show live per-recipient previews with variable interpolation (`{{candidate_name}}`, `{{job_title}}`, `{{date}}`).
3. **Dispatch & Fallback Actions**:
   - Click **"Send Emails to X Shortlisted Candidates"** to trigger confirmation modal and delivery audit log.
   - Show manual zero-dependency fallback actions: **Copy All Recipient Emails**, **Open in Mail Client** (BCC chunked into <=40 recipient batches), and **Export Shortlist CSV**.

---

## Step 8: Duplicate Detection & Merging (20 Seconds)
1. **Navigate to Duplicates (`/app/duplicates`)**:
   - Displays detected duplicate groups with signal types (`exact_copy`, `fuzzy_name_same_phone`, `same_email_other_format`, `same_email_updated_resume`).
2. **Diff & Resolution**:
   - Inspect side-by-side field differences between primary and duplicate profiles.
   - If merge endpoint exists: Click **"Merge into Primary"** to consolidate profiles.
   - If merge is disabled on backend: Notice banner displays *"Merge is not enabled on this server"*.
   - Local actions (**"Dismiss"**, **"Keep Both"**) carry the explicit label *"Saved on this device only"*.

---

## Step 9: Blind Recruitment Mode Across All Views (15 Seconds)
1. **Toggle Blind Mode in Top Bar**:
   - Click the **Blind Recruitment** toggle switch in the application header (or press keyboard shortcut).
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
