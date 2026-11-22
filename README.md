# ⚡ HireSwift — Smart Applicant Tracking System

**HireSwift** is a full-stack Applicant Tracking System (ATS) designed to simplify recruitment through automated resume parsing, candidate management, job postings, skill-based ranking, and hiring pipeline management.

The application combines a **React + TypeScript frontend** with a **FastAPI backend**, providing a centralized interface for recruiters to manage candidates and job applications.

## 🌐 Live Deployment

| Component | URL |
|---|---|
| **Live Application** | https://hire-swift.vercel.app/ |
| **Backend API** | https://hireswift-2sk5.onrender.com/ |
| **Swagger API Documentation** | https://hireswift-2sk5.onrender.com/docs |
| **API Health Check** | https://hireswift-2sk5.onrender.com/health |
| **GitHub Repository** | https://github.com/akshitagarg19/HireSwift |

**Deployment Platforms:**
- Frontend: Vercel
- Backend: Render
- Database: SQLite

## 🚀 Features

### 1. Resume Upload and Parsing
- Bulk upload PDF and DOCX resumes.
- Supports files up to 10 MB each.
- Extracts candidate information, including contact details, skills, education, and experience when available.
- Tracks batch processing progress.
- Detects duplicate resume submissions.

### 2. Candidate Management
- Centralized candidate directory.
- Search and filter candidates.
- Filter by skills, CGPA, experience, location, and graduation year.
- View detailed candidate profiles.
- Edit candidate information.

### 3. Job Management
- Create and manage job openings.
- Define job requirements and required skills.
- Edit existing job information.
- View applicants associated with job openings.

### 4. Candidate Ranking
- Rank candidates against job requirements.
- Display candidate match scores when sufficient matching data is available.
- Show skill matching information and ranking breakdowns.

### 5. Recruitment Pipeline
The application provides a five-stage recruitment workflow:

1. Applied
2. Shortlisted
3. Interview
4. Offer
5. Rejected

The interface supports moving candidates through recruitment stages and viewing application history.

### 6. Candidate Comparison
- Compare two or three candidates.
- Review qualifications and skills side by side.
- Highlight differences between candidate profiles.

### 7. Recruitment Insights
- Skill-gap analysis.
- Recruitment pipeline insights.
- Visualizations to support hiring decisions.

### 8. Additional Frontend Features
- Duplicate candidate detection interface.
- Bulk email interface.
- Blind hiring mode.
- Responsive dashboard.
- Saved candidate filters.

**Note:** Some advanced features are implemented in the application but have not yet completed live end-to-end verification.

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Validation | Zod |
| Backend | Python, FastAPI |
| API Server | Uvicorn |
| Database | SQLite |
| Resume Parsing | pypdf, python-docx |
| Backend Testing | Pytest |
| Frontend Testing | Vitest, Playwright |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Version Control | Git, GitHub |

## 📁 Project Structure

```text
HireSwift/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── db.py
│   │   └── parser.py
│   ├── tests/
│   │   └── test_api.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   └── ...
│   ├── package.json
│   ├── vite.config.ts
│   └── vercel.json
│
├── docs/
├── qa/
├── scripts/
├── test-data/
├── API.md
└── README.md
```

## ⚙️ Local Installation

### Prerequisites

Ensure the following are installed:

- Python 3.11 or later
- Node.js and npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/akshitagarg19/HireSwift.git
cd HireSwift
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
python -m uvicorn app.main:app --reload
```

The backend will be available at:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:

```env
VITE_API_URL=/api
VITE_USE_MOCK=false
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

The Vite development proxy forwards `/api` requests to the locally running FastAPI server.

## 🔌 Backend API Endpoints

### System

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Backend health check |

### Resume Management

| Method | Endpoint | Description |
|---|---|---|
| POST | `/resumes/bulk` | Upload and process resumes |
| GET | `/batches/{batch_id}/progress` | Check processing progress |

### Candidates

| Method | Endpoint | Description |
|---|---|---|
| GET | `/candidates` | List and filter candidates |
| GET | `/candidates/{candidate_id}` | Get candidate details |
| PATCH | `/candidates/{candidate_id}` | Update candidate |

### Jobs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/jobs` | Create job |
| PATCH | `/jobs/{job_id}` | Update job |
| GET | `/jobs/{job_id}/ranking` | Candidate ranking |
| GET | `/jobs/{job_id}/skill-gap` | Skill-gap analysis |

### Applications

| Method | Endpoint | Description |
|---|---|---|
| POST | `/applications` | Apply for a job |
| GET | `/applications` | List applications |
| POST | `/applications/{application_id}/move` | Move application stage |
| GET | `/applications/{application_id}/history` | Application history |

### Comparison

| Method | Endpoint | Description |
|---|---|---|
| GET | `/compare` | Compare candidates |

For the current complete API specification, refer to `API.md` and the live Swagger documentation.

## 🧪 Testing and Verification

### Backend Tests

Run:

```bash
cd backend
python -m pytest -q
```

**Latest local result: 7 tests passed.**

### Frontend Tests

From the frontend directory:

```bash
npm run build
npm run test
npm run test:e2e
```

The frontend development PR reported:
- TypeScript/lint checks: Passed
- Production build: Passed
- Vitest: 15/15 passed
- Playwright: 10/10 passed

These are reported frontend PR results, not a new verification of the deployed production application.

### Live Integration Verification

| Feature | Verification |
|---|---|
| Backend health endpoint | Passed |
| Vercel-to-Render connection | Passed |
| Candidate directory | Passed |
| Job listing | Passed |
| Job creation | Passed |
| Job visible after browser refresh | Passed |
| Resume upload and parsing | Passed |
| Uploaded candidate visible in directory | Passed |
| Ranking page loads | Passed |
| Ranking score calculation | Not fully verified |
| Pipeline transitions | Not fully verified |
| Candidate comparison | Not fully verified |

## ☁️ Deployment Architecture

```text
User Browser
     |
     v
Vercel — React + Vite Frontend
     |
     | /api requests
     v
Vercel API Rewrite
     |
     v
Render — FastAPI Backend
     |
     v
SQLite Database
```

### Frontend Deployment

Platform: **Vercel**

Production URL:

https://hire-swift.vercel.app/

Configuration:

```env
VITE_API_URL=/api
VITE_USE_MOCK=false
```

The Vercel rewrite configuration forwards API requests to the Render backend.

### Backend Deployment

Platform: **Render**

Production URL:

https://hireswift-2sk5.onrender.com/

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Database Persistence Limitation

The current backend uses SQLite on Render.

Render's free service filesystem is ephemeral. Database records and uploaded files stored locally may be lost when the service restarts or redeploys.

For production usage, a persistent database such as managed PostgreSQL is recommended.

## 🎯 Demonstration Workflow

1. Open the deployed HireSwift website.
2. Navigate to **Upload**.
3. Upload a sample PDF or DOCX resume.
4. Start resume parsing.
5. Open **Candidates** to inspect the extracted candidate profile.
6. Navigate to **Jobs**.
7. Create a job with relevant requirements.
8. Open the job's ranking section to inspect candidate matching.
9. Explore the recruitment pipeline and comparison interfaces.

## 🔮 Future Improvements

- Managed PostgreSQL database for persistent storage.
- More accurate resume extraction.
- Improved skill-based ranking.
- Enhanced recruitment analytics.
- Production-ready authentication and authorization.
- Expanded automated end-to-end testing.
- Email service integration.

## 👥 Development

HireSwift was developed collaboratively, with separate frontend and backend contributions integrated into a single repository.

## 📄 Project Links

**Live Application:** https://hire-swift.vercel.app/

**GitHub:** https://github.com/akshitagarg19/HireSwift

**Backend Documentation:** https://hireswift-2sk5.onrender.com/docs

---

**HireSwift — Simplifying recruitment through intelligent candidate management.**