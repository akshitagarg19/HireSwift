# HireSwift ATS — Requests for Backend Integration

# No live backend run has been done yet.

> **To**: Akshita (Backend Lead)  
> **From**: Ayush (Senior Frontend Engineer)  
> **Date**: 2026-11-21  
> **Status**: Ready for live integration. No live backend run has been done yet.  

---

## 1. Summary of Proposed Endpoints & Behaviors

| Feature / Endpoint | Method & Path | Needed for Demo? | Fallback If Missing |
|---|---|---|---|
| **Resume Document Streaming** | `GET /candidates/{id}/resume` | **Yes** (Trust & Verification) | Displays *"Original file not available on this server"*. |
| **Duplicate Merging** | `POST /duplicates/{group_id}/merge` | **No** (Optional Superpower) | Displays *"Merge is not enabled on this server"*; keeps local dismiss/keep. |
| **Interview Scorecards** | `POST /applications/{id}/scorecards` | **No** (Nice to Have) | Displays *"Saved on this device only (server has no scorecard endpoint)"*. |
| **Custom Scoring Weights** | `GET /jobs/{id}/ranking?weights_*` | **No** (Nice to Have) | Echoes `weights_applied`. If missing, shows notice that custom weights were ignored. |
| **Talent Pool Re-Match** | `POST /jobs/{id}/rematch` | **No** (Nice to Have) | Falls back to `GET /jobs/{id}/ranking` refetch. |
| **Kanban Undo Transitions** | `POST /applications/{id}/move` (reversal) | **Yes** (Pipeline Usability) | If rejected with 400/409, frontend snaps card back to server position. |

---

## 2. Request & Response Specifications

### 1. Resume Document Streaming
- **Route**: `GET /candidates/{id}/resume`
- **Needed for Demo**: **Yes**
- **Description**: Streams the original uploaded resume file (`.pdf` or `.docx`) for candidate document verification in the slide-over drawer and detail page.
- **Request**: `GET /candidates/C001/resume`
- **Response**: `200 OK`
  - `Content-Type: application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `Content-Disposition: inline; filename="Aarav_Sharma_Resume.pdf"`
- **Missing Response**: `404 Not Found`
  ```json
  { "detail": "Original file not available on this server" }
  ```

---

### 2. Duplicate Candidate Merging
- **Route**: `POST /duplicates/{group_id}/merge`
- **Needed for Demo**: **No** (Superpower bonus)
- **Description**: Consolidates secondary candidate profiles in a duplicate cluster into a designated primary profile.
- **Request Body**:
  ```json
  {
    "primary_candidate_id": "C005"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "candidate": {
      "id": "C005",
      "name": "Nandini Rao",
      "email": "nandini.rao@outlook.com",
      "phone": "+91 9876543210",
      "location": "Bengaluru",
      "college": "RV College of Engineering",
      "is_duplicate": false,
      "duplicate_group_id": null
    },
    "merged_candidate_ids": ["C005_dup"]
  }
  ```
- **Fallback**: If `404`, `405`, or `501`, frontend hides the Merge button and renders notice banner: *"Merge is not enabled on this server"*.

---

### 3. Interview Scorecard Submission
- **Route**: `POST /applications/{id}/scorecards`
- **Needed for Demo**: **No** (Nice to have)
- **Description**: Submits structured evaluator ratings and notes for an application.
- **Request Body**:
  ```json
  {
    "interviewer_name": "Technical Evaluator",
    "recommendation": "Yes",
    "technical_depth": {
      "rating": 4,
      "notes": "Solid understanding of distributed systems and database indexing."
    },
    "problem_solving": {
      "rating": 5,
      "notes": "Solved dynamic programming problem with optimal space complexity."
    },
    "communication": {
      "rating": 4,
      "notes": "Clear explanations."
    },
    "notes": "Strong candidate for backend engineering role."
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "id": "sc-1700000001",
    "application_id": "app-C001",
    "interviewer_name": "Technical Evaluator",
    "recommendation": "Yes",
    "technical_depth": { "rating": 4, "notes": "Solid understanding..." },
    "problem_solving": { "rating": 5, "notes": "Solved dynamic programming..." },
    "communication": { "rating": 4, "notes": "Clear explanations." },
    "notes": "Strong candidate for backend engineering role.",
    "created_at": "2026-11-21T04:30:00Z"
  }
  ```
- **Fallback**: If `404` or `405`, frontend stores evaluation locally with badge *"Saved on this device only (server has no scorecard endpoint)"*.

---

### 4. Custom Scoring Weights
- **Route**: `GET /jobs/{id}/ranking?weights_skills=0.4&weights_experience=0.25&weights_education=0.2&weights_semantic=0.15`
- **Needed for Demo**: **No** (Nice to have)
- **Description**: Re-ranks candidates against custom dimensional weights.
- **Response**: `200 OK`
  ```json
  {
    "job_id": "job-101",
    "weights_applied": {
      "skills": 0.4,
      "experience": 0.25,
      "education": 0.2,
      "semantic": 0.15
    },
    "candidates": [ ... ]
  }
  ```
- **Fallback**: If `weights_applied` is absent or does not match, frontend displays notice: *"This server ignored custom weights; ranking is unchanged."*

---

### 5. Talent Pool Re-Match
- **Route**: `POST /jobs/{id}/rematch`
- **Needed for Demo**: **No** (Nice to have)
- **Description**: Triggers background or synchronous semantic re-matching across the talent pool.
- **Response**: `200 OK`
  ```json
  {
    "job_id": "job-101",
    "total_ranked": 50,
    "status": "complete",
    "recomputed_at": "2026-11-21T04:30:00Z"
  }
  ```
- **Fallback**: If 404, frontend refetches `GET /jobs/{id}/ranking` directly with notice: *"Ranking refreshed from the server"*.

---

### 6. Kanban Undo Transitions (Stage Reversal)
- **Route**: `POST /applications/{id}/move`
- **Needed for Demo**: **Yes**
- **Description**: Allows moving a card backward within 8 seconds when the recruiter clicks "Undo".
- **Request Body**:
  ```json
  {
    "stage": "applied",
    "reason": "Undo Kanban move"
  }
  ```
- **Behavior**: Allow backward transition (e.g. `shortlisted` -> `applied`) if `reason` indicates an undo. If rejected with `400` or `409`, frontend displays server error and keeps card at server stage.

---

## 3. Transitions to Confirm (API.md vs. Stub Server)

Below is a comparison of pipeline stage transitions between `API.md` (Section 5) and the local stub server fixture (`frontend/tools/stub-server.mjs`), with questions and differences to align upon for the live FastAPI backend:

### Comparison Table

| Current Stage | API.md Allowed Transitions | Stub Server Default (`validTransitions`) | Stub Server with `Undo` reason | Status / Agreement |
|---|---|---|---|---|
| **`applied`** | `shortlisted`, `rejected` | `shortlisted`, `rejected` | `shortlisted`, `rejected` | ✅ Identical |
| **`shortlisted`** | `interview`, `rejected` | `interview`, `rejected` | `interview`, `rejected`, **`applied`** | ⚠️ Reverting to `applied` allowed on Undo in stub, but rejected by API.md transition rules |
| **`interview`** | `offer`, `rejected` | `offer`, `rejected` | `offer`, `rejected`, **`shortlisted`**, **`applied`** | ⚠️ Reverting to `shortlisted` allowed on Undo in stub, but rejected by API.md transition rules |
| **`offer`** | `rejected`, `applied` (re-evaluation) | `rejected`, `applied` | Any stage | ⚠️ Both allow jumping all the way back to `applied`, but skip `interview` |
| **`rejected`** | `applied` (reopened) | `applied` | Any stage | ⚠️ Both allow reopening to `applied`, but skip `shortlisted` or `interview` |

### Differences & Questions to Confirm with Backend:

1. **`offer -> applied` (Re-evaluation vs. Demotion)**:
   - *Current Spec (API.md & Stub)*: Allows `offer -> applied` and `offer -> rejected`.
   - *Question for Backend*: If an offer is declined or revoked, should the candidate jump all the way back to `applied` (re-evaluation from scratch), or should moving back to `interview` also be allowed?
2. **`rejected -> applied` (Reopening Candidates)**:
   - *Current Spec (API.md & Stub)*: Allows `rejected -> applied` for reopening.
   - *Question for Backend*: Can a mistakenly rejected candidate be moved directly back to their prior stage (e.g. `rejected -> interview` or `rejected -> shortlisted`), or does reopening strictly reset them to `applied`?
3. **Backward "Undo" Transitions (`shortlisted -> applied`, `interview -> shortlisted`)**:
   - *Current Spec (API.md)*: Prohibits backward moves (`Invalid stage transition: Cannot jump directly...`).
   - *Stub Behavior*: When `reason` contains `"undo"` or `"revert"`, the stub permits the reversal unless `STUB_STRICT_TRANSITIONS=1` is set.
   - *Live Requirement*: If the backend rejects backward moves with `400 Bad Request` or `409 Conflict`, the frontend displays the server error detail and refetches `GET /applications` to preserve server authority. Does the backend plan to support an `Undo` window or transition rollback?
4. **Direct Jumps (Skip Stages)**:
   - *Current Spec*: Both API.md and the stub reject skipping stages (e.g. `applied -> interview` or `applied -> offer` returns `400 Bad Request`).
   - *Status*: Aligned.
