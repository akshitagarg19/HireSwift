import os
import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS candidates(id INTEGER PRIMARY KEY, name TEXT, email TEXT, phone TEXT, city TEXT, cgpa_10 REAL, tenth_pct REAL, twelfth_pct REAL, grad_year INTEGER, experience_months INTEGER, linkedin TEXT, github TEXT, source_filename TEXT, file_hash TEXT, raw_text TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS candidate_skills(candidate_id INTEGER, skill TEXT, UNIQUE(candidate_id,skill), FOREIGN KEY(candidate_id) REFERENCES candidates(id));
CREATE TABLE IF NOT EXISTS jobs(id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, required_skills TEXT, preferred_skills TEXT, min_experience_months INTEGER DEFAULT 0, location TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS applications(id INTEGER PRIMARY KEY, candidate_id INTEGER NOT NULL, job_id INTEGER NOT NULL, stage TEXT NOT NULL DEFAULT 'Applied', score REAL, score_breakdown TEXT, UNIQUE(candidate_id,job_id), FOREIGN KEY(candidate_id) REFERENCES candidates(id), FOREIGN KEY(job_id) REFERENCES jobs(id));
CREATE TABLE IF NOT EXISTS stage_history(id INTEGER PRIMARY KEY, application_id INTEGER NOT NULL, from_stage TEXT, to_stage TEXT, changed_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(application_id) REFERENCES applications(id));
CREATE TABLE IF NOT EXISTS batches(id INTEGER PRIMARY KEY, total INTEGER DEFAULT 0, processed INTEGER DEFAULT 0, failed INTEGER DEFAULT 0, status TEXT DEFAULT 'processing', errors TEXT DEFAULT '[]', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_candidates_cgpa ON candidates(cgpa_10);
CREATE INDEX IF NOT EXISTS idx_candidates_tenth ON candidates(tenth_pct);
CREATE INDEX IF NOT EXISTS idx_candidates_twelfth ON candidates(twelfth_pct);
CREATE INDEX IF NOT EXISTS idx_candidates_grad ON candidates(grad_year);
CREATE INDEX IF NOT EXISTS idx_candidates_exp ON candidates(experience_months);
CREATE INDEX IF NOT EXISTS idx_candidates_city ON candidates(city);
"""

def connect():
    path = Path(os.getenv('DATABASE_PATH', './data/hireswift.db'))
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path, timeout=30, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA foreign_keys=ON')
    return con

def init_db():
    with connect() as con:
        con.executescript(SCHEMA)
