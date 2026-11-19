# HireSwift ATS — Evaluator Demo Script (< 4 Minutes)

This script walks through the end-to-end recruitment lifecycle on HireSwift in under 4 minutes. HireSwift is pre-seeded with realistic Indian engineering talent and connects directly to the FastAPI backend contract specified in `API.md`.

---

## Prerequisites & Launch
1. Ensure the web application is running:
   ```bash
   npm run dev
   # Open browser at http://localhost:5173
   ```
2. Navigate directly to `http://localhost:5173/app/jobs`.

---

## Step 1: View & Create a Job (45 Seconds)
1. **Navigate to Jobs**: Click **Jobs** in the left sidebar (`/app/jobs`).
   - Notice existing openings: *Senior Full Stack Engineer*, *Backend Python Engineer*, *Campus Trainee 2024*.
2. **Create or Inspect a Job**:
   - Click **"Create Job"** (`/app/jobs/new`).
   - Paste or review job description text.
   - Click **"Parse JD & Configure"** to see automatic extraction of Required Skills (`React`, `TypeScript`, `Node.js`, `Docker`) and cutoffs.
   - Click on **"Senior Full Stack Engineer"** to open its detail page (`/app/jobs/job-fs-01`).
   - Toggle **"Edit Requirements"** in the top-right to adjust scoring weights or required skills, then click **"Save Requirements"** (triggers `PATCH /jobs/{id}`).

---

## Step 2: Upload Resume Batch with Client Validation (45 Seconds)
1. **Navigate to Upload**: Click **Upload Resumes** in the sidebar (`/app/upload`).
2. **Test Ingestion & Parsing**:
   - Notice target job selector set to *Senior Full Stack Engineer*.
   - Click **"Simulate 5 Resumes"** (or drag & drop `.txt`/`.pdf`/`.docx` files from `test-data/resumes/`).
   - Notice client-side file validation strictly restricting files to PDF/DOCX under 10MB.
   - Click **"Parse All Queued Resumes"**.
   - Watch the animated progress bar poll `GET /batches/{id}/progress` until completion (100%).
   - If test files contain corrupted formatting, observe the **Failed Files** alert with specific rejection reasons.
   - Click the green **"View Ranked Candidates →"** CTA button that appears upon batch completion.

---

## Step 3: Inspect AI Match Ranking & Score Breakdown (45 Seconds)
1. On the **Ranked Candidates** tab (`/app/jobs/job-fs-01`):
   - Candidates are sorted strictly descending by `match_score` from `GET /jobs/{id}/ranking`.
   - Top candidates display a visual **ScoreRing** and breakdown progress bars across Skills, Experience, Education, and Semantic fit.
2. **Examine Explainability**:
   - Click on the **Breakdown Popover** (`matched X/Y`) next to the score.
   - Review the green chips with checkmarks (`✓ React`, `✓ TypeScript`, `✓ Docker`) and red chips with crosses (`✕ GraphQL`) showing transparent matching logic without hallucinated client scores.
3. **Inspect Skill Gap & Pipeline Funnel**:
   - View the **Skill Coverage Chart** (`GET /jobs/{id}/skill-gap`) displaying talent pool coverage for each requirement.
   - Verify the **Pipeline Funnel** numbers match the candidate stages in the table.

---

## Step 4: Multi-Mode Filters & Directory Search (45 Seconds)
1. **Navigate to Candidates Directory**: Click **Candidates** in the sidebar (`/app/candidates`).
2. **Try Tri-State Skill Chips (AND / OR / NOT)**:
   - Click the `React` skill chip once: turns **Emerald (AND)** (`skills_all=React`).
   - Click `Docker` chip twice: turns **Indigo (OR)** (`skills_any=Docker`).
   - Click `Java` chip three times: turns **Rose (NOT)** (`skills_none=Java`).
   - Observe URL search parameters updating in real-time (`?skills_all=React&skills_any=Docker&skills_none=Java`).
3. **Toggle Unknown Values & Highlights**:
   - Toggle **"Include Unknown"** switch (`include_unknown=true`).
   - Note amber badge highlights on rows with low parse confidence (<70%) or missing values.
   - Search `Aditi` in the debounced search box (300ms debounce).

---

## Step 5: Side-by-Side Comparison (Enforcing 2-3 Candidates) (30 Seconds)
1. Select 2 candidates using their row checkboxes (e.g. *Aditi Sharma* and *Priya Patel*).
2. Click **"Compare Selected (2)"** in the top action bar (`/app/compare?ids=...`).
3. Observe the side-by-side matrix:
   - **Best Fit**, **Top Academic**, **Highest Exp**, and **Most Coverage** badges highlight the winner of each row.
   - Notice the **HireSwift AI Top Pick** banner highlighting *Aditi Sharma* (94% Fit).
4. Try selecting a 4th candidate: notice the system blocks more than 3 candidates with an alert toast.
5. Click **"Shortlist Candidate"** directly from the top recommendation card.

---

## Step 6: 5-Stage Pipeline Kanban & Drag-and-Drop (30 Seconds)
1. **Navigate to Pipeline**: Click **Pipeline** in the sidebar (`/app/pipeline`).
2. **Verify 5 Stages**:
   - Exactly 5 columns are rendered: **Applied**, **Shortlisted**, **Interview**, **Offer**, **Rejected**.
3. **Test Transition Validation**:
   - Drag candidate card from **Applied** to **Offer** (illegal transition):
     - The card snaps back immediately.
     - A toast notification displays the server validation rule: `"Illegal transition: Cannot move directly from applied to offer. Candidate must complete Interview stage."`
   - Move candidate card from **Applied** to **Shortlisted** (valid transition) via drag-and-drop or using the **"Move to"** dropdown button on the card.
   - Card smoothly drops into the Shortlisted column and persists on browser reload.

---

## Quick Reset for Fresh Testing
To reset the entire talent pool and reload the 50-candidate benchmark dataset at any time:
- In `/app/upload`, click **"⚡ Load 50 Test Candidates"**, or run in the DevTools console:
  ```js
  localStorage.clear(); location.reload();
  ```
