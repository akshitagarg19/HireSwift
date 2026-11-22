
import io
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch, tmp_path):
    monkeypatch.setenv(
        "DATABASE_PATH", str(tmp_path / "test.db")
    )
    from app.main import app
    with TestClient(app) as c:
        yield c


def seed_candidate(client, name="A", skills=("python",)):
    from app.db import connect

    with connect() as db:
        cid = db.execute(
            """
            INSERT INTO candidates(
                name,city,cgpa_10,experience_months,grad_year
            )
            VALUES (?,?,?,?,?)
            """,
            (name, "Noida", 8.5, 24, 2025)
        ).lastrowid

        db.executemany(
            "INSERT INTO candidate_skills"
            "(candidate_id,skill) VALUES (?,?)",
            [(cid, s) for s in skills]
        )

    return f"cand-{cid}"


def create_job(client):
    response = client.post(
        "/jobs",
        json={
            "title": "Backend",
            "jd_text": "Python FastAPI Docker",
            "required_skills": ["python", "fastapi"],
            "min_experience": 1.0,
            "department": "Engineering",
            "status": "active"
        }
    )

    assert response.status_code == 201, response.text
    return response.json()


def test_health(client):
    assert client.get("/health").json()["version"] == "0.1.0"


def test_jobs_contract(client):
    job = create_job(client)

    assert job["id"].startswith("job-")
    assert job["min_experience"] == 1.0

    assert (
        client.get("/jobs").json()[0]["id"] == job["id"]
    )

    assert (
        client.get("/jobs/" + job["id"]).json()["title"]
        == "Backend"
    )

    patched = client.patch(
        "/jobs/" + job["id"],
        json={
            "status": "paused",
            "min_cgpa": 7.5
        }
    ).json()

    assert patched["status"] == "paused"
    assert patched["min_cgpa"] == 7.5


def test_candidates_contract_and_filters(client):
    cid = seed_candidate(client)

    r = client.get(
        "/candidates",
        params={
            "cgpa_min": 8,
            "exp_min": 1,
            "q": "A",
            "page": 1,
            "page_size": 10
        }
    )

    assert r.status_code == 200, r.text

    data = r.json()
    assert data["total"] == 1
    assert data["page"] == 1
    assert data["items"][0]["id"] == cid
    assert data["items"][0]["experience_years"] == 2.0

    updated = client.patch(
        "/candidates/" + cid,
        json={
            "location": "Delhi",
            "cgpa": 9.1,
            "skills": ["react"]
        }
    )

    assert updated.status_code == 200
    assert updated.json()["location"] == "Delhi"
    assert updated.json()["skills"] == ["react"]

    assert (
        client.get(
            "/candidates",
            params={"skills_all": "react"}
        ).json()["total"] == 1
    )


def test_ranking_applications_and_pipeline(client):
    cid = seed_candidate(client)
    job = create_job(client)
    jid = job["id"]

    ranking = client.get(
        f"/jobs/{jid}/ranking"
    ).json()

    assert ranking["candidates"][0]["candidate_id"] == cid
    assert (
        ranking["candidates"][0]["breakdown"]["education"]
        is None
    )
    assert (
        ranking["candidates"][0]["match_score"]
        is not None
    )

    application = client.post(
        "/applications",
        json={
            "candidate_id": cid,
            "job_id": jid
        }
    )

    assert application.status_code == 200, application.text

    aid = application.json()["application_id"]

    apps = client.get(
        "/applications",
        params={"job_id": jid}
    ).json()

    assert apps[0]["application_id"] == aid
    assert apps[0]["candidate"]["name"] == "A"

    assert client.post(
        f"/applications/{aid}/move",
        json={"stage": "offer"}
    ).status_code == 400

    assert client.post(
        f"/applications/{aid}/move",
        json={"stage": "shortlisted"}
    ).status_code == 200

    assert (
        client.get(
            "/applications",
            params={"job_id": jid}
        ).json()[0]["stage"] == "shortlisted"
    )

    assert len(
        client.get(
            f"/applications/{aid}/history"
        ).json()
    ) == 1

    gap = client.get(
        f"/jobs/{jid}/skill-gap"
    ).json()

    assert gap["total_applicants"] == 1
    assert len(gap["skills"]) == 2


def test_compare_and_validation(client):
    a = seed_candidate(client, "A")
    b = seed_candidate(client, "B")

    response = client.get(
        "/compare",
        params={"ids": f"{a},{b}"}
    )

    assert response.status_code == 200
    assert len(response.json()["candidates"]) == 2

    assert client.get(
        "/compare",
        params={"ids": a}
    ).status_code == 400


def test_upload_batch_contract(client):
    response = client.post(
        "/resumes/bulk",
        files=[
            (
                "files",
                ("invalid.txt", b"test", "text/plain")
            )
        ]
    )

    assert response.status_code == 202

    batch = response.json()

    assert batch["status"] == "completed"
    assert batch["total_files"] == 1

    progress = client.get(
        "/batches/" + batch["batch_id"] + "/progress"
    )

    assert progress.status_code == 200
    assert progress.json()["failed_files"][0]["reason"]


def test_migration_preserves_existing_data(
    monkeypatch, tmp_path
):
    monkeypatch.setenv(
        "DATABASE_PATH", str(tmp_path / "legacy.db")
    )

    from app.db import connect, init_db

    init_db()

    with connect() as db:
        db.execute(
            "INSERT INTO candidates(name) "
            "VALUES ('Persisted')"
        )
        db.execute(
            "INSERT INTO jobs(title,description) "
            "VALUES ('Existing','JD')"
        )
        db.execute(
            "INSERT INTO applications"
            "(candidate_id,job_id,stage) "
            "VALUES (1,1,'Screening')"
        )

    init_db()

    with connect() as db:
        assert (
            db.execute(
                "SELECT name FROM candidates WHERE id=1"
            ).fetchone()["name"] == "Persisted"
        )

        assert (
            db.execute(
                "SELECT stage FROM applications WHERE id=1"
            ).fetchone()["stage"] == "shortlisted"
        )
