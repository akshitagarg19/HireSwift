import os
import tempfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def client(monkeypatch,tmp_path):
    monkeypatch.setenv('DATABASE_PATH',str(tmp_path/'test.db'))
    from app.main import app
    with TestClient(app) as c: yield c

def test_health(client):
    assert client.get('/health').json()['status']=='ok'

def test_jobs(client):
    response=client.post('/jobs',json={'title':'Backend','description':'Python FastAPI Docker'})
    assert response.status_code==200
    assert 'python' in response.json()['required_skills']

def test_filters(client):
    from app.db import connect
    with connect() as db:
        a=db.execute("INSERT INTO candidates(name,city,cgpa_10,experience_months,grad_year) VALUES ('A','Noida',8.5,24,2025)").lastrowid
        b=db.execute("INSERT INTO candidates(name,city,cgpa_10,experience_months,grad_year) VALUES ('B','Delhi',6.5,0,2026)").lastrowid
        db.execute('INSERT INTO candidate_skills(candidate_id,skill) VALUES (?,?)',(a,'python'))
        db.execute('INSERT INTO candidate_skills(candidate_id,skill) VALUES (?,?)',(b,'java'))
    checks=[({'cgpa_min':8},1),({'cgpa_min':9},0),({'city':'Noida'},1),({'grad_year':2026},1),({'experience_min':12},1),({'experience_max':0},1),({'skills_all':'python'},1),({'skills_none':'python'},1),({'skills_any':'java,python'},2),({'search':'A'},1)]
    for params,n in checks:
        response=client.get('/candidates',params=params)
        assert response.status_code==200
        assert response.json()['total']==n,(params,response.json())

def test_pipeline(client):
    from app.db import connect
    with connect() as db: cid=db.execute("INSERT INTO candidates(name) VALUES ('A')").lastrowid
    jid=client.post('/jobs',json={'title':'Dev','description':'Python'}).json()['id']
    aid=client.post('/applications',json={'candidate_id':cid,'job_id':jid}).json()['id']
    assert client.post(f'/applications/{aid}/move',json={'stage':'Hired'}).status_code==400
    assert client.post(f'/applications/{aid}/move',json={'stage':'Screening'}).status_code==200
