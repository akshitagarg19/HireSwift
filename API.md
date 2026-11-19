# HireSwift Backend API Specification
<!-- DRAFT: HireSwift FastAPI Backend Contract -->

> **Status:** DRAFT (Team Plan Frozen Spec)  
> **Server:** FastAPI + SQLite / PostgreSQL  
> **Frontend:** React + Vite Single-Page Application (served statically by FastAPI)  
> **Base Path:** `/api` (or root `/` when hosted together)

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
Upload one or multiple resumes for background parsing and vector indexing.

- **Content-Type:** `multipart/form-data`
- **Body:** `files`: List of files (`.pdf`, `.docx`, max 10MB each)

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
      "is_duplicate": false
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

### `GET /jobs`
List all active job requisitions.

### `POST /jobs`
Create a new job posting. The backend parses requirements and required skills.

### `PATCH /jobs/{id}`
Update job title, description, department, required/preferred skills, or status.

### `GET /jobs/{id}/ranking`
Get ranked candidates scored specifically against this job's competencies and JD.

**Response:** `200 OK`
```json
{
  "job_id": "job-101",
  "candidates": [
    {
      "candidate_id": "cand-001",
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
