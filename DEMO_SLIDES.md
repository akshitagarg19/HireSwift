# HireSwift — Live Demo Presentation Slides (Ayush / Frontend)

> **Presentation Duration**: 3.5 – 4 Minutes  
> **Speaker**: Ayush (Frontend, Test Data & Demo Lead)  
> **Target Audience**: Hackathon Evaluators, Hiring Managers, Lead Recruiters  

---

## 🎯 Slide 1: Title & The Problem We Solve
### **HireSwift: Intelligent High-Velocity ATS for Growing Hiring Teams**

- **The Problem in India**:
  - Startups and high-growth hiring teams receive 300–800+ resumes per job opening.
  - HR scans resumes manually: inconsistent criteria, overlooked top candidates, and 3–4 weeks wasted before first interviews.
  - Campus hiring teams struggle with disparate CGPA formats (10-point, 4-point, percentages) and state board variations.
- **The HireSwift Vision**:
  - Ingest, parse, and rank hundreds of resumes in seconds with explainable scoring against any Job Description.
  - Recruiter-first dashboard as default landing screen (`/app/dashboard`) providing instant executive visibility: search, top ranked candidates, pipeline funnel, and AI skill gaps.
  - Scalable UI handling up to 1,000+ candidates with server-side pagination (12/25/50/100) and 50-card Kanban virtualization.
  - 100% verified test harness: 51/51 automated Playwright E2E tests, 15/15 unit tests, 0 lint errors.

---

## 🏛️ Slide 2: End-to-End System Architecture

```
[ Frontend: React 18 + TS + Tailwind ] ──REST/JSON──> [ Backend: FastAPI (Python 3.11) ]
                  │                                                    │
    • Zustand Store (UI State Only)                     • SQLite + Indexed Queries
      (blind mode, drawers, selections)                 • PDF / DOCX Parser Engine
    • Server-Driven TanStack / API Client               • Contract: API.md
    • dnd-kit 5-Stage Kanban                            • Port: 8000 (/api)
                  │                                                    │
                  └──────── Single Docker Deployment Container ────────┘
```

- **Clean Decoupling**: In live mode (`VITE_USE_MOCK=false`), frontend reads **strictly from API endpoints** (`api.*`). Zustand store never holds candidate, job, or application data.
- **FastAPI Mount & Relative Assets**: Vite configured with `base: '/'` for single-container Docker deployment with SPA fallback.
- **Contract Conformance**: All payloads mapped between snake_case and camelCase via validated Zod schemas.

---

## ⚡ Slide 3: Must-Have Features Matrix

| Feature | Recruiter Pain Point | HireSwift Solution |
|---|---|---|
| **Recruiter Dashboard** | Lack of centralized visibility | Executive landing page with debounced candidate search, live hiring KPIs, Top 10 ranking table with compare actions, pipeline funnel, and AI skill gap card |
| **Bulk Resume Ingestion** | Uploading files one by one | Drag & drop 50+ PDF/DOCX resumes with progress bar, job linkage (`job_id`), scrollable failure isolation, and "View candidates" CTA |
| **Explainable JD Scoring** | Black-box AI that recruiters can't trust | Transparent weights (Skills, Exp, Education, Semantic) with matched (green `✓`), missing (red `✕`), learn hints, and raw resume highlight marks |
| **Tri-State Skill Filters** | Overly rigid search or noisy results | Per-chip modes: **AND** (must have), **OR** (nice to have), **NOT** (exclude) synced with URL query params |
| **Candidate Drawer & Edit** | Slow full-page navigation | Slide-over drawer with quick profile editing, score breakdown, and unknown field resilience (`-` with amber badge) |
| **5-Stage Kanban Pipeline** | Accidental invalid stage jumps | Validated transitions (`Applied` ↔ `Shortlisted` ↔ `Interview` → `Offer` / `Rejected`) with snap-back toasts and 50-card column pagination |
| **Side-by-Side Compare** | Manual tab switching to compare candidates | Strict 2–3 candidate comparison with category winner badges, AI match recommendations, and skill gap matrix |

---

## 🌟 Slide 4: Bonus Superpowers Built & Active

1. **AI-Based Resume-JD Matching & Rationale**:
   - Computes weighted composite match score (Skills, Exp, Edu, Semantic). Unscored candidates render `-` with empty ring (never invented `75`).
   - Domain-aware skill learn hints (e.g., *"FastAPI: Python async REST framework; candidates with Flask or Django pick this up quickly"*).
   - Raw resume text view highlighting matched skills in yellow `<mark>` tags.
2. **Bulk Email to Shortlisted Candidates**:
   - Direct 1-click outreach to shortlisted applicants with variable interpolation (`{{candidate_name}}`, `{{job_title}}`).
   - Live per-recipient preview, dispatch confirmation modal, and audit results table.
   - Zero-dependency manual fallback mode: Copy All Emails, Mail Client Launch (40-recipient BCC chunking), and CSV export.
3. **Automated Duplicate Detection & Merging**:
   - Clustered by `duplicate_group_id` from API (exact copy, same email other format, fuzzy name same phone, updated resume, initials).
   - Side-by-side diff viewer with 1-click primary merge, dismiss, or keep both.
4. **UI Scalability (Tested to 1,000+ Candidates)**:
   - Server-side page size selector (`12`, `25`, `50`, `100`), debounced fetching, and request ID race-condition guards.
   - Kanban columns paginate at 50 cards with `"Show more (+50)"` button to preserve 60fps drag performance.
   - Synthetic data indicator badge when connected to high-scale benchmark datasets.
5. **Persistent Blind Recruitment Mode**:
   - Top-bar toggle masking candidate name (`Candidate #ID`), college, and location across Dashboard, Candidates, Drawer, Pipeline, Compare, and Job Ranking.

---

## 📊 Slide 5: Quality, Test Data & Verification Benchmarks

- **Diverse Test Dataset (`test-data/`)**:
  - **56 verified test resumes**: 50 unique candidates + 6 duplicate variants in `test-data/resumes/`.
  - **3 edge-case files**: Corrupted PDF header, zero-byte PDF, unsupported `.txt` format in `test-data/edge_cases/`.
  - **5 Markdown Job Descriptions**: Full Stack Engineer, Campus Graduate Trainee, Python Data Engineer, Senior Backend Architect, Staff Frontend React Lead in `test-data/jds/`.
  - **50-Candidate Ground Truth Benchmark**: 14 known-answer queries (F01–F14) in `test-data/filter_tests.csv`.
- **Frontend Automated Verification Suite**:
  - `npm run lint`: **0 errors** (`tsc --noEmit` & ESLint passing).
  - `npm run build`: Production bundle built cleanly with code splitting (~9.3s).
  - `npm run test`: **15 / 15 unit tests passing** (Vitest).
  - `npm run test:e2e`: **51 / 51 end-to-end tests passing** (Playwright across 11 spec suites).
  - Zero hardcoded `localhost` calls and zero exposed secrets in production bundle.
- **Contract Stub vs. Live Backend Evaluation**:
  - *Stub mode proves:* UI routing, contract parameter conformance (`API.md`), stage transition constraints, URL filter persistence, blind mode masking, and component rendering resilience.
  - *Stub mode does NOT model:* Real OCR accuracy, NLP entity extraction, or live DB filter latency.
  - *Live Backend Benchmarks (to be populated on live run)*:
    - Filter Pass Rate: *[fill after live run: filter pass rate X/14]*
    - Parser Field Extraction Accuracy: *[fill after live run: parser field accuracy %]*
    - Real Database Filter Latency: *[fill after live run: p50/p95 latency]*
    - Deduplication Recall / Precision: *[fill after live run: ML dedup recall/precision]*

---

## 🎬 Slide 6: 4-Minute Live Walkthrough Script

1. **Minute 0:00–0:40 | Recruiter Dashboard & Global Search**:
   - Landing on `/app/dashboard`: Live hiring KPIs (Total Candidates, Active Jobs, In Pipeline, Shortlisted).
   - Global search: Search `"Python"` or `"Sharma"` with 300ms debounce; click dropdown result to open drawer immediately.
   - Quick Compare: Check 2 candidates from Top 10 ranking table and click **"Compare (2)"**.
2. **Minute 0:40–1:15 | Bulk Ingestion & Validation**:
   - Navigate to `/app/upload`: Link to open job requisition or upload to talent pool.
   - Ingest batch from `test-data/resumes/`: Real-time progress bar, failure isolation for corrupted/0-byte files, and **"View candidates"** CTA.
3. **Minute 1:15–2:00 | Multi-Mode Smart Filters & Explainable Drawer**:
   - Navigate to `/app/candidates`: Demonstrate tri-state skill chips (AND emerald, OR indigo, NOT rose).
   - Known-answer query F09: Noida, Python (AND), CGPA >= 7.5, Exp >= 2 -> Exactly 5 candidates.
   - Candidate Drawer: Score breakdown, matched skills, learn hints, and `<mark>` highlighted resume text.
   - Toggle **Blind Mode**: Instant masking of name, college, location across the UI.
4. **Minute 2:00–2:35 | Jobs, Ranking & Skill-Gap Analytics**:
   - Navigate to `/app/jobs`: Ranked candidates strictly descending by match score.
   - Competency breakdown popovers and Talent Pool Skill Gap analytics.
5. **Minute 2:35–3:15 | 5-Stage Kanban Pipeline & Guardrails**:
   - Navigate to `/app/pipeline`: 5 stages with embedded candidate summaries.
   - Drag illegal move (Applied -> Offer): Immediate snap-back with server error toast.
   - Move Applied -> Shortlisted: Persisted state update.
6. **Minute 3:15–3:45 | Bulk Email Outreach**:
   - Navigate to `/app/emails`: Pre-filtered shortlisted candidates, template variable interpolation (`{{candidate_name}}`), live preview, confirmation modal, and audit log.
7. **Minute 3:45–4:00 | Duplicate Resolution & Wrap-Up**:
   - Navigate to `/app/duplicates`: Signal breakdown and side-by-side diff merge.
