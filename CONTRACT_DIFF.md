# HireSwift ATS — API Contract Diff & Alignment Matrix

# No live backend run has been done yet.

> **Status**: Awaiting live backend URL (`QA_BASE_URL`). No live backend run has been done yet.  
> **Source Classifications**:
> 1. `Observed on live backend` — backed strictly by verified runs in `qa/results-live.json` (None yet).
> 2. `Observed on stub (frontend fixture)` — verified against `frontend/tools/stub-server.mjs`.
> 3. `Request to backend` — requested contract shape or proposed endpoint for backend alignment.

---

## 1. Contract & Spec Alignment Table

| Endpoint / Capability | Field / Aspect | `API.md` Specification | Source / Classification | Frontend Implementation & Handling |
|---|---|---|---|---|
| `GET /applications` | Identifier key | `application_id: string` | Observed on stub (frontend fixture) | Frontend mapper accepts `application_id` (primary) with fallback to `id` in `src/api/applicationMapper.ts`. |
| `GET /applications`, `GET /jobs/{id}/ranking` | Unscored match score | `match_score: number \| null` | Request to backend | Null or missing match score renders as `"-"` with empty score ring. Never defaults to an invented score (e.g. `75` or `0`). |
| `GET /applications`, `GET /jobs/{id}/ranking` | Category breakdown | `breakdown?: { skills, experience, education, semantic }` | Request to backend | Missing breakdown fields render with amber `"-"` indicators; no default numbers are generated. |
| `GET /jobs`, `GET /jobs/{id}` | Job schema naming | Snake_case schema (`jd_text`, `required_skills`, `min_experience`, `min_cgpa`, `grad_years`, `applicant_count`) | Request to backend | Frontend uses `src/api/jobMapper.ts` with bidirectional Zod schema validation to map between snake_case and UI camelCase. |
| `POST /resumes/bulk` | Job association | `job_id?: string` optional form field | Request to backend | Upload page sends `job_id` when an active job is selected in the dropdown. |
| `GET /jobs/{id}/ranking` | Custom weight queries | Query parameters: `weights_skills`, `weights_experience`, `weights_education`, `weights_semantic` | Request to backend | Debounced (300ms) weight slider changes pass query parameters. If response lacks matching `weights_applied`, UI renders notice banner: *"This server ignored custom weights; ranking is unchanged."* |
| `POST /duplicates/{group_id}/merge` | Duplicate merge endpoint | Body: `{ primary_candidate_id: string }` returning merged candidate | Request to backend | Supported in stub server. In live mode, if server returns 404/405/501, UI hides Merge button and displays notice banner: *"Merge is not enabled on this server"*. |
| `POST /applications/{id}/scorecards` | Scorecard submission | Structured ratings (1–5) and feedback notes per criterion | Request to backend | Supported in stub server. In live mode, if endpoint returns 404/405, persists locally labeled *"Saved on this device only (server has no scorecard endpoint)"*. On 5xx/network errors, prompts user. |
| `GET /candidates/{id}/resume` | Original document streaming | Stream PDF (`application/pdf`) or DOCX inline | Request to backend | Supported in stub server. If endpoint returns 404, UI displays: *"Original file not available on this server"*. For PDF, embeds `<object>`; for DOCX, provides download button with parsed fields side by side. |
| `POST /jobs/{id}/rematch` | Talent pool re-evaluation | Re-computes scores across candidate pool | Request to backend | Supported in stub server. If endpoint returns 404, frontend refetches `GET /jobs/{id}/ranking` directly with notice: *"Ranking refreshed from the server"*. |
| `POST /applications/{id}/move` | Stage move & Undo | Body: `{ stage: string, reason?: string }` | Observed on stub (frontend fixture) | When `reason: "undo"`, stub permits backward moves. If server rejects backward move (400/409), card snaps back to server state via refetch. |

---

## 2. Live Backend Benchmark Status
- **Observed on live backend**: None yet.
- A live run against Akshita's URL will be recorded here and in `qa/results-live.json` once `QA_BASE_URL` is available.
