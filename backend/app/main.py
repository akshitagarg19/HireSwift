import hashlib
import json
import os
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .db import connect, init_db
from .parser import extract_text, parse, skills_in

@asynccontextmanager
async def lifespan(app):
    init_db()
    yield

app=FastAPI(title='HireSwift Backend API',version='0.1.0',lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=os.getenv('CORS_ORIGINS','http://localhost:5173').split(','),allow_methods=['*'],allow_headers=['*'])

class JobIn(BaseModel):
    title:str
    description:str
    required_skills:list[str]|None=None
    preferred_skills:list[str]|None=None
    min_experience_months:int=0
    location:str|None=None
class MoveIn(BaseModel):
    stage:str
class ApplyIn(BaseModel):
    candidate_id:int
    job_id:int

@app.get('/health')
def health(): return {'status':'ok'}


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
        "id": str(d["id"]),
        "name": d.get("name") or "Unknown Candidate",
        "email": d.get("email") or "",
        "phone": d.get("phone") or "",
        "location": d.get("city") or "",
        "college": "",
        "degree": "",
        "branch": "",
        "grad_year": d.get("grad_year"),
        "tenth_percent": d.get("tenth_pct"),
        "twelfth_percent": d.get("twelfth_pct"),
        "cgpa": d.get("cgpa_10"),
        "skills": skills,
        "experience_years": (
            round(d["experience_months"] / 12, 2)
            if d.get("experience_months") is not None
            else None
        ),
        "resume_text": d.get("raw_text") or "",
        "resume_file_name": d.get("source_filename") or "",
        "parse_confidence": None,
        "source": "Upload"
    }


def save_resume(item):
    filename,data=item
    try:
        raw=extract_text(data,filename)
        if not raw.strip(): raise ValueError('No selectable text (scanned PDF may need OCR)')
        fields=parse(raw)
        h=hashlib.sha256(data).hexdigest()
        with connect() as con:
            dup=con.execute('SELECT id FROM candidates WHERE file_hash=?',(h,)).fetchone()
            if dup: return {'filename':filename,'candidate_id':dup['id'],'duplicate':True}
            cols=['name','email','phone','city','cgpa_10','tenth_pct','twelfth_pct','grad_year','experience_months','linkedin','github']
            values=[fields.get(c) for c in cols]
            cur=con.execute('INSERT INTO candidates ('+','.join(cols)+',source_filename,file_hash,raw_text) VALUES ('+','.join('?' for _ in cols)+',?,?,?)',values+[filename,h,raw])
            cid=cur.lastrowid
            con.executemany('INSERT OR IGNORE INTO candidate_skills(candidate_id,skill) VALUES (?,?)',[(cid,s) for s in fields['skills']])
        return {'filename':filename,'candidate_id':cid,'duplicate':False}
    except Exception as exc: return {'filename':filename,'error':str(exc)}

@app.post('/resumes/bulk')
async def bulk(files:list[UploadFile]=File(...)):
    max_bytes=int(os.getenv('MAX_FILE_MB','10'))*1024*1024
    items=[];errors=[]
    for f in files:
        data=await f.read(max_bytes+1)
        if not f.filename.lower().endswith(('.pdf','.docx')) or len(data)>max_bytes or not data:
            errors.append({'filename':f.filename,'error':'Invalid type, empty file, or file too large'})
        else: items.append((f.filename,data))
    with connect() as con:
        bid=con.execute('INSERT INTO batches(total) VALUES (?)',(len(files),)).lastrowid
    with ThreadPoolExecutor(max_workers=4) as pool:
        results=list(pool.map(save_resume,items))
    results+=errors
    failures=[x for x in results if 'error' in x]
    with connect() as con:
        con.execute('UPDATE batches SET processed=?,failed=?,status=?,errors=? WHERE id=?',(len(results),len(failures),'completed',json.dumps(failures),bid))
    return {'batch_id':bid,'results':results,'processed':len(results),'failed':len(failures)}

@app.get('/batches/{batch_id}/progress')
def batch_progress(batch_id:int):
    with connect() as con: row=con.execute('SELECT * FROM batches WHERE id=?',(batch_id,)).fetchone()
    if not row: raise HTTPException(404,'Batch not found')
    d=dict(row);d['errors']=json.loads(d['errors']);return d

@app.get('/candidates')
def candidates(cgpa_min:float|None=None,tenth_min:float|None=None,twelfth_min:float|None=None,experience_min:int|None=None,experience_max:int|None=None,city:str|None=None,grad_year:int|None=None,skills_all:str|None=None,skills_any:str|None=None,skills_none:str|None=None,search:str|None=None,include_unknown:bool=False,limit:int=Query(50,ge=1,le=500),offset:int=Query(0,ge=0)):
    clauses=[];params=[]
    for field,value,op in [('cgpa_10',cgpa_min,'>='),('tenth_pct',tenth_min,'>='),('twelfth_pct',twelfth_min,'>='),('experience_months',experience_min,'>='),('experience_months',experience_max,'<='),('grad_year',grad_year,'=')]:
        if value is not None:
            clauses.append(f'(c.{field} {op} ?'+(f' OR c.{field} IS NULL)' if include_unknown else ')'))
            params.append(value)
    if city: clauses.append('(LOWER(c.city)=LOWER(?)'+(' OR c.city IS NULL)' if include_unknown else ')'));params.append(city)
    if search: clauses.append('(LOWER(COALESCE(c.name,\'\') || \' \' || COALESCE(c.email,\'\') || \' \' || COALESCE(c.raw_text,\'\')) LIKE ?)');params.append('%'+search.lower()+'%')
    for mode,value in [('all',skills_all),('any',skills_any),('none',skills_none)]:
        skills=[s.strip().lower() for s in (value or '').split(',') if s.strip()]
        if not skills: continue
        matches='SELECT 1 FROM candidate_skills s WHERE s.candidate_id=c.id AND LOWER(s.skill)=?'
        if mode=='all':
            for skill in skills: clauses.append('EXISTS ('+matches+')');params.append(skill)
        elif mode=='none':
            for skill in skills: clauses.append('NOT EXISTS ('+matches+')');params.append(skill)
        else:
            clauses.append('EXISTS (SELECT 1 FROM candidate_skills s WHERE s.candidate_id=c.id AND LOWER(s.skill) IN ('+','.join('?'*len(skills))+'))');params+=skills
    where=' WHERE '+' AND '.join(clauses) if clauses else ''
    with connect() as con:
        total=con.execute('SELECT COUNT(*) AS n FROM candidates c'+where,params).fetchone()['n']
        rows=con.execute('SELECT c.* FROM candidates c'+where+' ORDER BY c.id DESC LIMIT ? OFFSET ?',params+[limit,offset]).fetchall()
        return {'total':total,'items':[candidate_dict(con,r) for r in rows]}

@app.get('/candidates/{candidate_id}')
def candidate(candidate_id:int):
    with connect() as con:
        row=con.execute('SELECT * FROM candidates WHERE id=?',(candidate_id,)).fetchone()
        if not row: raise HTTPException(404,'Candidate not found')
        return candidate_dict(con,row)

@app.patch('/candidates/{candidate_id}')
def edit_candidate(candidate_id:int,changes:dict):
    allowed={'name','email','phone','city','cgpa_10','tenth_pct','twelfth_pct','grad_year','experience_months','linkedin','github'}
    updates={k:v for k,v in changes.items() if k in allowed}
    with connect() as con:
        if not con.execute('SELECT 1 FROM candidates WHERE id=?',(candidate_id,)).fetchone(): raise HTTPException(404,'Candidate not found')
        if updates: con.execute('UPDATE candidates SET '+','.join(k+'=?' for k in updates)+' WHERE id=?',list(updates.values())+[candidate_id])
    return candidate(candidate_id)

@app.post('/jobs')
def create_job(job:JobIn):
    required=job.required_skills if job.required_skills is not None else skills_in(job.description)
    preferred=job.preferred_skills or []
    with connect() as con:
        jid=con.execute('INSERT INTO jobs(title,description,required_skills,preferred_skills,min_experience_months,location) VALUES (?,?,?,?,?,?)',(job.title,job.description,json.dumps(required),json.dumps(preferred),job.min_experience_months,job.location)).lastrowid
    return {'id':jid,'required_skills':required,'preferred_skills':preferred}

@app.patch('/jobs/{job_id}')
def edit_job(job_id:int,changes:dict):
    allowed={'title','description','required_skills','preferred_skills','min_experience_months','location'}
    changes={k:(json.dumps(v) if k.endswith('_skills') else v) for k,v in changes.items() if k in allowed}
    with connect() as con:
        if not con.execute('SELECT 1 FROM jobs WHERE id=?',(job_id,)).fetchone(): raise HTTPException(404,'Job not found')
        if changes: con.execute('UPDATE jobs SET '+','.join(k+'=?' for k in changes)+' WHERE id=?',list(changes.values())+[job_id])
    return {'id':job_id,'updated':True}

def score(job,c):
    req=set(json.loads(job['required_skills'] or '[]'));pref=set(json.loads(job['preferred_skills'] or '[]'));have=set(c['skills'])
    required_score=60*len(req&have)/len(req) if req else 60
    preferred_score=20*len(pref&have)/len(pref) if pref else 20
    exp_score=15 if (c.get('experience_months') or 0)>=(job['min_experience_months'] or 0) else 0
    loc_score=5 if not job['location'] or (c.get('city') or '').lower()==job['location'].lower() else 0
    breakdown={'matched_required':sorted(req&have),'missing_required':sorted(req-have),'matched_preferred':sorted(pref&have),'missing_preferred':sorted(pref-have),'required_points':round(required_score,2),'preferred_points':round(preferred_score,2),'experience_points':exp_score,'location_points':loc_score}
    return round(required_score+preferred_score+exp_score+loc_score,2),breakdown

@app.get('/jobs/{job_id}/ranking')
def ranking(job_id:int,limit:int=Query(100,ge=1,le=500)):
    with connect() as con:
        job=con.execute('SELECT * FROM jobs WHERE id=?',(job_id,)).fetchone()
        if not job: raise HTTPException(404,'Job not found')
        result=[]
        for r in con.execute('SELECT * FROM candidates').fetchall():
            c=candidate_dict(con,r);points,breakdown=score(job,c)
            result.append({'candidate':c,'score':points,'breakdown':breakdown})
    return {'job_id':job_id,'items':sorted(result,key=lambda x:-x['score'])[:limit]}

@app.post('/applications')
def apply(body:ApplyIn):
    with connect() as con:
        if not con.execute('SELECT 1 FROM candidates WHERE id=?',(body.candidate_id,)).fetchone() or not con.execute('SELECT 1 FROM jobs WHERE id=?',(body.job_id,)).fetchone(): raise HTTPException(404,'Candidate or job not found')
        try: aid=con.execute('INSERT INTO applications(candidate_id,job_id) VALUES (?,?)',(body.candidate_id,body.job_id)).lastrowid
        except Exception: raise HTTPException(409,'Application already exists')
    return {'id':aid,'stage':'Applied'}

STAGES=['Applied','Screening','Shortlisted','Interview','Hired']
@app.post('/applications/{application_id}/move')
def move(application_id:int,body:MoveIn):
    with connect() as con:
        r=con.execute('SELECT stage FROM applications WHERE id=?',(application_id,)).fetchone()
        if not r: raise HTTPException(404,'Application not found')
        old=r['stage']
        if body.stage not in STAGES or STAGES.index(body.stage)!=STAGES.index(old)+1: raise HTTPException(400,'Only the next pipeline stage is allowed')
        con.execute('UPDATE applications SET stage=? WHERE id=?',(body.stage,application_id))
        con.execute('INSERT INTO stage_history(application_id,from_stage,to_stage) VALUES (?,?,?)',(application_id,old,body.stage))
    return {'id':application_id,'from_stage':old,'stage':body.stage}

@app.get('/applications')
def applications(job_id:int|None=None):
    with connect() as con:
        q='SELECT * FROM applications'+(' WHERE job_id=?' if job_id else '')
        return [dict(r) for r in con.execute(q,(job_id,) if job_id else ())]

@app.get('/applications/{application_id}/history')
def history(application_id:int):
    with connect() as con: return [dict(r) for r in con.execute('SELECT * FROM stage_history WHERE application_id=? ORDER BY id',(application_id,))]

@app.get('/jobs/{job_id}/skill-gap')
def skill_gap(job_id:int):
    ranked=ranking(job_id)
    totals={}
    for entry in ranked['items']:
        for s in entry['breakdown']['missing_required']: totals[s]=totals.get(s,0)+1
    return {'job_id':job_id,'missing_skill_counts':totals}

@app.get('/compare')
def compare(ids:str):
    try: candidate_ids=[int(x) for x in ids.split(',')]
    except ValueError: raise HTTPException(400,'ids must be comma-separated integers')
    if not 2<=len(candidate_ids)<=3 or len(set(candidate_ids))!=len(candidate_ids): raise HTTPException(400,'Choose 2 or 3 distinct candidates')
    return {'items':[candidate(i) for i in candidate_ids]}

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

    body = schema["components"]["schemas"]["Body_bulk_resumes_bulk_post"]
    file_schema = body["properties"]["files"]["items"]

    file_schema.pop("contentMediaType", None)
    file_schema["format"] = "binary"

    app.openapi_schema = schema
    return schema

app.openapi = custom_openapi
