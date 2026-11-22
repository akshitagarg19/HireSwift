
import hashlib
import json
import os
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .db import connect, init_db
from .parser import extract_text, parse, skills_in


@asynccontextmanager
async def lifespan(app):
    init_db()
    yield


app = FastAPI(
    title="HireSwift Backend API",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "CORS_ORIGINS", "http://localhost:5173"
    ).split(","),
    allow_methods=["*"],
    allow_headers=["*"]
)


class JobIn(BaseModel):
    title: str
    jd_text: str = ""
    description: Optional[str] = None
    department: str = "Engineering"
    location: Optional[str] = None
    type: str = "Full-time"
    required_skills: Optional[list[str]] = None
    preferred_skills: Optional[list[str]] = None
    min_experience: float = 0
    min_experience_months: Optional[int] = None
    min_cgpa: Optional[float] = None
    grad_years: list[int] = []
    status: str = "active"


class MoveIn(BaseModel):
    stage: str
    reason: Optional[str] = None


class ApplyIn(BaseModel):
    candidate_id: str | int
    job_id: str | int


def as_id(value, prefix):
    if isinstance(value, bool):
        raise HTTPException(400, "Invalid identifier")
    value = str(value)
    if value.startswith(prefix + "-"):
        value = value[len(prefix) + 1:]
    if not value.isdecimal():
        raise HTTPException(400, "Invalid identifier")
    return int(value)


def public_id(value, prefix):
    return f"{prefix}-{int(value)}"


def json_list(value):
    try:
        result = json.loads(value or "[]")
        return result if isinstance(result, list) else []
    except (ValueError, TypeError):
        return []


@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": app.version,
        "database": "sqlite"
    }


def candidate_dict(con, row):
    d = dict(row)
    skills = [
        r["skill"]
        for r in con.execute(
            "SELECT skill FROM candidate_skills WHERE candidate_id=?",
            (d["id"],)
        )
    ]
    return {
        "id": public_id(d["id"], "cand"),
        "name": d.get("name") or "Unknown Candidate",
        "email": d.get("email") or "",
        "phone": d.get("phone") or "",
        "location": d.get("city") or "",
        "college": d.get("college") or "",
        "degree": d.get("degree") or "",
        "branch": d.get("branch") or "",
        "grad_year": d.get("grad_year"),
        "cgpa": d.get("cgpa_10"),
        "tenth_percent": d.get("tenth_pct"),
        "twelfth_percent": d.get("twelfth_pct"),
        "skills": skills,
        "experience_years": (
            round(d["experience_months"] / 12, 2)
            if d.get("experience_months") is not None
            else None
        ),
        "resume_text": d.get("raw_text") or "",
        "resume_file_name": d.get("source_filename") or "",
        "parse_confidence": d.get("parse_confidence"),
        "field_confidence": json.loads(
            d.get("field_confidence") or "{}"
        ),
        "custom_fields": json.loads(
            d.get("custom_fields") or "{}"
        ),
        "is_duplicate": bool(d.get("duplicate_group_id")),
        "duplicate_group_id": d.get("duplicate_group_id"),
        "source": "Upload",
        "created_at": d.get("created_at") or ""
    }


def save_resume(item):
    filename, data = item
    try:
        raw = extract_text(data, filename)
        if not raw.strip():
            raise ValueError(
                "No selectable text (scanned PDF may need OCR)"
            )

        fields = parse(raw)
        h = hashlib.sha256(data).hexdigest()

        with connect() as con:
            dup = con.execute(
                "SELECT id FROM candidates WHERE file_hash=?",
                (h,)
            ).fetchone()

            if dup:
                return {
                    "filename": filename,
                    "candidate_id": dup["id"],
                    "duplicate": True
                }

            cols = [
                "name", "email", "phone", "city", "cgpa_10",
                "tenth_pct", "twelfth_pct", "grad_year",
                "experience_months", "linkedin", "github"
            ]
            values = [fields.get(c) for c in cols]

            cur = con.execute(
                "INSERT INTO candidates ("
                + ",".join(cols)
                + ",source_filename,file_hash,raw_text) VALUES ("
                + ",".join("?" for _ in cols)
                + ",?,?,?)",
                values + [filename, h, raw]
            )
            cid = cur.lastrowid

            con.executemany(
                "INSERT OR IGNORE INTO candidate_skills"
                "(candidate_id,skill) VALUES (?,?)",
                [(cid, s) for s in fields["skills"]]
            )

        return {
            "filename": filename,
            "candidate_id": cid,
            "duplicate": False
        }

    except Exception as exc:
        return {
            "filename": filename,
            "error": str(exc)
        }


@app.post("/resumes/bulk", status_code=202)
async def bulk(
    files: list[UploadFile] = File(...),
    job_id: Optional[str] = Form(None)
):
    jid = as_id(job_id, "job") if job_id else None

    if jid is not None:
        with connect() as con:
            if not con.execute(
                "SELECT 1 FROM jobs WHERE id=?", (jid,)
            ).fetchone():
                raise HTTPException(404, "Job not found")

    max_bytes = int(os.getenv("MAX_FILE_MB", "10")) * 1024 * 1024
    items = []
    errors = []

    for f in files:
        data = await f.read(max_bytes + 1)
        if (
            not (f.filename or "").lower().endswith((".pdf", ".docx"))
            or len(data) > max_bytes
            or not data
        ):
            errors.append({
                "filename": f.filename or "unknown",
                "reason": "Invalid type, empty file, or file too large"
            })
        else:
            items.append((f.filename, data))

    with connect() as con:
        bid = con.execute(
            "INSERT INTO batches(total) VALUES (?)",
            (len(files),)
        ).lastrowid

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(save_resume, items))

    failures = errors + [
        {
            "filename": r["filename"],
            "reason": r["error"]
        }
        for r in results if "error" in r
    ]

    if jid is not None:
        with connect() as con:
            for r in results:
                if "candidate_id" in r:
                    con.execute(
                        "INSERT OR IGNORE INTO applications"
                        "(candidate_id,job_id,stage,created_at)"
                        " VALUES (?,?,?,CURRENT_TIMESTAMP)",
                        (r["candidate_id"], jid, "applied")
                    )

    with connect() as con:
        con.execute(
            "UPDATE batches SET processed=?,failed=?,status=?,errors=?"
            " WHERE id=?",
            (
                len(files),
                len(failures),
                "completed",
                json.dumps(failures),
                bid
            )
        )

    return {
        "batch_id": public_id(bid, "batch"),
        "total_files": len(files),
        "status": "completed",
        "processed": len(files),
        "failed": len(failures),
        "results": results
    }


@app.get("/batches/{batch_id}/progress")
def batch_progress(batch_id: str):
    with connect() as con:
        row = con.execute(
            "SELECT * FROM batches WHERE id=?",
            (as_id(batch_id, "batch"),)
        ).fetchone()

    if not row:
        raise HTTPException(404, "Batch not found")

    d = dict(row)
    return {
        "id": public_id(d["id"], "batch"),
        "total_files": d["total"],
        "processed_files": d["processed"],
        "status": d["status"],
        "failed_files": json.loads(d["errors"] or "[]")
    }


@app.get("/candidates")
def candidates(
    cgpa_min: float | None = None,
    tenth_min: float | None = None,
    twelfth_min: float | None = None,
    experience_min: int | None = None,
    experience_max: int | None = None,
    exp_min: float | None = None,
    exp_max: float | None = None,
    city: str | None = None,
    grad_year: int | None = None,
    skills_all: str | None = None,
    skills_any: str | None = None,
    skills_none: str | None = None,
    search: str | None = None,
    q: str | None = None,
    sort: str = "date_desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=500),
    include_unknown: bool = False,
    limit: int | None = Query(None, ge=1, le=500),
    offset: int | None = Query(None, ge=0)
):
    clauses = []
    params = []

    if exp_min is not None:
        experience_min = round(exp_min * 12)
    if exp_max is not None:
        experience_max = round(exp_max * 12)

    search = q or search
    limit = limit or page_size
    offset = offset if offset is not None else (page - 1) * page_size

    filters = [
        ("cgpa_10", cgpa_min, ">="),
        ("tenth_pct", tenth_min, ">="),
        ("twelfth_pct", twelfth_min, ">="),
        ("experience_months", experience_min, ">="),
        ("experience_months", experience_max, "<="),
        ("grad_year", grad_year, "=")
    ]

    for field, value, op in filters:
        if value is not None:
            clause = f"(c.{field} {op} ?"
            if include_unknown:
                clause += f" OR c.{field} IS NULL)"
            else:
                clause += ")"
            clauses.append(clause)
            params.append(value)

    if city:
        clause = "(LOWER(c.city)=LOWER(?)"
        clause += " OR c.city IS NULL)" if include_unknown else ")"
        clauses.append(clause)
        params.append(city)

    if search:
        clauses.append(
            "(LOWER(COALESCE(c.name,'') || ' ' || "
            "COALESCE(c.email,'') || ' ' || "
            "COALESCE(c.raw_text,'')) LIKE ?)"
        )
        params.append("%" + search.lower() + "%")

    for mode, value in [
        ("all", skills_all),
        ("any", skills_any),
        ("none", skills_none)
    ]:
        skills = [
            s.strip().lower()
            for s in (value or "").split(",")
            if s.strip()
        ]
        if not skills:
            continue

        matches = (
            "SELECT 1 FROM candidate_skills s "
            "WHERE s.candidate_id=c.id AND LOWER(s.skill)=?"
        )

        if mode == "all":
            for skill in skills:
                clauses.append("EXISTS (" + matches + ")")
                params.append(skill)
        elif mode == "none":
            for skill in skills:
                clauses.append("NOT EXISTS (" + matches + ")")
                params.append(skill)
        else:
            placeholders = ",".join("?" * len(skills))
            clauses.append(
                "EXISTS (SELECT 1 FROM candidate_skills s "
                "WHERE s.candidate_id=c.id AND LOWER(s.skill) "
                f"IN ({placeholders}))"
            )
            params += skills

    where = " WHERE " + " AND ".join(clauses) if clauses else ""

    with connect() as con:
        total = con.execute(
            "SELECT COUNT(*) AS n FROM candidates c" + where,
            params
        ).fetchone()["n"]

        sorts = {
            "date_desc": "c.id DESC",
            "cgpa_desc": "c.cgpa_10 DESC",
            "exp_desc": "c.experience_months DESC",
            "name_asc": "c.name COLLATE NOCASE ASC",
            "score_desc": "c.id DESC"
        }

        rows = con.execute(
            "SELECT c.* FROM candidates c"
            + where
            + " ORDER BY "
            + sorts.get(sort, "c.id DESC")
            + " LIMIT ? OFFSET ?",
            params + [limit, offset]
        ).fetchall()

        return {
            "total": total,
            "page": page,
            "page_size": limit,
            "items": [candidate_dict(con, r) for r in rows]
        }


@app.get("/candidates/{candidate_id}")
def candidate(candidate_id: str):
    cid = as_id(candidate_id, "cand")
    with connect() as con:
        row = con.execute(
            "SELECT * FROM candidates WHERE id=?",
            (cid,)
        ).fetchone()

        if not row:
            raise HTTPException(404, "Candidate not found")
        return candidate_dict(con, row)


@app.patch("/candidates/{candidate_id}")
def edit_candidate(candidate_id: str, changes: dict):
    cid = as_id(candidate_id, "cand")
    mapping = {
        "location": "city",
        "cgpa": "cgpa_10",
        "tenth_percent": "tenth_pct",
        "twelfth_percent": "twelfth_pct",
        "resume_text": "raw_text",
        "resume_file_name": "source_filename"
    }

    allowed = {
        "name", "email", "phone", "city", "cgpa_10",
        "tenth_pct", "twelfth_pct", "grad_year",
        "experience_months", "linkedin", "github",
        "college", "degree", "branch", "parse_confidence",
        "field_confidence", "custom_fields",
        "duplicate_group_id", "raw_text", "source_filename"
    }

    updates = {}

    for k, v in changes.items():
        key = mapping.get(k, k)
        if k == "experience_years":
            key = "experience_months"
            v = round(float(v) * 12) if v is not None else None

        if key in ("field_confidence", "custom_fields") and v is not None:
            v = json.dumps(v)

        if key in allowed:
            updates[key] = v

    with connect() as con:
        if not con.execute(
            "SELECT 1 FROM candidates WHERE id=?", (cid,)
        ).fetchone():
            raise HTTPException(404, "Candidate not found")

        if updates:
            con.execute(
                "UPDATE candidates SET "
                + ",".join(k + "=?" for k in updates)
                + " WHERE id=?",
                list(updates.values()) + [cid]
            )

        if "skills" in changes:
            con.execute(
                "DELETE FROM candidate_skills WHERE candidate_id=?",
                (cid,)
            )
            con.executemany(
                "INSERT OR IGNORE INTO candidate_skills"
                "(candidate_id,skill) VALUES (?,?)",
                [(cid, str(skill)) for skill in changes["skills"]]
            )

    return candidate(str(cid))


def job_dict(con, row):
    d = dict(row)
    count = con.execute(
        "SELECT COUNT(*) n FROM applications WHERE job_id=?",
        (d["id"],)
    ).fetchone()["n"]

    return {
        "id": public_id(d["id"], "job"),
        "title": d["title"],
        "department": d.get("department") or "Engineering",
        "location": d.get("location") or "",
        "type": d.get("job_type") or "Full-time",
        "jd_text": d.get("description") or "",
        "required_skills": json_list(d.get("required_skills")),
        "preferred_skills": json_list(d.get("preferred_skills")),
        "min_experience": round(
            (d.get("min_experience_months") or 0) / 12, 2
        ),
        "min_cgpa": d.get("min_cgpa"),
        "grad_years": json_list(d.get("grad_years")),
        "status": d.get("status") or "active",
        "created_at": d.get("created_at") or "",
        "applicant_count": count
    }


@app.get("/jobs")
def list_jobs():
    with connect() as con:
        return [
            job_dict(con, r)
            for r in con.execute(
                "SELECT * FROM jobs ORDER BY id DESC"
            )
        ]


@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    with connect() as con:
        row = con.execute(
            "SELECT * FROM jobs WHERE id=?",
            (as_id(job_id, "job"),)
        ).fetchone()

        if not row:
            raise HTTPException(404, "Job not found")
        return job_dict(con, row)


@app.post("/jobs", status_code=201)
def create_job(job: JobIn):
    description = job.jd_text or job.description or ""
    required = (
        job.required_skills
        if job.required_skills is not None
        else skills_in(description)
    )
    months = (
        job.min_experience_months
        if job.min_experience_months is not None
        else round(job.min_experience * 12)
    )

    with connect() as con:
        jid = con.execute(
            """
            INSERT INTO jobs(
                title, description, required_skills,
                preferred_skills, min_experience_months,
                location, department, job_type, min_cgpa,
                grad_years, status
            )
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                job.title,
                description,
                json.dumps(required),
                json.dumps(job.preferred_skills or []),
                months,
                job.location,
                job.department,
                job.type,
                job.min_cgpa,
                json.dumps(job.grad_years),
                job.status.lower()
            )
        ).lastrowid

    return get_job(str(jid))


@app.patch("/jobs/{job_id}")
def edit_job(job_id: str, changes: dict):
    jid = as_id(job_id, "job")
    mapping = {
        "jd_text": "description",
        "min_experience": "min_experience_months",
        "type": "job_type"
    }
    allowed = {
        "title", "description", "required_skills",
        "preferred_skills", "min_experience_months",
        "location", "department", "job_type",
        "min_cgpa", "grad_years", "status"
    }
    updates = {}

    for k, v in changes.items():
        key = mapping.get(k, k)
        if k == "min_experience" and v is not None:
            v = round(float(v) * 12)
        if key in (
            "required_skills", "preferred_skills", "grad_years"
        ):
            v = json.dumps(v or [])
        if key == "status" and v is not None:
            v = v.lower()
        if key in allowed:
            updates[key] = v

    with connect() as con:
        if not con.execute(
            "SELECT 1 FROM jobs WHERE id=?", (jid,)
        ).fetchone():
            raise HTTPException(404, "Job not found")

        if updates:
            con.execute(
                "UPDATE jobs SET "
                + ",".join(k + "=?" for k in updates)
                + " WHERE id=?",
                list(updates.values()) + [jid]
            )

    return get_job(str(jid))


def score(job, c):
    req = {
        x.lower()
        for x in json_list(job["required_skills"])
    }
    have = {x.lower() for x in c["skills"]}

    matched = sorted(req & have)
    missing = sorted(req - have)

    skills_pct = (
        round(100 * len(matched) / len(req), 2)
        if req else None
    )

    exp_years = c.get("experience_years")
    exp_pct = (
        100.0
        if exp_years >= (job["min_experience_months"] or 0) / 12
        else 0.0
    ) if exp_years is not None else None

    available = [(skills_pct, 0.8), (exp_pct, 0.2)]
    valid = [(v, w) for v, w in available if v is not None]

    total = (
        round(
            sum(v * w for v, w in valid)
            / sum(w for _, w in valid), 2
        )
        if valid else None
    )

    return (
        total,
        {
            "skills": skills_pct,
            "experience": exp_pct,
            "education": None,
            "semantic": None
        },
        matched,
        missing
    )


def ranking_items(con, jid, limit=100):
    job = con.execute(
        "SELECT * FROM jobs WHERE id=?", (jid,)
    ).fetchone()

    if not job:
        raise HTTPException(404, "Job not found")

    out = []

    for row in con.execute(
        "SELECT * FROM candidates"
    ).fetchall():
        c = candidate_dict(con, row)
        points, breakdown, matched, missing = score(job, c)

        app_row = con.execute(
            "SELECT id,stage FROM applications "
            "WHERE candidate_id=? AND job_id=?",
            (row["id"], jid)
        ).fetchone()

        out.append({
            "candidate_id": c["id"],
            "candidate": c,
            "application_id": (
                public_id(app_row["id"], "app")
                if app_row else ""
            ),
            "name": c["name"],
            "college": c["college"],
            "match_score": points,
            "breakdown": breakdown,
            "matched_skills": matched,
            "missing_skills": missing,
            "explanation": (
                f"Matches {len(matched)} of "
                f"{len(matched) + len(missing)} required skills."
                if matched or missing
                else "No required skills specified."
            ),
            "stage": (
                app_row["stage"] if app_row else "applied"
            )
        })

    return sorted(
        out,
        key=lambda x: (
            x["match_score"] is None,
            -(x["match_score"] or 0)
        )
    )[:limit]


@app.get("/jobs/{job_id}/ranking")
def ranking(
    job_id: str,
    limit: int = Query(100, ge=1, le=500)
):
    jid = as_id(job_id, "job")
    with connect() as con:
        return {
            "job_id": public_id(jid, "job"),
            "candidates": ranking_items(con, jid, limit)
        }


@app.post("/applications")
def apply(body: ApplyIn):
    cid = as_id(body.candidate_id, "cand")
    jid = as_id(body.job_id, "job")

    with connect() as con:
        if (
            not con.execute(
                "SELECT 1 FROM candidates WHERE id=?", (cid,)
            ).fetchone()
            or not con.execute(
                "SELECT 1 FROM jobs WHERE id=?", (jid,)
            ).fetchone()
        ):
            raise HTTPException(
                404, "Candidate or job not found"
            )

        try:
            aid = con.execute(
                "INSERT INTO applications"
                "(candidate_id,job_id,stage,created_at)"
                " VALUES (?,?,'applied',CURRENT_TIMESTAMP)",
                (cid, jid)
            ).lastrowid
        except Exception:
            raise HTTPException(
                409, "Application already exists"
            )

    return {
        "id": public_id(aid, "app"),
        "application_id": public_id(aid, "app"),
        "stage": "applied"
    }


TRANSITIONS = {
    "applied": {"shortlisted", "rejected"},
    "shortlisted": {"interview", "rejected"},
    "interview": {"offer", "rejected"},
    "offer": {"rejected", "applied"},
    "rejected": {"applied"}
}


@app.post("/applications/{application_id}/move")
def move(application_id: str, body: MoveIn):
    aid = as_id(application_id, "app")
    stage = body.stage.lower()

    with connect() as con:
        row = con.execute(
            "SELECT stage FROM applications WHERE id=?",
            (aid,)
        ).fetchone()

        if not row:
            raise HTTPException(404, "Application not found")

        old = row["stage"].lower()

        if stage not in TRANSITIONS.get(old, set()):
            raise HTTPException(
                400,
                f"Invalid stage transition: {old} to {stage}"
            )

        con.execute(
            "UPDATE applications SET stage=? WHERE id=?",
            (stage, aid)
        )

        hid = con.execute(
            "INSERT INTO stage_history"
            "(application_id,from_stage,to_stage)"
            " VALUES (?,?,?)",
            (aid, old, stage)
        ).lastrowid

    return {
        "success": True,
        "stage": stage,
        "historyId": public_id(hid, "hist")
    }


@app.get("/applications")
def applications(job_id: Optional[str] = None):
    jid = as_id(job_id, "job") if job_id else None

    with connect() as con:
        sql = (
            "SELECT * FROM applications"
            + (" WHERE job_id=?" if jid is not None else "")
            + " ORDER BY id DESC"
        )

        rows = con.execute(
            sql, (jid,) if jid is not None else ()
        ).fetchall()

        out = []

        for r in rows:
            c_row = con.execute(
                "SELECT * FROM candidates WHERE id=?",
                (r["candidate_id"],)
            ).fetchone()

            job = con.execute(
                "SELECT * FROM jobs WHERE id=?",
                (r["job_id"],)
            ).fetchone()

            if not c_row or not job:
                continue

            c = candidate_dict(con, c_row)
            points, breakdown, matched, missing = score(job, c)

            out.append({
                "application_id": public_id(r["id"], "app"),
                "job_id": public_id(r["job_id"], "job"),
                "candidate_id": c["id"],
                "stage": r["stage"].lower(),
                "match_score": points,
                "breakdown": breakdown,
                "matched_skills": matched,
                "missing_skills": missing,
                "explanation": (
                    f"Matches {len(matched)} required skills."
                ),
                "created_at": r["created_at"] or "",
                "candidate": {
                    k: c[k]
                    for k in (
                        "name", "college", "location",
                        "cgpa", "skills", "is_duplicate"
                    )
                }
            })

        return out


@app.get("/applications/{application_id}/history")
def history(application_id: str):
    aid = as_id(application_id, "app")

    with connect() as con:
        if not con.execute(
            "SELECT 1 FROM applications WHERE id=?",
            (aid,)
        ).fetchone():
            raise HTTPException(404, "Application not found")

        return [
            {
                **dict(r),
                "id": public_id(r["id"], "hist"),
                "application_id": public_id(aid, "app")
            }
            for r in con.execute(
                "SELECT * FROM stage_history "
                "WHERE application_id=? ORDER BY id",
                (aid,)
            )
        ]


@app.get("/jobs/{job_id}/skill-gap")
def skill_gap(job_id: str):
    jid = as_id(job_id, "job")

    with connect() as con:
        job = con.execute(
            "SELECT * FROM jobs WHERE id=?", (jid,)
        ).fetchone()

        if not job:
            raise HTTPException(404, "Job not found")

        apps = con.execute(
            "SELECT candidate_id FROM applications WHERE job_id=?",
            (jid,)
        ).fetchall()

        ids = [r["candidate_id"] for r in apps]
        skills = json_list(job["required_skills"])
        result = []

        for skill in skills:
            count = sum(
                bool(
                    con.execute(
                        "SELECT 1 FROM candidate_skills "
                        "WHERE candidate_id=? "
                        "AND LOWER(skill)=LOWER(?)",
                        (cid, skill)
                    ).fetchone()
                )
                for cid in ids
            )

            result.append({
                "name": skill,
                "required": True,
                "applicants_count": count,
                "coverage_pct": (
                    round(100 * count / len(ids), 2)
                    if ids else 0
                )
            })

        return {
            "job_id": public_id(jid, "job"),
            "skills": result,
            "total_applicants": len(ids)
        }


@app.get("/compare")
def compare(ids: str, job_id: Optional[str] = None):
    parts = [x.strip() for x in ids.split(",")]

    if (
        not 2 <= len(parts) <= 3
        or len(set(parts)) != len(parts)
    ):
        raise HTTPException(
            400, "Choose 2 or 3 distinct candidates"
        )

    cids = [as_id(x, "cand") for x in parts]
    jid = as_id(job_id, "job") if job_id else None

    with connect() as con:
        job = (
            con.execute(
                "SELECT * FROM jobs WHERE id=?", (jid,)
            ).fetchone()
            if jid else None
        )

        if jid and not job:
            raise HTTPException(404, "Job not found")

        entries = []

        for cid in cids:
            row = con.execute(
                "SELECT * FROM candidates WHERE id=?",
                (cid,)
            ).fetchone()

            if not row:
                raise HTTPException(
                    404, "Candidate not found"
                )

            c = candidate_dict(con, row)

            points, breakdown, matched, missing = (
                score(job, c)
                if job else (None, None, [], [])
            )

            entries.append({
                "candidate": c,
                "match_score": points,
                "breakdown": breakdown,
                "matched_skills": matched,
                "missing_skills": missing
            })

        return {
            "job": job_dict(con, job) if job else None,
            "candidates": entries
        }


from fastapi.openapi.utils import get_openapi


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
        openapi_version="3.0.3"
    )

    body = schema["components"]["schemas"][
        "Body_bulk_resumes_bulk_post"
    ]
    file_schema = body["properties"]["files"]["items"]

    file_schema.pop("contentMediaType", None)
    file_schema["format"] = "binary"

    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi
