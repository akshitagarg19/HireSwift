# HireSwift ATS — Ready-to-Send Backend Integration Notes

> **To**: Akshita (Backend Lead)  
> **From**: Ayush (Senior Frontend Engineer)  
> **Date**: 2026-11-21  
> **Subject**: Frontend-Backend Contract Alignment, Edge-Case Handling & Proposed Endpoints  

---

## 1. Executive Summary
The frontend on branch `ayush/frontend` has been hardened for full live-mode operation (`VITE_USE_MOCK=false`). In live mode, **all data flows exclusively through `api.*` endpoints**; the Zustand store is restricted to ephemeral UI state (drawer open/close, blind recruitment masking, table row selections).

To ensure a seamless release demo, below are the specific contract items, proposed endpoints, and edge-case behaviors that require backend confirmation.

---

## 2. Issues & Edge Cases for Backend Verification

### Issue 1: Missing Match Scores & Category Breakdown
- **Severity**: Medium (Contract Resilience)
- **Request**: `GET /applications?job_id={job_id}` or `GET /jobs/{id}/ranking`
- **Expected Behavior**: When a candidate has not yet been matched or scored against a job, `match_score` should be `null` and `breakdown` should be omitted or `{ skills: null, experience: null, education: null, semantic: null }`.
- **Observed / Potential Issue**: Previously, some mock endpoints returned arbitrary default scores (e.g., `75`).
- **Frontend Handling**: The frontend renders `"-"` with an empty score ring and amber badge. It **never invents default scores**.

### Issue 2: Application ID Naming Conformance
- **Severity**: High (Pipeline Breaking)
- **Request**: `GET /applications`
- **Expected Schema**:
  ```json
  [
    {
      "application_id": "app-001",
      "candidate_id": "C001",
      "job_id": "job-101",
      "stage": "applied",
      "match_score": 92
    }
  ]
  ```
- **Observed / Potential Issue**: Returning `id` instead of `application_id`.
- **Frontend Handling**: Mapped in `src/api/applicationMapper.ts` with fallback support, but standardizing on `application_id` ensures consistency with `GET /jobs/{id}/ranking`.

### Issue 3: Stage Move Undo Transition (Reversal)
- **Severity**: Medium (Usability)
- **Request**: `POST /applications/{id}/move`
- **Payload**: `{"stage": "applied", "reason": "Undo stage move"}`
- **Observed Issue**: Strict forward-only state machines reject transitions from `shortlisted` back to `applied` with `400 Bad Request`.
- **Backend Action Requested**: Allow backward moves if the `reason` indicates an undo/revert action within an allowed grace window.

---

## 3. Proposed Endpoints (Full Details in `API.md` Section 7)

The following endpoints have been implemented in `src/api/client.ts` with fallback handling if the backend has not yet implemented them:

### Endpoint 1: Original Resume Document Streaming
- **Route**: `GET /candidates/{id}/resume`
- **Severity**: High (Recruiter Trust & Source Verification)
- **Expected Headers**: `Content-Type: application/pdf` (or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`) and `Content-Disposition: inline; filename="resume.pdf"`.
- **Fallback Behavior**: If 404, frontend displays: *"Original file not available on this server"*.

### Endpoint 2: Duplicate Candidate Merging
- **Route**: `POST /duplicates/{group_id}/merge`
- **Severity**: Medium (Talent Pool Cleanliness)
- **Payload**: `{"primary_candidate_id": "C001"}`
- **Response**: The merged candidate profile (`200 OK`).
- **Fallback Behavior**: If 404/405/501, frontend hides the "Merge" action and displays a notice banner: *"Merge is not enabled on this server"*. Local actions ("Dismiss", "Keep both") are labeled *"Saved on this device only"*.

### Endpoint 3: Interview Scorecard Submission
- **Route**: `POST /applications/{id}/scorecards`
- **Severity**: Medium (Recruiter Evaluation)
- **Payload**:
  ```json
  {
    "evaluator": "Lead Engineer",
    "technical_depth": 4,
    "problem_solving": 5,
    "communication": 4,
    "recommendation": "strong_hire",
    "notes": "Demonstrated deep knowledge of async Python and SQLite indexing."
  }
  ```
- **Fallback Behavior**: If endpoint returns 404/405, the evaluation is preserved in browser local storage labeled *"Saved on this device only"*.

### Endpoint 4: Custom Scoring Weights for Requisitions
- **Route**: `GET /jobs/{id}/ranking?weights_skills=0.4&weights_experience=0.25&weights_education=0.2&weights_semantic=0.15`
- **Severity**: Medium (Algorithm Customization)
- **Expected Response**: Ranking response containing a `weights_applied` object echoing the weights applied by the ranking engine.
- **Fallback Behavior**: If `weights_applied` is missing or mismatched, frontend displays a notice banner: *"This server ignored custom weights; ranking is unchanged."*

### Endpoint 5: Talent Pool Re-matching
- **Route**: `POST /jobs/{id}/rematch`
- **Severity**: Low
- **Expected Response**: `{"status": "queued" | "completed", "matched_count": 50}`
- **Fallback Behavior**: If endpoint returns 404, frontend refetches `GET /jobs/{id}/ranking` directly with toast: *"Ranking refreshed from the server"*.
