# HireSwift — Live Demo Presentation Slides (Ayush / Frontend)

> **Presentation Duration**: 3.5 Minutes  
> **Speaker**: Ayush (Frontend, Test Data & Demo Lead)  
> **Target Audience**: Hackathon Evaluators, Hiring Managers, Lead Recruiters  

---

## 🎯 Slide 1: Title & The Problem We Solve
### **HireSwift: Intelligent High-Velocity ATS for Growing Hiring Teams**

- **The Problem in India**:
  - Startups and small hiring teams receive 300–800+ resumes per job opening.
  - HR scans resumes manually: inconsistent criteria, overlooked top candidates, and 3–4 weeks wasted before first interviews.
  - Campus hiring teams struggle with disparate CGPA formats (10-point, 4-point, percentages) and state board variations.
- **The HireSwift Vision**:
  - Ingest, parse, and rank hundreds of resumes in seconds.
  - Explainable, transparent scoring against any Job Description.
  - Intuitive recruiter workflow: from bulk upload to Kanban shortlisting and 1-click email outreach.

---

## 🏛️ Slide 2: End-to-End System Architecture

```
[ Frontend: React 18 + TS + Tailwind ] ──REST/JSON──> [ Backend: FastAPI (Python 3.11) ]
                  │                                                    │
    • Zustand Store (Persisted)                         • SQLite + Indexed Queries
    • TanStack Table + Recharts                         • PDF / DOCX Parser Engine
    • dnd-kit 5-Stage Kanban                            • Contract: API.md
                  │                                                    │
                  └──────── Single Docker Deployment Container ────────┘
```

- **Clean Decoupling**: Frontend communicates strictly via typed contracts defined in [API.md](file:///c:/Users/DELL/HireSwift/API.md).
- **FastAPI Mount & Relative Assets**: Vite configured with `base: '/'` for single-container Docker deployment with SPA fallback.
- **State Persistence**: Zero data loss across page reloads.

---

## ⚡ Slide 3: Must-Have Features Matrix

| Feature | Recruiter Pain Point | HireSwift Solution |
|---|---|---|
| **Bulk Resume Ingestion** | Uploading files one by one | Drag & drop 50+ PDF/DOCX resumes with progress bar & error isolation |
| **Explainable JD Scoring** | Black-box AI that recruiters can't trust | Transparent weights (Skills, Exp, Education, Semantic) with matched (green `✓`) & missing (red `✕`) breakdown |
| **Tri-State Skill Filters** | Overly rigid search or noisy results | Per-chip modes: **AND** (must have), **OR** (nice to have), **NOT** (exclude) |
| **Candidate Drawer & In-Place Edit** | Clicking in and out of profiles | Fast slide-over drawer with instant profile editing and real-time re-ranking |
| **5-Stage Kanban Pipeline** | Accidental invalid stage jumps | Validated transitions (`Applied` ↔ `Shortlisted` ↔ `Interview` → `Offer` / `Rejected`) with snap-back error toasts |
| **Side-by-Side Compare** | Manual tab switching to compare candidates | Strict 2–3 candidate comparison with category winner badges and AI recommendations |

---

## 🌟 Slide 4: Bonus Superpowers Built & Active

1. **AI-Based Resume-JD Matching & Rationale**:
   - Computes weighted composite match score.
   - Popover breaks down competency coverage (e.g., *"Matched 6/8 skills, missing Docker"*).
2. **Automated Duplicate Detection & Merging**:
   - Scans candidate pool for exact email matches, identical phone numbers, and fuzzy name similarity (e.g. *Karthik Sundaram* vs *Kartik Sundaram*).
   - Side-by-side diff viewer with 1-click primary merge, dismiss, or keep both.
3. **Bulk Email to Shortlisted Candidates**:
   - 1-click email action directly from candidate directory or Kanban Shortlisted column.
   - Templated variables: `{name}`, `{jobTitle}`, `{companyName}`, `{date}` with live previews and delivery audit log.
4. **Skill-Gap Analytics & Conversion Funnel**:
   - Recharts visual analytics showing missing skill frequency across applicant pool and conversion drop-offs.

---

## 📊 Slide 5: Quality, Test Data & Verification Benchmarks

- **Diverse Test Dataset**:
  - **56 verified test resumes** in `test-data/resumes/`: 50 unique candidates + 6 duplicate variants (file-hash exact copy, same email different format, fuzzy name same phone, updated career history, initials name variant).
  - **3 edge-case files** in `test-data/edge_cases/`: Corrupted PDF header, zero-byte PDF, unsupported `.txt` format.
  - **5 Markdown Job Descriptions** in `test-data/jds/`: Full Stack Engineer, Campus Graduate Trainee, Python Data Engineer, Senior Backend Architect, Staff Frontend React Lead.
  - **50-Candidate Ground Truth Benchmark** in `test-data/answer_key.csv`: 14 known-answer queries (F01–F14) verified 100%.
- **Frontend Automated Verification**:
  - `npm run lint`: 0 TypeScript errors (`tsc --noEmit`).
  - `npm run build`: Production bundle built cleanly with code splitting.
  - `npm run test`: 15 / 15 unit tests passing (Vitest).
  - `npm run test:e2e`: 28 / 28 end-to-end tests passing (Playwright, including seed isolation & contract checks).
  - Zero hardcoded `localhost` calls and zero exposed secrets in production bundle.
- **Backend Model Verification (Live Backend)**:
  - Extraction Accuracy: *[fill after live run: parser accuracy]*
  - Real DB Filter Latency: *[fill after live run: p50/p95 latency]*
  - Deduplication Recall / Precision: *[fill after live run: ML dedup recall/precision]*

---

## 🎬 Slide 6: 3-Minute Live Walkthrough Script

1. **Minute 0:00–0:45 | Bulk Ingestion & Parsing**:
   - Zero login gate: Direct access to recruitment suite with persistent **Blind Mode** toggle in the top bar.
   - Navigate to `/app/upload`, drag & drop candidate resumes from `test-data/resumes/`, and observe live progress bar and failed file error isolation.
2. **Minute 0:45–1:30 | Explainable Matching & Smart Filters**:
   - Open `/app/candidates`, demonstrate known-answer query F09 (`Noida`, `Python` AND, `CGPA >= 7.5`, `2+ years`) returning exactly 5 candidates.
   - Inspect Candidate Drawer with quick profile editing, explainable scoring breakdown, and missing value indicators (`-`).
3. **Minute 1:30–2:15 | Side-by-Side Comparison**:
   - Select 2 or 3 top candidates, click **"Compare Selected"**, and highlight category winners. Demonstrate strict 3-candidate limit guardrail.
4. **Minute 2:15–2:50 | 5-Stage Kanban & Transition Guardrails**:
   - Move candidate card from `Applied` to `Shortlisted`. Try dragging directly to `Offer` to demonstrate server rejection toast and card snap-back.
5. **Minute 2:50–3:30 | Bonus: Bulk Email & Duplicate Resolution**:
   - Click **"Email"** from Shortlisted column to preview personalized outreach with template variables.
   - Navigate to `/app/duplicates` to inspect side-by-side diffs and merge duplicate profiles.
