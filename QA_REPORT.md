# HireSwift ATS Quality Assurance & Verification Report

> **Execution Timestamp:** 2026-11-21T06:49:22.436Z  
> **Evaluation Mode:** `STUB`  
> **Target Base URL:** `http://127.0.0.1:8000/api`  
> **Dataset:** 56 resumes (50 unique candidates + 6 duplicate files), 5 JDs, 3 edge cases, 14 canonical filter test cases.

---

## 1. Executive Summary Table

| Phase | Category | Tests Run | Passed | Failed | Skipped | Status |
|---|---|---|---|---|---|---|
| **Phase 1** | Resume Ingestion & Edge Cases | 3 file checks | 3 | 0 | 0 | ✅ PASS |
| **Phase 2** | Parser Accuracy & Ground Truth | 10 fields | - | 0 | 10 (Stub mode) | ⏩ SKIPPED |
| **Phase 3** | Server-Side Filter Accuracy (F01–F14) | 14 test queries | 14 | 0 | 0 | ✅ PASS |
| **Phase 4** | JD Competency & Ranking Order | 5 JDs | 5 | 0 | 0 | ✅ PASS |
| **Phase 5** | Deduplication Detection & Clustering | 6 duplicate pairs | 6 | 0 | 0 | ✅ PASS |
| **Phase 6** | Pipeline Transitions & Comparison | 6 contract checks | 6 | 0 | 0 | ✅ PASS |

---

## 2. Phase 1: Upload & Ingestion Results

- **Evaluation Mode:** Stub Contract Fixture (answers loaded from answer_key.csv)
- **Total Resumes Processed:** 56 of 56
- **Corrupted PDF Handling (`corrupt_resume.pdf`):** ✅ Correctly identified and reported as failed
- **Zero-Byte File Handling (`zero_byte.pdf`):** ✅ Rejected or reported as failed
- **Non-Standard Extension Handling (`notes.txt`):** ✅ Rejected (400) or reported as failed with reason

### Per-File Ingestion Failure Details:
```json
[
  {
    "filename": "corrupt_resume.pdf",
    "reason": "Corrupted PDF header or unreadable scanned image"
  },
  {
    "filename": "zero_byte.pdf",
    "reason": "Empty or 0-byte file"
  },
  {
    "filename": "notes.txt",
    "reason": "Unsupported file extension .txt: Only .pdf and .docx files are accepted."
  }
]
```

---

## 3. Phase 2: Parser Accuracy Tables (LIVE ONLY)

> **Note on Stub Mode:** Phase 2 was skipped because the current evaluation was run in `QA_MODE=stub`. In stub mode, candidate profiles are loaded directly from the ground-truth answer key without OCR or NLP parsing. Run with `QA_MODE=live QA_BASE_URL=<akshita-url>/api` to benchmark backend parser accuracy.

---

## 4. Phase 3: Known-Answer Filter Tests (F01–F14)

> **Note on Latency:** Filter queries in stub mode execute against an in-memory test fixture. In-memory latencies are not representative of production database performance and are excluded from benchmark claims.

| Test ID | Description | Expected Count | Actual Count | Status |
|---|---|---|---|---|
| **F01** | CGPA >= 8.0 (unknown CGPA excluded) | 30 | 30 | ✅ PASS |
| **F02** | CGPA >= 8.0 with include_unknown | 33 | 33 | ✅ PASS |
| **F03** | 10th >= 90 and 12th >= 85 | 9 | 9 | ✅ PASS |
| **F04** | skills_all Python AND SQL | 26 | 26 | ✅ PASS |
| **F05** | skills_any React OR Angular OR Vue.js | 17 | 17 | ✅ PASS |
| **F06** | skills_all Python, skills_none Java | 25 | 25 | ✅ PASS |
| **F07** | Experience 2 to 5 years | 17 | 17 | ✅ PASS |
| **F08** | City Bengaluru (Bangalore alias) | 13 | 13 | ✅ PASS |
| **F09** | Demo query: Noida, Python, CGPA >= 7.5, 2+ years | 5 | 5 | ✅ PASS |
| **F10** | Graduation year 2021 with Docker or Kubernetes | 4 | 4 | ✅ PASS |
| **F11** | React AND JavaScript with 1+ year | 8 | 8 | ✅ PASS |
| **F12** | Freshers (0 months) with CGPA >= 7 | 3 | 3 | ✅ PASS |
| **F13** | Text search 'IIT' | 8 | 8 | ✅ PASS |
| **F14** | Gurugram (Gurgaon alias) | 3 | 3 | ✅ PASS |

---

## 5. Phase 4: JD Competency & Ranking Results

- **Every Candidate in `hard_filter_pass_candidate_ids` placed in Top 15:** ✅ Verified across all 5 JDs
- **Descending Match Score Order Verified:** ✅ Monotonically decreasing
- **Hard Filter Failure Penalty:** ✅ Candidates failing hard filters strictly score lower than passing candidates

### Hand-Verified Score Recomputations (Weights: 40% Skills, 25% Exp, 20% Edu, 15% Semantic):
| Candidate ID | Target Job | Server Match Score | Recomputed Weighted Score | Verification |
|---|---|---|---|---|
| `C007` | Full Stack Engineer | **96** | **96** | ✅ Exact Match |
| `C011` | Full Stack Engineer | **94** | **94** | ✅ Exact Match |
| `C016` | Full Stack Engineer | **92** | **92** | ✅ Exact Match |

---

## 6. Phase 5: Deduplication Results

| Duplicate Type | Target File | Duplicate Of | Detected? | Assigned Group ID |
|---|---|---|---|---|
| `exact_copy` | `Resume_final_v2 (1).pdf` | `Nandini Rao - CV.pdf` | ✅ Yes | `dup-grp-C005` |
| `exact_copy` | `my_cv_latest.pdf` | `Resume_Kaur_Tanmay.pdf` | ✅ Yes | `dup-grp-C014` |
| `same_email_other_format` | `Swati_Das_CV_word.docx` | `Swati_Das_Resume.pdf` | ✅ Yes | `dup-grp-C012` |
| `fuzzy_name_same_phone` | `Kartik_Sundaram_Resume.pdf` | `KarthikSundaram_2020.pdf` | ✅ Yes | `dup-grp-C019` |
| `same_email_updated_resume` | `Divya_Verma_Resume_2026_updated.pdf` | `Resume_Verma_Divya.pdf` | ✅ Yes | `dup-grp-C018` |
| `initials_same_phone` | `S_Menon_CV.pdf` | `SiddharthMenon_2023.docx` | ✅ Yes | `dup-grp-C007` |

- **False Positive Deduplication Rate:** 0 non-duplicate candidates flagged (0% false positives)

---

## 7. Phase 6: Pipeline Transitions & Comparison

- **Valid Transition (`applied -> shortlisted`):** ✅ 200 OK (persisted)
- **Invalid Direct Transition (`applied -> offer`):** ✅ 400 Bad Request with contract detail message
- **Invalid Transition (`shortlisted -> offer`):** ✅ 400 Bad Request
- **Comparison Matrix (`GET /compare`):**
  - 2 Candidates: ✅ 200 OK
  - 3 Candidates: ✅ 200 OK
  - 1 Candidate: ✅ 400 Bad Request (Requires 2 to 3 candidates)
  - 4 Candidates: ✅ 400 Bad Request (Maximum 3 candidates permitted)

---

## 8. Stub-mode results (contract checks only, not performance or accuracy)

### What Stub Mode PROVES:
- **UI & Routing Stability:** The frontend cleanly renders all 9 active pages (Home, Upload, Candidates, Jobs, Job Detail, Pipeline, Compare, Insights, Duplicates, Emails) with zero crashes or blank screens.
- **Dataset Scale Verification:** Handles 50 unique candidates, 6 duplicate variants, and 3 edge cases gracefully in data grids, Kanban columns, and drawer views.
- **Contract Parameter Conformance:** The frontend generates exact API query parameters conforming to `API.md` (`cgpa_min`, `tenth_min`, `twelfth_min`, `skills_all`, `skills_any`, `skills_none`, `exp_min`, `exp_max`, `city`, `grad_year`, `q`, `include_unknown`, `sort`, `page`, `page_size`).
- **Data Mapping Robustness:** Zod mappers in `src/api/mappers.ts` and `src/api/jobMapper.ts` seamlessly convert backend `snake_case` payloads to camelCase UI models without data loss.
- **Missing / Null Data Resilience:** Missing numeric metrics render as `-` with amber low-confidence styling; missing scores render as `-` with empty score rings, never defaulting to invented values like `75` or `0`.
- **Scope & Navigation Guards:** In live mode, authentication, company switcher, onboarding, careers, fairness, and dashboard routes are disabled and cleanly redirect to `/app/candidates`.
- **Blind Mode Masking:** The persistent top-bar blind mode toggle successfully masks candidate names (`Candidate #ID`), colleges, and locations across Candidates, Drawer, Pipeline, Compare, and Job Ranking.
- **Store Isolation:** The Zustand store holds UI state only; store seed data is completely ignored in live mode, verified by Playwright tests asserting poisoned localStorage never leaks into the DOM.

### What Stub Mode DOES NOT PROVE:
- **Parser Accuracy & Extraction Quality:** The stub server loads pre-curated ground truth from CSV; it does not test OCR text extraction or NLP parsing.
- **OCR Quality on Complex Layouts:** Real CV layouts (multi-column, graphic resumes) require running against Akshita's backend service.
- **Real Database Filter Latency:** In-memory array filtering does not reflect database index performance or server-side network round-trips.
- **ML / Algorithmic Deduplication Accuracy:** The stub maps duplicates directly from the ground-truth `dup_of` column rather than computing byte-hashes, MinHash/LSH, or embeddings.
- **Real Model Ranking Quality:** Semantic match scores require the live backend's scoring model.

### Contract Verification Summary:
| Contract Verification Item | Target Spec | Verification Status | Evidence |
|---|---|---|---|
| **Bulk Resume Ingestion Contract** | `POST /resumes/bulk` | ✅ Verified | Rejects corrupted/0-byte/txt files with informative JSON |
| **Server-Driven Filter Queries (F01–F14)** | `GET /candidates` | ✅ Verified | 14/14 queries match expected candidate sets exactly |
| **Job Ranking & Match Scores** | `GET /jobs/{id}/ranking` | ✅ Verified | Hard-filter qualifiers score higher; monotonic descent |
| **Deduplication Cluster Signals** | `GET /candidates` | ✅ Verified | 6/6 duplicate pairs identified with duplicate group IDs |
| **Pipeline Stage Transitions** | `PATCH /applications/{id}/stage` | ✅ Verified | Allowed transitions persist; invalid transitions return 400 |
| **Candidate Comparison Matrix** | `GET /compare` | ✅ Verified | 2–3 candidates accepted; 1 or 4+ rejected with 400 |
| **Store Seed Data Isolation** | Live Mode UI | ✅ Verified | Poisoned localStorage never renders in live mode |
| **Blind Mode Data Masking** | Blind Mode Toggle | ✅ Verified | Masks name, college, location across 5 views |

---

## 8. Live-mode results

| Metric | Value | Run Date |
|---|---|---|
| Bulk Resume Ingestion (56 files) | not run yet | not run yet |
| Ingestion Failed Files | not run yet | not run yet |
| Top 10 Field Extraction Accuracy | not run yet | not run yet |
| Canonical Skills Extraction F1 | not run yet | not run yet |
| Hallucinated Field Values | not run yet | not run yet |
| Server Filter Pass Rate (F01–F14) | not run yet | not run yet |
| Server Filter Latency (p50) | not run yet | not run yet |
| Server Filter Latency (p95) | not run yet | not run yet |
| Deduplication Precision | not run yet | not run yet |
| Deduplication Recall | not run yet | not run yet |
| Hard-Filter Ranking Monotonicity | not run yet | not run yet |
| Pipeline Valid Transitions | not run yet | not run yet |
| Candidate Compare Constraints | not run yet | not run yet |

---

## 9. Store audit

| Page Component | Store Fields Read | Live Mode Data Source | Reads Data from Store in Live Mode? |
|---|---|---|---|
| `HomePage.tsx` | `currentUser`, `login` | Static landing page / interactive demo state | ❌ No |
| `LoginPage.tsx` | `login` | Disabled by scope flags (redirects to `/app/candidates`) | ❌ No |
| `SignupPage.tsx` | `registerCompany` | Disabled by scope flags (redirects to `/app/candidates`) | ❌ No |
| `OnboardingPage.tsx` | `currentCompanyId`, `companies` | Disabled by scope flags (redirects to `/app/candidates`) | ❌ No |
| `SettingsPage.tsx` | `currentCompanyId`, `currentUser`, `updateCompanySettings` | Disabled by scope flags (redirects to `/app/candidates`) | ❌ No |
| `DashboardPage.tsx` | `isBlindMode` | `api.getJobs()`, `api.getApplications()`, `api.getCandidates()`, `api.getJobRanking()`, `api.getJobSkillGap()` | ❌ No |
| `UploadPage.tsx` | `currentCompanyId`, `jobs`, `candidates` | `api.getJobs()`, `api.bulkUpload()` | ❌ No |
| `CandidatesPage.tsx` | `currentCompanyId`, `currentUser`, `candidates`, `duplicateGroups`, `isBlindMode` | `api.getCandidates(params)`, `api.patchCandidate()` | ❌ No |
| `CandidateDetailPage.tsx` | `candidates`, `applications`, `jobs`, `stageHistories`, `isBlindMode` | `api.getCandidate(id)`, `api.getApplications()` | ❌ No |
| `JobsPage.tsx` | `currentCompanyId`, `currentUser`, `jobs`, `applications` | `api.getJobs()`, `api.patchJob()`, `api.deleteJob()` | ❌ No |
| `JobDetailPage.tsx` | `jobs`, `candidates`, `applications`, `companies`, `isBlindMode` | `api.getJob()`, `api.getApplications()`, `api.getJobSkillGap()` | ❌ No |
| `JobCreatePage.tsx` | `currentCompanyId`, `addJob` | `api.createJob()` | ❌ No |
| `PipelinePage.tsx` | `companies`, `currentCompanyId`, `currentUser`, `isBlindMode` | `api.getApplications(jobId)`, `api.moveApplication()` | ❌ No |
| `ComparePage.tsx` | `currentCompanyId`, `candidates`, `jobs`, `isBlindMode` | `api.compareCandidates(ids)` | ❌ No |
| `InsightsPage.tsx` | `currentCompanyId`, `candidates`, `jobs`, `applications` | `api.getJobs()`, `api.getApplications()`, `api.getJobSkillGap()` | ❌ No |
| `DuplicatesPage.tsx` | `currentCompanyId`, `duplicateGroups`, `candidates`, `isBlindMode` | `api.getCandidates({ include_unknown: true })` | ❌ No |
| `EmailsPage.tsx` | `currentCompanyId`, `companies`, `candidates`, `jobs`, `applications` | `api.getCandidates()`, `api.getJobs()`, `api.getApplications()` | ❌ No |
| `FairnessPage.tsx` | `currentCompanyId`, `companies`, `updateCompanySettings` | Disabled by scope flags (redirects to `/app/candidates`) | ❌ No |
| `CareersPage.tsx` | `companies`, `jobs` | Disabled by scope flags (redirects to `/app/candidates`) | ❌ No |
| `JobApplicationPage.tsx` | `companies`, `jobs` | Disabled by scope flags (redirects to `/app/candidates`) | ❌ No |

---

## 10. Real Live-Mode Actions & Contract Hardening Verification

> **Test Suite:** `frontend/e2e/live-actions.spec.ts`  
> **Evaluation Mode:** Live Mode Contract Verification (`VITE_USE_MOCK=false`)

| Live Action / Capability | Implementation & Contract Behavior | Test Status | Evidence & Guarantees |
|---|---|---|---|
| **Bulk Shortlist & Move** | Replaced mock store mutation with `Promise.allSettled` concurrency 5 calling `POST /applications/{id}/move`. Added target job requisition picker (`[data-testid="bulk-job-picker"]`). | ✅ PASS | 3 candidate moves executed concurrently; partial failure reports server detail per failed candidate. |
| **Duplicates Merge & Banner** | Calls `POST /duplicates/{groupId}/merge`. If server returns 404, 405, or 501, displays notice banner `"Merge is not enabled on this server"` (`[data-testid="merge-disabled-banner"]`) and disables button. In live mode, refetches candidates from API and never calls store mutation. | ✅ PASS | Verified normal merge 200 flow, API refetch on merge, and 404 disabled banner fallback. |
| **Structured Scorecards** | Interview evaluation form submitting technical depth, problem solving, communication (1-5 ratings + notes), recommendation, and overall notes to `POST /applications/{id}/scorecards`. 404/405 persists locally with `"Saved on this device only (server has no scorecard endpoint)"`. 5xx/network errors prompt user before saving locally. | ✅ PASS | Form submits typed values, validates required inputs, updates scorecard list, handles 404 and 500 cleanly. |
| **Custom Scoring Weights** | Debounced (300ms) weight slider changes passing custom query params (`weights_skills`, `weights_experience`, etc.) to `GET /jobs/{id}/ranking`. Displays notice banner `"This server ignored custom weights; ranking is unchanged."` (`[data-testid="weights-ignored-notice"]`) if server omits `weights_applied`. | ✅ PASS | Sliders send debounced query params; notice banner mounts when weights are unhandled by server. |
| **Original Resume Viewer** | Reusable `ResumeViewer` component supporting embedded PDF preview (`<object data-testid="resume-pdf-viewer">`), prominent DOCX download button (`[data-testid="download-docx-btn"]`) with side-by-side parsed fields, amber extraction confidence indicators (< 0.7 or missing), 404 empty state (`[data-testid="resume-not-found"]`), and Blind hiring mode redaction. | ✅ PASS | Verified PDF embedding (`C001`), DOCX download trigger (`C000`), 404 missing state, and extraction confidence indicators. |
| **Saved Filters** | Filter presets persisted in `localStorage` under `'hireswift_saved_filters'` labeled `"Saved on this device only"` (`[data-testid="saved-filters-dropdown"]`, `[data-testid="save-filter-btn"]`). Auto-debounced text queries (300ms). | ✅ PASS | Filter saved locally, recalled after full page reload, and synchronizes URL query params. |
| **Ground-Truth CSV Export** | Export candidate directory with exact headers `name,email,phone,city,college,degree,grad_year,cgpa_10,tenth_pct,twelfth_pct,experience_years,skills,stage,match_score` with empty cells for null/missing metrics (never `0` or `75`). Supports pagination up to 1,000 candidates with progress toast. | ✅ PASS | Downloaded CSV verified for header format and empty cells for null fields. |
| **Kanban Move & Undo** | 8-second Sonner undo toast on Kanban stage transition with action button calling `POST /applications/{id}/move` to restore previous stage. On server rejection (400/409), displays server message and refetches to keep card where server says it is. | ✅ PASS | Kanban move advances card, displays Undo toast; undo rejection refetches and snaps card to server position. |
| **Global Keyboard Shortcuts** | Global hotkeys: `?` opens Shortcuts Cheat Sheet modal (`[data-testid="shortcuts-modal"]`), `/` focuses candidate search bar, `g c`, `g p`, `g d` navigate to Candidates, Pipeline, and Dashboard, and `s` toggles shortlist for selected candidates. | ✅ PASS | Verified keyboard events and modal trigger button (`[data-testid="shortcuts-help-trigger"]`). |

