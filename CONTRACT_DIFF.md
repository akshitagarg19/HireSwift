# HireSwift ATS — API Contract Diff & Alignment Matrix

> **Author**: Ayush (Senior Frontend Engineer)  
> **Evaluation Mode**: Hybrid (Contract Fixture `stub-server.mjs` Verified; Live Backend Pending `QA_BASE_URL`)  
> **Last Updated**: 2026-11-21  
> **Target Spec**: `API.md`  

---

## 1. Overview
This document tracks all schema, endpoint, and payload differences between the frontend expectations, the formal specification in `API.md`, and the backend implementation.

In live mode (`VITE_USE_MOCK=false`), the frontend strictly consumes backend REST APIs via validated Zod schemas and mappers. No invented values or fallback store datasets are permitted.

---

## 2. Contract Mismatch & Alignment Table

| Endpoint | Field / Attribute | `API.md` Specification | Backend / Initial Behavior | UI Impact | Frontend Fix Applied? |
|---|---|---|---|---|---|
| `GET /applications` | Identifier key | `application_id: string` | Previously returned `id: string` | Stage transitions and Kanban moves failed if ID mismatch | ✅ **Yes**: Mapper accepts both `application_id` (primary) and `id` (fallback) in `src/api/applicationMapper.ts`. |
| `GET /applications`, `GET /jobs/{id}/ranking` | Missing match score | `match_score: number \| null` | Omitted or returned null for unscored candidates | Score ring rendered NaN or defaulted to arbitrary `75` | ✅ **Yes**: Strict null rendering. Unscored shows `"-"` with empty score ring. |
| `GET /applications`, `GET /jobs/{id}/ranking` | Missing category breakdown | `breakdown?: { skills, experience, education, semantic }` | Omitted or null | Category bars crashed or defaulted to arbitrary scores | ✅ **Yes**: Mappers preserve undefined. UI displays amber `"-"` indicators; no invented breakdown numbers. |
| `GET /jobs`, `GET /jobs/{id}` | Job fields naming | Snake_case schema (`jd_text`, `required_skills`, `min_experience`, `min_cgpa`, `grad_years`, `applicant_count`) | Mixed camelCase / snake_case | Job detail and ranking page failed schema validation | ✅ **Yes**: Added `src/api/jobMapper.ts` with bidirectional Zod schema and conversion. |
| `POST /resumes/bulk` | Job association | `job_id?: string` optional form field | Resumes ingested only into global talent pool | Candidates uploaded without job context could not be ranked for requisition | ✅ **Yes**: Upload page sends `job_id` when job is selected in dropdown. |
| `GET /jobs/{id}/ranking` | Custom weight queries | Query parameters: `weights_skills`, `weights_experience`, `weights_education`, `weights_semantic` | Ignored query parameters | Sliders moved without ranking changes, misleading recruiter | ✅ **Yes**: Added debounce (300ms) and `[data-testid="weights-ignored-notice"]` banner if response lacks matching `weights_applied`. |
| `POST /applications/{id}/scorecards` | Scorecard persistence | Endpoint accepting structured 1–5 criteria, notes, recommendation | Missing endpoint (404 / 405) | Interview feedback lost across refreshes | ✅ **Yes**: Proposed in `API.md` Section 7. Frontend tries API first; if unavailable, stores locally with explicit `"Saved on this device only"` badge. |
| `POST /duplicates/{group_id}/merge` | Duplicate resolution | Endpoint accepting `{ primary_candidate_id: string }` | Missing endpoint (404 / 405 / 501) | Merge button failed with unhandled error | ✅ **Yes**: Proposed in `API.md` Section 7. Frontend detects 404/405/501, hides Merge button, and renders `"Merge is not enabled on this server"` banner. |
| `GET /candidates/{id}/resume` | Raw document streaming | Stream original PDF (`application/pdf`) or DOCX | Missing endpoint (404) | Recruiter could only inspect parsed fields, cannot verify source | ✅ **Yes**: Proposed in `API.md` Section 7. Frontend checks `HEAD`/`GET`. If 404, shows `"Original file not available on this server"`. If PDF, renders `<object>`; if DOCX, offers download. |
| `POST /jobs/{id}/rematch` | Talent pool re-evaluation | Endpoint triggering re-scoring across pool | Missing endpoint (404) | Recruiter button simulated fake progress via `setTimeout` | ✅ **Yes**: Removed fake timeout. Calls API endpoint if present, else refetches ranking directly with notification `"Ranking refreshed from the server"`. |
| `POST /applications/{id}/move` | Kanban Undo reversal | Reverting stage from `shortlisted` to `applied` | Strict forward-only validator returned `400 Bad Request` | 8-second Undo toast crashed on stage reversal | ✅ **Yes**: Added `reason: "undo"` check in contract and stub server to permit valid backward transitions during recruiter Undo actions. |

---

## 3. Ground Truth Data Integrity Rule
- Test dataset answer keys (`test-data/answer_key.csv`, `filter_tests.csv`, `jd_answer_key.csv`) were **NEVER modified** to accommodate frontend or backend deviations.
- Missing values in test data remain empty and render cleanly as `"-"` with amber styling across all pages.
- Zero invented numbers (no default 75s, 0s, or placeholder strings).
