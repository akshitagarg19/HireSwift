# HireSwift Backend API Specification
<!-- DRAFT: HireSwift FastAPI Backend Contract -->

> **Status:** DRAFT (Team Plan Frozen Spec)  
> **Server:** FastAPI + SQLite / PostgreSQL  
> **Frontend:** React + Vite Single-Page Application (served statically by FastAPI)  
> **Base Path:** `/api` (or root `/` when hosted together)

---

## ⚠️ CHANGES FOR AKSHITA (Backend Alignment Checklist)
1. **`GET /jobs/{id}/ranking` item `application_id`**:
   - Each item in the `candidates` array must include `application_id: string` so the Kanban and detail views can advance or track the candidate's active application record.
2. **`GET /applications` Endpoint & Candidate Summary**:
   - Add endpoint `GET /applications` accepting optional query parameter `?job_id=string`.
   - Returns a list of applications using `application_id` (not `id`), matching ranking items:
     `[{ application_id, job_id, candidate_id, stage, match_score, breakdown, matched_skills, missing_skills, explanation, created_at, candidate: { name, college, location, cgpa, skills, is_duplicate } }]`.
   - Each application includes embedded `candidate` summary object `{ name, college, location, cgpa, skills, is_duplicate }` for high-performance Kanban rendering without secondary candidate lookups.
   - `match_score` and `breakdown` can be `null` if the candidate has not been scored yet (no invented default values).
3. **Job Schema in snake_case**:
   - Standardize all job endpoints (`GET /jobs`, `POST /jobs`, `PATCH /jobs/{id}`) to snake_case schema:
     `{ id, title, department, location, jd_text, required_skills, preferred_skills, min_experience, min_cgpa, grad_years, status, created_at, applicant_count }`.
4. **`POST /resumes/bulk` with optional `job_id`**:
   - Ingesting resumes accepts an optional form parameter `job_id: string`. If passed, candidates and initial applications are linked to this requisition; if omitted, they enter the general talent pool. Ingestion automatically creates candidate profiles and initial application records in `applied` stage upon completion.
5. **`duplicate_group_id` in `GET /candidates`**:
   - Candidate records should include optional `duplicate_group_id: string | null` alongside `is_duplicate: bool` so duplicate clusters can be grouped directly from backend deduplication signals.

---

## 1. System Health

### `GET /health`
Returns the status of the FastAPI backend and database connectivity.

**Response:** `200 OK`
```json
{
  "status": "ok",
  "version": "1.0.0",
  "database": "connected"
}
```

---

## 2. Resumes & Ingestion

### `POST /resumes/bulk`
Upload one or multiple resumes for background parsing and vector indexing. Ingestion automatically creates candidate profiles and initial application records in `applied` stage upon completion.

- **Content-Type:** `multipart/form-data`
- **Body:**
  - `files`: List of files (`.pdf`, `.docx`, max 10MB each)
  - `job_id`: (Optional) Target job requisition ID. When supplied, newly parsed candidates are linked to this requisition as applications. If omitted, candidates are added to the general talent pool.

**Response:** `202 Accepted`
```json
{
  "batch_id": "batch-1700000000",
  "total_files": 12,
  "status": "processing"
}
```

### `GET /batches/{id}/progress`
Poll the progress of an asynchronous resume parsing batch.

**Response:** `200 OK`
```json
{
  "id": "batch-1700000000",
  "total_files": 12,
  "processed_files": 10,
  "status": "processing",
  "failed_files": [
    {
      "filename": "scan_broken.pdf",
      "reason": "Corrupted PDF header or unreadable scanned image"
    }
  ]
}
```

---

## 3. Candidates Directory

### `GET /candidates`
Query and filter candidates across the indexed talent pool.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `cgpa_min` | float | Minimum CGPA (0 - 10 scale) |
| `tenth_min` | int | Minimum 10th Board % |
| `twelfth_min` | int | Minimum 12th Board % |
| `skills_all` | string | Comma-separated skills: candidate must have ALL (AND) |
| `skills_any` | string | Comma-separated skills: candidate must have at least ONE (OR) |
| `skills_none` | string | Comma-separated skills: candidate must have NONE (NOT) |
| `exp_min` | float | Minimum years of corporate/work experience |
| `exp_max` | float | Maximum years of experience |
| `city` | string | Candidate location / city |
| `grad_year` | int | Graduation batch year |
| `q` | string | Full-text query (name, college, skills, keywords) |
| `include_unknown` | bool | Include candidates where academic or exp data is missing/unparsed |
| `sort` | string | `score_desc`, `cgpa_desc`, `exp_desc`, `name_asc`, `date_desc` |
| `page` | int | 1-based page index (default: `1`) |
| `page_size` | int | Page limit (default: `12`) |

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "cand-001",
      "name": "Aarav Sharma",
      "email": "aarav.sharma@example.in",
      "phone": "+91 98765 43210",
      "location": "Bengaluru",
      "college": "IIT Delhi",
      "degree": "B.Tech",
      "branch": "Computer Science",
      "grad_year": 2024,
      "cgpa": 8.8,
      "tenth_percent": 92.5,
      "twelfth_percent": 90.0,
      "skills": ["React", "TypeScript", "Python", "Node.js", "Docker"],
      "experience_years": 1.5,
      "parse_confidence": 92,
      "field_confidence": {
        "cgpa": 95,
        "college": 90,
        "skills": 88
      },
      "custom_fields": {
        "cf-ctc": "14 LPA",
        "cf-notice": "15 Days"
      },
      "is_duplicate": false,
      "duplicate_group_id": "dup-grp-101"
    }
  ],
  "total": 45,
  "page": 1,
  "page_size": 12
}
```

### `GET /candidates/{id}`
Fetch detailed candidate record with work experience, projects, and resume text.

### `PATCH /candidates/{id}`
Update parsed fields, correct low-confidence values, or add tags.

---

## 4. Jobs & Competency Profiles

Job objects are structured in standard `snake_case` across all job endpoints:
```json
{
  "id": "job-101",
  "title": "Senior Full Stack Engineer",
  "department": "Engineering",
  "location": "Bengaluru",
  "jd_text": "Looking for a Senior Full Stack Engineer proficient in React and Python.",
  "required_skills": ["React", "TypeScript", "Python", "Node.js"],
  "preferred_skills": ["Docker", "PostgreSQL", "AWS"],
  "min_experience": 3,
  "min_cgpa": 7.5,
  "grad_years": [2022, 2023, 2024],
  "status": "active",
  "created_at": "2026-11-20T10:00:00Z",
  "applicant_count": 12
}
```

### `GET /jobs`
List all active job requisitions.

**Response:** `200 OK`
```json
[
  {
    "id": "job-101",
    "title": "Senior Full Stack Engineer",
    "department": "Engineering",
    "location": "Bengaluru",
    "jd_text": "Looking for a Senior Full Stack Engineer...",
    "required_skills": ["React", "TypeScript", "Python", "Node.js"],
    "preferred_skills": ["Docker", "PostgreSQL"],
    "min_experience": 3.0,
    "min_cgpa": 7.5,
    "grad_years": [2022, 2023, 2024],
    "status": "active",
    "created_at": "2026-11-20T10:00:00Z",
    "applicant_count": 12
  }
]
```

### `POST /jobs`
Create a new job posting in snake_case.

**Request Body:**
```json
{
  "title": "Frontend Engineer",
  "department": "Engineering",
  "location": "Bengaluru",
  "jd_text": "We are looking for a skilled Frontend Engineer...",
  "required_skills": ["React", "TypeScript", "Tailwind CSS"],
  "preferred_skills": ["Next.js", "GraphQL"],
  "min_experience": 2.0,
  "min_cgpa": 7.0,
  "grad_years": [2023, 2024],
  "status": "active"
}
```

**Response:** `201 Created` (returns created Job object)

### `PATCH /jobs/{id}`
Update job attributes in snake_case.

**Request Body:** (Partial Job object)
```json
{
  "title": "Lead Frontend Engineer",
  "status": "paused"
}
```

**Response:** `200 OK` (returns updated Job object)

### `GET /jobs/{id}/ranking`
Get ranked candidates scored specifically against this job's competencies and JD.

**Response:** `200 OK`
```json
{
  "job_id": "job-101",
  "candidates": [
    {
      "candidate_id": "cand-001",
      "application_id": "app-001",
      "name": "Aarav Sharma",
      "college": "IIT Delhi",
      "match_score": 91,
      "breakdown": {
        "skills": 95,
        "experience": 85,
        "education": 90,
        "semantic": 92
      },
      "matched_skills": ["React", "TypeScript", "Python", "Node.js"],
      "missing_skills": ["Kubernetes"],
      "explanation": "Exceptional fit. Strong required skill coverage from IIT Delhi.",
      "stage": "applied"
    }
  ]
}
```

### `GET /jobs/{id}/skill-gap`
Analytics on skill availability in the applicant pool vs JD requirements.

**Response:** `200 OK`
```json
{
  "job_id": "job-101",
  "skills": [
    { "name": "React", "required": true, "applicants_count": 42, "coverage_pct": 84 },
    { "name": "Kubernetes", "required": true, "applicants_count": 8, "coverage_pct": 16 }
  ]
}
```

---

## 5. Applications & Pipeline Transitions

### `GET /applications`
List recruitment applications across all jobs or filter by specific job.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `job_id` | string | (Optional) Filter applications by target job identifier |

**Response:** `200 OK`
```json
[
  {
    "application_id": "app-001",
    "job_id": "job-101",
    "candidate_id": "cand-001",
    "stage": "applied",
    "match_score": 91,
    "breakdown": {
      "skills": 95,
      "experience": 85,
      "education": 90,
      "semantic": 92
    },
    "matched_skills": ["React", "TypeScript", "Python", "Node.js"],
    "missing_skills": ["Kubernetes"],
    "explanation": "Strong match for Senior Full Stack Engineer based on skill portfolio.",
    "created_at": "2026-11-20T10:00:00Z",
    "candidate": {
      "name": "Aarav Sharma",
      "college": "IIT Delhi",
      "location": "Bengaluru",
      "cgpa": 8.8,
      "skills": ["React", "TypeScript", "Python"],
      "is_duplicate": false
    }
  }
]
```

### `POST /applications/{id}/move`
Advance or move an applicant along the Kanban pipeline.

**Request Body:**
```json
{
  "stage": "shortlisted",
  "reason": "Passed initial resume screening"
}
```

**Allowed Stages:**
- `applied`
- `shortlisted`
- `interview`
- `offer`
- `rejected`

**Transition Validation Rules:**
- `applied` → `shortlisted`, `rejected`
- `shortlisted` → `interview`, `rejected`
- `interview` → `offer`, `rejected`
- `offer` → `rejected`, `applied` (re-evaluation)
- `rejected` → `applied` (reopened)

**Error Response on Illegal Move:** `400 Bad Request`
```json
{
  "detail": "Invalid stage transition: Cannot jump directly from 'applied' to 'offer'. Must progress through screening."
}
```

---

## 6. Head-to-Head Candidate Comparison

### `GET /compare?ids=cand-001,cand-002&job_id=job-101`
Compare 2 to 3 candidates side-by-side with dimensional highlights.
*Note:* A maximum of 3 candidate IDs is permitted. If more than 3 are passed, returns `400 Bad Request`.

---

## 7. PROPOSED (needs backend confirmation)

### `POST /email/send`
Dispatches batch communication emails to shortlisted candidates. Template variables (`{{candidate_name}}`, `{{job_title}}`, `{{company_name}}`) are pre-rendered per recipient on the frontend before sending.

**Request Body:**
```json
{
  "job_id": "job-101",
  "recipients": [
    {
      "candidate_id": "C001",
      "to": "aarav.sharma@example.com",
      "subject": "Interview Invitation: Senior Backend Engineer at NovaLabs",
      "body": "Dear Aarav Sharma,\n\nWe would like to invite you for a technical interview..."
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "sent": [
    {
      "candidate_id": "C001",
      "email": "aarav.sharma@example.com",
      "status": "sent"
    },
    {
      "candidate_id": "C042",
      "email": "scripted_fail@test.com",
      "status": "failed",
      "error": "SMTP server rejected recipient address"
    }
  ]
}
```

**Fallback Contract:**
If the server does not support email dispatch (e.g. returns `404 Not Found` or `501 Not Implemented`), the frontend switches to manual fallback mode offering:
1. Copy all recipient emails to clipboard.
2. Open native email client via `mailto:` with BCC chunking (max 40 recipients per URL).
3. Download recipient CSV export (`name,email,subject,body`).

