#!/usr/bin/env python3
"""
HireSwift test-data generator.

Creates 56 resumes (PDF + DOCX, five layouts, mixed score formats, 6 duplicates),
3 edge-case files, 5 job descriptions, a field-level answer key, a JD answer key and
14 known-answer filter tests. Everything is deterministic (fixed seed), so the answer
key always matches the files.

Usage:  python generate_test_data.py [output_dir]
"""
import csv, os, random, shutil, subprocess, sys, tempfile
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, HRFlowable)
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from PIL import Image, ImageFilter
import numpy as np

OUT = sys.argv[1] if len(sys.argv) > 1 else "HireSwift_TestData"
RES = os.path.join(OUT, "resumes")
EDGE = os.path.join(OUT, "edge_cases")
JDS = os.path.join(OUT, "jds")
for d in (RES, EDGE, JDS):
    os.makedirs(d, exist_ok=True)

R = random.Random(2026)
REF_Y, REF_M = 2026, 11                      # "Present" = Nov 2026
REF_IDX = REF_Y * 12 + REF_M
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August",
               "September", "October", "November", "December"]

# --------------------------------------------------------------------------- taxonomy
SKILLS = {  # canonical -> aliases that may appear in resumes
    "Python": ["Python", "Python3", "Py"], "JavaScript": ["JavaScript", "JS", "ECMAScript"],
    "TypeScript": ["TypeScript", "TS"], "React": ["React", "ReactJS", "React.js"],
    "Node.js": ["Node.js", "NodeJS", "Node"], "Java": ["Java"],
    "Spring Boot": ["Spring Boot", "SpringBoot"], "SQL": ["SQL"],
    "PostgreSQL": ["PostgreSQL", "Postgres"], "MySQL": ["MySQL"],
    "MongoDB": ["MongoDB", "Mongo"], "Docker": ["Docker"],
    "Kubernetes": ["Kubernetes", "K8s"], "AWS": ["AWS", "Amazon Web Services"],
    "Git": ["Git", "GitHub"], "Machine Learning": ["Machine Learning", "ML"],
    "Deep Learning": ["Deep Learning"], "TensorFlow": ["TensorFlow"],
    "PyTorch": ["PyTorch"], "Pandas": ["Pandas"], "NumPy": ["NumPy"],
    "Django": ["Django"], "Flask": ["Flask"], "FastAPI": ["FastAPI"],
    "Angular": ["Angular", "AngularJS"], "Vue.js": ["Vue.js", "Vue", "VueJS"],
    "HTML": ["HTML", "HTML5"], "CSS": ["CSS", "CSS3"], "Tailwind CSS": ["Tailwind CSS", "Tailwind"],
    "Redis": ["Redis"], "Kafka": ["Kafka", "Apache Kafka"], "Go": ["Go", "Golang"],
    "C++": ["C++"], "REST APIs": ["REST APIs", "RESTful APIs", "REST"], "GraphQL": ["GraphQL"],
    "Jenkins": ["Jenkins"], "Terraform": ["Terraform"], "Linux": ["Linux"],
    "Figma": ["Figma"], "Selenium": ["Selenium"], "Excel": ["Excel", "MS Excel"],
    "Tableau": ["Tableau"], "Power BI": ["Power BI", "PowerBI"],
    "Spark": ["Spark", "PySpark", "Apache Spark"], "Airflow": ["Airflow", "Apache Airflow"],
    "Flutter": ["Flutter"], "Kotlin": ["Kotlin"], "Azure": ["Azure", "Microsoft Azure"],
    "GCP": ["GCP", "Google Cloud"], "CI/CD": ["CI/CD"], "Agile": ["Agile", "Scrum"],
}
ARCH = {  # archetype -> (core skills, optional skills)
    "backend": (["Python", "SQL", "REST APIs", "Git"],
                ["Django", "Flask", "FastAPI", "PostgreSQL", "Docker", "Redis", "AWS", "Kafka",
                 "MongoDB", "Linux", "CI/CD", "Kubernetes", "Java", "Spring Boot", "Go"]),
    "java": (["Java", "Spring Boot", "SQL", "Git"],
             ["MySQL", "Docker", "Kubernetes", "Kafka", "AWS", "REST APIs", "Redis", "Jenkins", "CI/CD"]),
    "frontend": (["JavaScript", "HTML", "CSS", "Git"],
                 ["React", "TypeScript", "Tailwind CSS", "Figma", "Vue.js", "Angular", "REST APIs",
                  "GraphQL", "Node.js", "CI/CD"]),
    "fullstack": (["JavaScript", "React", "Node.js", "SQL", "Git"],
                  ["TypeScript", "PostgreSQL", "MongoDB", "Docker", "AWS", "REST APIs", "GraphQL",
                   "Redis", "Tailwind CSS", "CI/CD"]),
    "data": (["Python", "SQL", "Pandas", "NumPy"],
             ["Machine Learning", "Spark", "Airflow", "Tableau", "Power BI", "PostgreSQL", "AWS",
              "Docker", "Excel", "Deep Learning", "TensorFlow", "PyTorch", "GCP"]),
    "devops": (["Linux", "Docker", "Git", "CI/CD"],
               ["Kubernetes", "Terraform", "AWS", "Jenkins", "Azure", "Python", "GCP"]),
    "qa": (["Selenium", "SQL", "Agile", "Git"],
           ["Python", "Java", "Jenkins", "CI/CD", "REST APIs", "Excel"]),
    "fresher": (["Python", "SQL", "Git", "HTML"],
                ["C++", "Java", "CSS", "JavaScript", "Machine Learning", "Linux", "React", "Flask",
                 "Excel", "MySQL"]),
}
TITLES = {
    "backend": ["Backend Developer", "Software Engineer", "Senior Backend Engineer"],
    "java": ["Java Developer", "Software Engineer", "Senior Java Engineer"],
    "frontend": ["Frontend Developer", "UI Engineer", "Senior Frontend Engineer"],
    "fullstack": ["Full Stack Developer", "Software Engineer", "Senior Full Stack Engineer"],
    "data": ["Data Analyst", "Data Engineer", "Senior Data Engineer"],
    "devops": ["DevOps Engineer", "Site Reliability Engineer", "Senior DevOps Engineer"],
    "qa": ["QA Engineer", "Test Automation Engineer", "Senior QA Engineer"],
    "fresher": ["Software Engineer Intern", "Technical Intern", "Intern"],
}
BULLETS = [
    "Built and maintained {s1} services used by {n} daily active users.",
    "Reduced average response time by {p}% by tuning {s1} queries and caching.",
    "Collaborated with product and design teams to ship {n} features using {s2}.",
    "Wrote automated tests and set up CI pipelines, cutting release time by {p}%.",
    "Migrated legacy modules to {s1}, improving reliability and developer velocity.",
    "Mentored {m} junior engineers and led weekly code reviews.",
    "Designed dashboards and reports with {s1}, adopted by {m} internal teams.",
    "Deployed workloads using {s2} and monitored them with alerts and runbooks.",
]
COMPANIES = ["Zenith Labs", "Crestline Technologies", "Nimbus Data", "Orchid Software",
             "BlueKite Systems", "Pixelforge Studio", "Kiran Infotech", "Vertex Analytics",
             "Saffron Cloud", "Lotus Payments", "Aarna Digital", "Kestrel Mobility",
             "Banyan Retail Tech", "Tattva AI", "Meridian Health Tech", "Quillpad Software"]
PROJECTS = [
    ("Smart Attendance System", "Face-recognition attendance tracker with admin dashboard."),
    ("Expense Tracker", "Personal finance app with charts and monthly budget alerts."),
    ("Campus Marketplace", "Buy/sell platform for students with chat and listings."),
    ("Movie Recommender", "Content-based recommender trained on public ratings data."),
    ("Realtime Chat App", "Websocket chat with rooms, typing indicators and history."),
    ("Inventory Manager", "Stock management tool with low-stock alerts and reports."),
    ("Sales Dashboard", "Interactive dashboard summarising regional sales trends."),
    ("URL Shortener", "Link shortening service with analytics and rate limiting."),
    ("Resume Analyzer", "Parses resumes and scores them against job descriptions."),
    ("Weather Notifier", "Daily weather alerts via email for saved locations."),
]
CERTS = ["AWS Certified Cloud Practitioner", "Google Data Analytics Certificate",
         "Oracle Certified Associate, Java SE", "NPTEL: Data Structures and Algorithms",
         "Microsoft Azure Fundamentals (AZ-900)", "HackerRank Python (Gold)",
         "Coursera Machine Learning Specialization", "Meta Front-End Developer Certificate"]

COLLEGES = [  # canonical, long form used in some resumes
    ("IIT Delhi", "Indian Institute of Technology Delhi"),
    ("IIT Bombay", "Indian Institute of Technology Bombay"),
    ("IIT Madras", "Indian Institute of Technology Madras"),
    ("NIT Trichy", "National Institute of Technology Tiruchirappalli"),
    ("NIT Warangal", "National Institute of Technology Warangal"),
    ("BITS Pilani", "Birla Institute of Technology and Science, Pilani"),
    ("VIT Vellore", "Vellore Institute of Technology"),
    ("DTU", "Delhi Technological University"),
    ("NSUT", "Netaji Subhas University of Technology"),
    ("IIIT Hyderabad", "International Institute of Information Technology Hyderabad"),
    ("Manipal Institute of Technology", "Manipal Institute of Technology"),
    ("SRM Institute of Science and Technology", "SRM Institute of Science and Technology"),
    ("PES University", "PES University"), ("Amity University", "Amity University"),
    ("KIIT University", "KIIT University"), ("Thapar Institute of Engineering and Technology",
                                              "Thapar Institute of Engineering and Technology"),
    ("Jadavpur University", "Jadavpur University"), ("COEP Technological University", "COEP Technological University"),
    ("RV College of Engineering", "RV College of Engineering"),
    ("Christ University", "Christ University"),
]
CITIES = [  # canonical, aliases seen in resumes
    ("Bengaluru", ["Bengaluru", "Bangalore", "Bengaluru, Karnataka"]),
    ("Delhi", ["Delhi", "New Delhi", "Delhi NCR"]),
    ("Noida", ["Noida", "Noida, Uttar Pradesh", "Noida, UP"]),
    ("Gurugram", ["Gurugram", "Gurgaon", "Gurgaon, Haryana"]),
    ("Pune", ["Pune", "Pune, Maharashtra"]),
    ("Hyderabad", ["Hyderabad", "Hyderabad, Telangana"]),
    ("Chennai", ["Chennai", "Chennai, Tamil Nadu"]),
    ("Mumbai", ["Mumbai", "Bombay", "Mumbai, Maharashtra"]),
    ("Kolkata", ["Kolkata", "Calcutta"]),
    ("Jaipur", ["Jaipur", "Jaipur, Rajasthan"]),
    ("Ahmedabad", ["Ahmedabad"]), ("Chandigarh", ["Chandigarh"]),
]
FIRST = ["Aarav", "Vihaan", "Arjun", "Rohan", "Kabir", "Ishaan", "Rahul", "Aditya", "Nikhil", "Varun",
         "Tarun", "Manish", "Pranav", "Harsh", "Kunal", "Anand", "Deepak", "Gautam", "Sanjay", "Vikram",
         "Ananya", "Priya", "Sneha", "Kavita", "Neha", "Pooja", "Divya", "Meera", "Shreya", "Ritu",
         "Aditi", "Tanvi", "Simran", "Pallavi", "Swati", "Nandini", "Ankita", "Aarti", "Geeta", "Bhavna",
         "Isha", "Riya", "Kriti", "Sakshi", "Mansi", "Yash", "Dev", "Samar", "Tanmay", "Lakshmi"]
LAST = ["Sharma", "Verma", "Patel", "Singh", "Gupta", "Iyer", "Nair", "Reddy", "Mehta", "Kapoor",
        "Joshi", "Kulkarni", "Desai", "Bose", "Das", "Menon", "Rao", "Chopra", "Saxena", "Tiwari",
        "Pandey", "Mishra", "Agarwal", "Bansal", "Jain", "Chauhan", "Malhotra", "Bhatia", "Soni",
        "Hegde", "Pillai", "Krishnan", "Narasimhan", "Murthy", "Sen", "Roy", "Kaur", "Aggarwal", "Yadav", "Thakur"]
DOMAINS = ["gmail.com", "gmail.com", "gmail.com", "outlook.com", "yahoo.co.in", "hotmail.com", "proton.me"]

# --------------------------------------------------------------------------- candidate model
def midx(y, m): return y * 12 + (m - 1)

def fmt_date(y, m, style):
    if style == 0: return f"{MONTHS[m-1]} {y}"
    if style == 1: return f"{m:02d}/{y}"
    if style == 2: return f"{MONTHS_FULL[m-1]} {y}"
    return f"{MONTHS[m-1]}'{str(y)[2:]}"

def merged_months(ranges):
    rs = sorted(ranges)
    total, cur_s, cur_e = 0, None, None
    for s, e in rs:
        if cur_s is None: cur_s, cur_e = s, e
        elif s <= cur_e: cur_e = max(cur_e, e)
        else:
            total += cur_e - cur_s; cur_s, cur_e = s, e
    if cur_s is not None: total += cur_e - cur_s
    return total

PINS = {  # index -> overrides, used for the demo query, duplicates, and edge cases
    3: dict(city="Noida", arch="backend", grad=2022, cgpa=8.4, extra=["Python", "SQL"]),
    7: dict(name=("Siddharth", "Menon"), city="Bengaluru", arch="fullstack", grad=2023),
    10: dict(city="Noida", arch="data", grad=2021, cgpa=7.9, extra=["Python"]),
    15: dict(city="Noida", arch="backend", grad=2020, cgpa=8.1, extra=["Python", "SQL"]),
    19: dict(name=("Karthik", "Sundaram"), city="Chennai", arch="java", grad=2020, cgpa=8.7),
    24: dict(city="Noida", arch="fullstack", grad=2022, cgpa=7.6, extra=["Python"]),
    33: dict(city="Noida", arch="data", grad=2020, cgpa=8.0, extra=["Python", "SQL"]),
    # deliberately missing / unusual data (include_unknown tests)
    4: dict(cgpa_style="missing"), 17: dict(cgpa_style="missing"), 28: dict(cgpa_style="missing"),
    9: dict(no_tenth=True), 22: dict(no_twelfth=True), 36: dict(no_tenth=True, no_twelfth=True),
    41: dict(no_email=True),
    # freshers and a no-skills-section resume
    1: dict(arch="fresher", grad=2026), 5: dict(arch="fresher", grad=2026), 13: dict(arch="fresher", grad=2025),
    21: dict(arch="fresher", grad=2025), 30: dict(arch="fresher", grad=2026), 38: dict(arch="fresher", grad=2025),
    44: dict(arch="fresher", grad=2026), 47: dict(arch="fresher", grad=2025),
    12: dict(no_skills_section=True),
}

def make_candidate(i):
    p = PINS.get(i, {})
    arch = p.get("arch") or R.choices(list(ARCH), weights=[16, 8, 10, 14, 14, 6, 6, 0])[0]
    first, last = p.get("name") or (FIRST[(i * 7) % len(FIRST)], LAST[(i * 11 + i // 5) % len(LAST)])
    grad = p.get("grad") or R.choice([2019, 2020, 2020, 2021, 2021, 2022, 2022, 2023, 2023, 2024, 2024, 2025, 2025, 2026])
    if arch == "fresher" and grad < 2025: grad = 2025
    cgpa10 = p.get("cgpa") or round(min(9.7, max(6.0, R.gauss(7.9, 0.8))), 1)
    cs = p.get("cgpa_style") or R.choices(["ten", "label", "percent", "four", "ten_long"], weights=[40, 18, 14, 10, 18])[0]
    if cs == "missing": cgpa_raw, cgpa_truth = "", ""
    elif cs == "percent":
        pct = round(cgpa10 * 9.5, 1); cgpa_raw = f"{pct}%"; cgpa_truth = round(pct / 9.5, 2)
    elif cs == "four":
        g = round(cgpa10 / 10 * 4, 2); cgpa_raw = f"{g}/4.0"; cgpa_truth = round(g / 4 * 10, 2)
    elif cs == "label": cgpa_raw = f"CGPA: {cgpa10}"; cgpa_truth = cgpa10
    elif cs == "ten_long": cgpa_raw = f"{cgpa10} / 10.0 CGPA"; cgpa_truth = cgpa10
    else: cgpa_raw = f"{cgpa10}/10"; cgpa_truth = cgpa10

    def board(skip, lo):
        if skip: return None
        pct = round(min(98.4, max(lo, R.gauss(86, 6))), 1)
        st = R.choices(["pct", "cgpa", "marks"], weights=[70, 12, 18])[0]
        return dict(pct=pct, style=st)
    tenth = board(p.get("no_tenth"), 62); twelfth = board(p.get("no_twelfth"), 60)
    if twelfth and twelfth["style"] == "cgpa": twelfth["style"] = "pct"   # CGPA style only for Class X
    for b in (tenth, twelfth):
        if b and b["style"] == "cgpa": b["cgpa"] = round(b["pct"] / 9.5, 1); b["pct"] = round(b["cgpa"] * 9.5, 1)
        if b and b["style"] == "marks": b["obt"] = int(round(b["pct"] * 5)); b["pct"] = round(b["obt"] / 500 * 100, 1)

    cname, clong = R.choice(COLLEGES)
    degree, branch = R.choice([("B.Tech", "Computer Science and Engineering"), ("B.Tech", "Information Technology"),
                               ("B.Tech", "Electronics and Communication Engineering"), ("B.E.", "Computer Science"),
                               ("BCA", "Computer Applications"), ("B.Sc", "Computer Science"),
                               ("M.Tech", "Computer Science"), ("MCA", "Computer Applications")])
    start_deg = grad - (2 if degree in ("M.Tech", "MCA") else 3 if degree in ("BCA", "B.Sc") else 4)
    city = p.get("city") or R.choices([c[0] for c in CITIES], weights=[24, 12, 9, 8, 10, 10, 8, 7, 3, 3, 3, 3])[0]
    city_aliases = dict(CITIES)[city]
    # skills
    core, opt = ARCH[arch]
    skills = list(dict.fromkeys(core + R.sample(opt, k=min(len(opt), R.randint(2, 6))) + p.get("extra", [])))
    # experience
    exp = []
    if grad <= 2025 or (grad == 2026 and arch == "fresher" and R.random() < .6):
        pass
    senior = 0
    if grad <= 2025:
        s_idx = midx(grad, 7)
        span = REF_IDX - s_idx
        if span > 1:
            n_jobs = 1 if span < 20 else R.choice([1, 2, 2, 3]) if span < 60 else R.choice([2, 3, 3])
            cuts = sorted(R.sample(range(3, max(4, span - 2)), n_jobs - 1)) if n_jobs > 1 and span > 12 else []
            bounds = [0] + cuts + [span]
            for j in range(len(bounds) - 1):
                s = s_idx + bounds[j]; e = s_idx + bounds[j + 1]
                if j == len(bounds) - 2 and R.random() < 0.6: e = REF_IDX; cur = True
                else: cur = False
                exp.append(dict(title=TITLES[arch if arch != "fresher" else "backend"][min(j, 2)],
                                company=R.choice(COMPANIES), s=s, e=e, cur=cur))
        if R.random() < 0.12 and exp:   # overlapping freelance / part-time work
            base = R.choice(exp)
            s = base["s"] + 2; e = min(base["e"] + 3, REF_IDX)
            exp.append(dict(title="Freelance Developer", company="Self-employed", s=s, e=e, cur=False))
    if arch == "fresher" or grad >= 2025:
        for k in range(R.choice([0, 0, 0, 1, 2]) if arch == 'fresher' else R.choice([0, 0, 1, 2]) if grad >= 2025 else 0):
            s = midx(grad - 1, R.choice([5, 6])) + k * 4
            exp.append(dict(title=TITLES["fresher"][k % 3], company=R.choice(COMPANIES), s=s, e=s + R.choice([2, 3, 6]), cur=False))
    exp.sort(key=lambda x: x["s"], reverse=True)
    exp_months = merged_months([(x["s"], x["e"]) for x in exp])
    projects = R.sample(PROJECTS, k=R.randint(1, 3))
    certs = R.sample(CERTS, k=R.choice([0, 0, 1, 2]))
    handle = f"{first.lower()}{last.lower()}{R.randint(1, 99)}"
    email = None if p.get("no_email") else f"{first.lower()}.{last.lower()}{R.choice(['', str(R.randint(1, 99)), str(R.randint(1990, 2003))])}@{R.choice(DOMAINS)}"
    digits = f"{R.choice('6789')}{R.randint(100000000, 999999999)}"
    return dict(i=i, cid=f"C{i:03d}", first=first, last=last, name=f"{first} {last}", email=email, digits=digits,
                city=city, city_alias=R.choice(city_aliases), college=cname, college_long=clong, degree=degree, branch=branch,
                grad=grad, start_deg=start_deg, arch=arch, cgpa_raw=cgpa_raw, cgpa=cgpa_truth, cgpa_style=cs,
                tenth=tenth, twelfth=twelfth, skills=skills, exp=exp, exp_months=exp_months, projects=projects,
                certs=certs, linkedin=R.random() < .7, github=R.random() < .6, handle=handle,
                no_skills_section=p.get("no_skills_section", False), uses_present=any(x["cur"] for x in exp),
                dstyle=R.randrange(4), phone_style=R.randrange(5))

def phone_str(c):
    d = c["digits"]
    return [f"+91 {d[:5]} {d[5:]}", d, f"+91-{d}", f"(+91) {d[:5]}-{d[5:]}", f"0{d[:5]} {d[5:]}"][c["phone_style"]]

def skill_text(c, alias=True):
    out = []
    for s in c["skills"]:
        out.append(R.choice(SKILLS[s]) if alias else s)
    return out

def board_line(label, b, board_name, year):
    if not b: return None
    if b["style"] == "pct": sc = f"{b['pct']}%"
    elif b["style"] == "cgpa": sc = f"{b['cgpa']} CGPA"
    else: sc = f"{b['obt']}/500"
    return f"{label} ({board_name}) \u2013 {sc} \u2013 {year}"

def build(c):
    """Turn a candidate into display text blocks shared by every renderer."""
    r = random.Random(c["i"] * 131)
    x_lab, xii_lab = r.choice([("Class X", "Class XII"), ("10th", "12th"), ("SSC", "HSC"),
                               ("Secondary (X)", "Senior Secondary (XII)"), ("Matriculation", "Intermediate")])
    boards = r.choice(["CBSE", "ICSE", "State Board"])
    contact = []
    if c["email"]: contact.append(c["email"])
    contact.append(phone_str(c))
    contact.append(c["city_alias"])
    if c["linkedin"]: contact.append(f"linkedin.com/in/{c['first'].lower()}-{c['last'].lower()}-{c['i']:02d}")
    if c["github"]: contact.append(f"github.com/{c['handle']}")
    college = c["college_long"] if r.random() < .35 else c["college"]
    when = (f"Expected {MONTHS_FULL[5]} {c['grad']}" if c["grad"] == 2026 and r.random() < .5
            else f"{c['start_deg']} \u2013 {c['grad']}" if r.random() < .6 else f"Graduated {MONTHS[4]} {c['grad']}")
    edu_main = f"{c['degree']} in {c['branch']}, {college}, {when}"
    if c["cgpa_raw"]: edu_main_full = f"{edu_main}  |  {c['cgpa_raw']}"
    else: edu_main_full = edu_main
    schools = []
    if c["twelfth"]: schools.append(board_line(xii_lab, c["twelfth"], boards, c["start_deg"]))
    if c["tenth"]: schools.append(board_line(x_lab, c["tenth"], boards, c["start_deg"] - 2))
    exp = []
    for e in c["exp"]:
        sy, sm = divmod(e["s"], 12); ey, em = divmod(e["e"], 12)
        sd = fmt_date(sy, sm + 1, c["dstyle"])
        ed = "Present" if e["cur"] else fmt_date(ey, em + 1, c["dstyle"])
        sk = r.sample(c["skills"], k=min(2, len(c["skills"])))
        bl = [t.format(s1=sk[0], s2=sk[-1], n=r.choice([3, 5, 8, 12]), p=r.choice([15, 20, 30, 40]), m=r.choice([2, 3, 4]))
              for t in r.sample(BULLETS, k=2)]
        exp.append((f"{e['title']}, {e['company']}", f"{sd} \u2013 {ed}", bl))
    projects = [(n, d + f" Tech: {', '.join(r.sample(c['skills'], k=min(3, len(c['skills']))))}.") for n, d in c["projects"]]
    skills = skill_text(c)
    summary = (f"{'Final-year' if c['grad'] >= 2026 else 'Recent'} {c['degree']} graduate seeking a software role." if not c["exp"]
               else f"{c['exp_months'] // 12}+ years of experience building software with {', '.join(skills[:3])}.")
    heads = r.choice([
        dict(edu="EDUCATION", exp="WORK EXPERIENCE", proj="PROJECTS", sk="SKILLS", cert="CERTIFICATIONS", sum="SUMMARY"),
        dict(edu="Academic Background", exp="Professional Experience", proj="Personal Projects", sk="Technical Skills", cert="Courses & Certificates", sum="Profile"),
        dict(edu="Qualifications", exp="Employment History", proj="Selected Work", sk="What I Know", cert="Certifications", sum="About Me"),
    ])
    if c["no_skills_section"]:   # skills only visible inside projects/experience text
        skills = []
    return dict(contact=contact, edu_main=edu_main_full, schools=schools, exp=exp, projects=projects,
                skills=skills, certs=c["certs"], summary=summary, heads=heads, r=r)

# --------------------------------------------------------------------------- renderers
def pdf_styles(accent):
    return dict(
        name=ParagraphStyle("n", fontName="Helvetica-Bold", fontSize=22, leading=26, textColor=accent),
        h=ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=11.5, leading=14, textColor=accent, spaceBefore=9, spaceAfter=3),
        b=ParagraphStyle("b", fontName="Helvetica", fontSize=9.5, leading=12.5),
        bi=ParagraphStyle("bi", fontName="Helvetica-Bold", fontSize=9.8, leading=12.5),
        bul=ParagraphStyle("bul", fontName="Helvetica", fontSize=9.5, leading=12.5, leftIndent=12, bulletIndent=2),
        small=ParagraphStyle("s", fontName="Helvetica", fontSize=9, leading=12, textColor=colors.HexColor("#444444")))

def esc(t): return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def pdf_single(c, B, path):
    accent = colors.HexColor(random.Random(c["i"]).choice(["#1F3A5F", "#222222", "#0B6E4F", "#7A1F3D"]))
    S = pdf_styles(accent); H = B["heads"]
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=.7 * inch, rightMargin=.7 * inch, topMargin=.6 * inch, bottomMargin=.6 * inch,
                            title=f"{c['name']} - Resume", author=c["name"])
    f = [Paragraph(esc(c["name"]), S["name"]), Paragraph(esc("  |  ".join(B["contact"])), S["small"]),
         HRFlowable(width="100%", thickness=1, color=accent, spaceBefore=4, spaceAfter=2)]
    f += [Paragraph(H["sum"], S["h"]), Paragraph(esc(B["summary"]), S["b"])]
    f += [Paragraph(H["edu"], S["h"]), Paragraph(esc(B["edu_main"]), S["bi"])]
    f += [Paragraph(esc(s), S["b"]) for s in B["schools"]]
    if B["exp"]:
        f.append(Paragraph(H["exp"], S["h"]))
        for t, d, bl in B["exp"]:
            f += [Paragraph(f"{esc(t)}  <font color='#666666'>({esc(d)})</font>", S["bi"])]
            f += [Paragraph(esc(b), S["bul"], bulletText="\u2022") for b in bl]
    if B["skills"]:
        f += [Paragraph(H["sk"], S["h"]), Paragraph(esc(", ".join(B["skills"])), S["b"])]
    f.append(Paragraph(H["proj"], S["h"]))
    for n, d in B["projects"]:
        f += [Paragraph(esc(n), S["bi"]), Paragraph(esc(d), S["bul"], bulletText="\u2022")]
    if B["certs"]:
        f.append(Paragraph(H["cert"], S["h"])); f += [Paragraph(esc(x), S["bul"], bulletText="\u2022") for x in B["certs"]]
    doc.build(f)

def pdf_twocol(c, B, path):
    accent = colors.HexColor("#2B4C7E"); S = pdf_styles(accent); H = B["heads"]
    left = [Paragraph(esc(c["name"]), ParagraphStyle("nn", parent=S["name"], fontSize=17, leading=20)), Spacer(1, 6),
            Paragraph("CONTACT", S["h"])] + [Paragraph(esc(x), S["small"]) for x in B["contact"]]
    if B["skills"]:
        left += [Paragraph(H["sk"], S["h"])] + [Paragraph(esc(s), S["small"]) for s in B["skills"]]
    if B["certs"]:
        left += [Paragraph(H["cert"], S["h"])] + [Paragraph(esc(x), S["small"]) for x in B["certs"]]
    right = [Paragraph(H["sum"], S["h"]), Paragraph(esc(B["summary"]), S["b"]), Paragraph(H["edu"], S["h"]),
             Paragraph(esc(B["edu_main"]), S["bi"])] + [Paragraph(esc(s), S["b"]) for s in B["schools"]]
    if B["exp"]:
        right.append(Paragraph(H["exp"], S["h"]))
        for t, d, bl in B["exp"]:
            right += [Paragraph(esc(t), S["bi"]), Paragraph(esc(d), S["small"])]
            right += [Paragraph(esc(b), S["bul"], bulletText="\u2022") for b in bl]
    right.append(Paragraph(H["proj"], S["h"]))
    for n, d in B["projects"]:
        right += [Paragraph(esc(n), S["bi"]), Paragraph(esc(d), S["b"])]
    t = Table([[left, right]], colWidths=[2.2 * inch, 4.9 * inch])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#EEF2F8")),
                           ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10)]))
    SimpleDocTemplate(path, pagesize=A4, leftMargin=.4 * inch, rightMargin=.4 * inch, topMargin=.4 * inch, bottomMargin=.4 * inch,
                      title=f"{c['name']} - Resume").build([t])

def pdf_table(c, B, path):
    accent = colors.HexColor("#333333"); S = pdf_styles(accent); H = B["heads"]
    head = Table([[Paragraph(esc(c["name"]), S["name"]), [Paragraph(esc(x), S["small"]) for x in B["contact"]]]], colWidths=[3.6 * inch, 3.5 * inch])
    head.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    rows = [["Qualification", "Institution / Board", "Year", "Score"]]
    parts = B["edu_main"].split("  |  ")
    rows.append([f"{c['degree']} {c['branch']}", c["college_long"], str(c["grad"]), c["cgpa_raw"] or "-"])
    for s in B["schools"]:
        lab, rest = s.split(" (", 1); brd, rest = rest.split(") \u2013 ", 1); sc, yr = rest.split(" \u2013 ")
        rows.append([lab, brd, yr, sc])
    rows = [[Paragraph(esc(str(x)), S["b"]) for x in r] for r in rows]
    et = Table(rows, colWidths=[2.2 * inch, 2.6 * inch, .7 * inch, 1.5 * inch])
    et.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), .5, colors.grey), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E6E6E6"))]))
    f = [head, HRFlowable(width="100%", thickness=1, color=accent, spaceBefore=4), Paragraph(H["edu"], S["h"]), et]
    if B["exp"]:
        f.append(Paragraph(H["exp"], S["h"]))
        er = [["Role & Company", "Duration", "Highlights"]]
        for t, d, bl in B["exp"]:
            er.append([t, d, "; ".join(bl)])
        er = [[Paragraph(esc(x), S["b"]) for x in r] for r in er]
        xt = Table(er, colWidths=[2.0 * inch, 1.5 * inch, 3.5 * inch])
        xt.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), .5, colors.grey), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E6E6E6")), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
        f.append(xt)
    if B["skills"]:
        f.append(Paragraph(H["sk"], S["h"]))
        sk = B["skills"]; cols = 4; grid = [sk[i:i + cols] + [""] * (cols - len(sk[i:i + cols])) for i in range(0, len(sk), cols)]
        gt = Table([[Paragraph(esc(x), S["b"]) for x in r] for r in grid], colWidths=[1.75 * inch] * cols)
        gt.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), .5, colors.lightgrey)])); f.append(gt)
    f.append(Paragraph(H["proj"], S["h"]))
    for n, d in B["projects"]:
        f += [Paragraph(esc(n), S["bi"]), Paragraph(esc(d), S["b"])]
    if B["certs"]:
        f.append(Paragraph(H["cert"], S["h"])); f += [Paragraph(esc(x), S["bul"], bulletText="\u2022") for x in B["certs"]]
    SimpleDocTemplate(path, pagesize=A4, leftMargin=.6 * inch, rightMargin=.6 * inch, topMargin=.5 * inch, bottomMargin=.5 * inch,
                      title=f"{c['name']} - Resume").build(f)

def docx_common(c, B, path, tables):
    d = Document()
    sec = d.sections[0]; sec.left_margin = sec.right_margin = Inches(.8); sec.top_margin = sec.bottom_margin = Inches(.7)
    st = d.styles["Normal"]; st.font.name = "Calibri"; st.font.size = Pt(10.5)
    H = B["heads"]
    def head(t):
        p = d.add_paragraph(); r_ = p.add_run(t); r_.bold = True; r_.font.size = Pt(12); r_.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)
        p.paragraph_format.space_before = Pt(8); p.paragraph_format.space_after = Pt(2)
    def grid(rows, widths, header=True):
        t = d.add_table(rows=len(rows), cols=len(rows[0])); t.style = "Table Grid"
        for ri, row in enumerate(rows):
            for ci, val in enumerate(row):
                cell = t.cell(ri, ci); cell.width = Inches(widths[ci]); cell.text = str(val)
                if header and ri == 0:
                    for run in cell.paragraphs[0].runs: run.bold = True
        return t
    if tables:
        t = d.add_table(rows=1, cols=2); t.cell(0, 0).text = ""
        run = t.cell(0, 0).paragraphs[0].add_run(c["name"]); run.bold = True; run.font.size = Pt(20)
        t.cell(0, 1).text = "\n".join(B["contact"])
    else:
        p = d.add_paragraph(); run = p.add_run(c["name"]); run.bold = True; run.font.size = Pt(20)
        d.add_paragraph("  |  ".join(B["contact"]))
    head(H["sum"]); d.add_paragraph(B["summary"])
    head(H["edu"])
    if tables:
        rows = [["Qualification", "Institution / Board", "Year", "Score"], [f"{c['degree']} {c['branch']}", c["college_long"], str(c["grad"]), c["cgpa_raw"] or "-"]]
        for s in B["schools"]:
            lab, rest = s.split(" (", 1); brd, rest = rest.split(") \u2013 ", 1); sc, yr = rest.split(" \u2013 "); rows.append([lab, brd, yr, sc])
        grid(rows, [2.0, 2.4, .8, 1.4])
    else:
        p = d.add_paragraph(); p.add_run(B["edu_main"]).bold = True
        for s in B["schools"]: d.add_paragraph(s)
    if B["exp"]:
        head(H["exp"])
        if tables:
            rows = [["Role & Company", "Duration", "Highlights"]] + [[t_, dd, " ".join(b)] for t_, dd, b in B["exp"]]
            grid(rows, [2.0, 1.4, 3.4])
        else:
            for t_, dd, bl in B["exp"]:
                p = d.add_paragraph(); p.add_run(t_).bold = True; p.add_run(f"   {dd}")
                for b in bl: d.add_paragraph(b, style="List Bullet")
    if B["skills"]:
        head(H["sk"])
        if tables:
            sk = B["skills"]; cols = 4; rows = [sk[i:i + cols] + [""] * (cols - len(sk[i:i + cols])) for i in range(0, len(sk), cols)]
            grid(rows, [1.7] * cols, header=False)
        else:
            d.add_paragraph(", ".join(B["skills"]))
    head(H["proj"])
    for n, dd in B["projects"]:
        p = d.add_paragraph(); p.add_run(n).bold = True; d.add_paragraph(dd, style="List Bullet")
    if B["certs"]:
        head(H["cert"])
        for x in B["certs"]: d.add_paragraph(x, style="List Bullet")
    d.core_properties.author = c["name"]; d.core_properties.title = f"{c['name']} - Resume"
    d.save(path)

def pdf_scanned(c, B, path):
    tmp = tempfile.mkdtemp(); src = os.path.join(tmp, "s.pdf"); pdf_single(c, B, src)
    subprocess.run(["pdftoppm", "-r", "130", "-png", src, os.path.join(tmp, "pg")], check=True)
    imgs = []
    rng = np.random.default_rng(c["i"])
    for fn in sorted(os.listdir(tmp)):
        if not fn.endswith(".png"): continue
        im = Image.open(os.path.join(tmp, fn)).convert("L").rotate(0.7, expand=True, fillcolor=255)
        arr = np.asarray(im).astype(np.float32) + rng.normal(0, 7, (im.height, im.width))
        im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.5))
        imgs.append(im.convert("RGB"))
    imgs[0].save(path, "PDF", resolution=130.0, save_all=True, append_images=imgs[1:])
    shutil.rmtree(tmp)

LAYOUTS = ["pdf_single"] * 16 + ["pdf_twocol"] * 10 + ["pdf_table"] * 6 + ["docx_single"] * 8 + ["docx_table"] * 8 + ["pdf_scanned"] * 2
R.shuffle(LAYOUTS)
RENDER = {"pdf_single": pdf_single, "pdf_twocol": pdf_twocol, "pdf_table": pdf_table, "pdf_scanned": pdf_scanned,
          "docx_single": lambda c, B, p: docx_common(c, B, p, False), "docx_table": lambda c, B, p: docx_common(c, B, p, True)}
LAYOUT_NOTE = {"pdf_single": "single-column PDF", "pdf_twocol": "two-column PDF (sidebar)", "pdf_table": "PDF with tables",
               "docx_single": "single-column DOCX", "docx_table": "DOCX with tables", "pdf_scanned": "scanned image PDF (OCR needed)"}

def fname(c, layout, tag=""):
    ext = "docx" if layout.startswith("docx") else "pdf"
    style = c["i"] % 4
    base = [f"{c['first']}_{c['last']}_Resume", f"{c['name']} - CV", f"Resume_{c['last']}_{c['first']}", f"{c['first']}{c['last']}_{c['grad']}"][style]
    return f"{base}{tag}.{ext}"

# --------------------------------------------------------------------------- generate
rows, cands = [], {}
def key_row(c, file, layout, **extra):
    d = dict(file=file, candidate_id=c["cid"], name=c["name"], email=c["email"] or "", phone_10=c["digits"], city=c["city"],
             college=c["college"], degree=c["degree"], branch=c["branch"], grad_year=c["grad"], cgpa_raw=c["cgpa_raw"],
             cgpa_10=c["cgpa"], tenth_pct=c["tenth"]["pct"] if c["tenth"] else "", twelfth_pct=c["twelfth"]["pct"] if c["twelfth"] else "",
             experience_months=c["exp_months"], skills="|".join(c["skills"]), uses_present=c["uses_present"],
             layout=LAYOUT_NOTE[layout], needs_ocr=layout == "pdf_scanned", dup_of="", dup_type="")
    d.update(extra); return d

used = set()
for i in range(50):
    c = make_candidate(i); cands[i] = c
    layout = LAYOUTS[i]; f = fname(c, layout)
    while f in used: f = fname(c, layout, f"_{i}")
    used.add(f); B = build(c); RENDER[layout](c, B, os.path.join(RES, f))
    c["file"], c["layout"] = f, layout
    rows.append(key_row(c, f, layout))

def add_dup(src_i, dtype, newfile, layout=None, mutate=None, note=""):
    src = cands[src_i]; c = dict(src)
    if mutate: mutate(c)
    lay = layout or src["layout"]
    path = os.path.join(RES, newfile)
    if dtype == "exact_copy":
        shutil.copy(os.path.join(RES, src["file"]), path)
    else:
        RENDER[lay](c, build(c), path)
    rows.append(key_row(c, newfile, lay, dup_of=src["file"], dup_type=dtype))

# D1/D5 exact byte copies; D2 same email different format; D3 fuzzy name + same phone; D4 same email updated; D6 initials
add_dup(5, "exact_copy", "Resume_final_v2 (1).pdf" if cands[5]["layout"].startswith("pdf") else "Resume_final_v2 (1).docx")
add_dup(41 if False else 14, "exact_copy", "my_cv_latest" + (".docx" if cands[14]["layout"].startswith("docx") else ".pdf"))
c12 = cands[12]; add_dup(12, "same_email_other_format", f"{c12['first']}_{c12['last']}_CV_word.docx" if c12["layout"].startswith("pdf") else f"{c12['first']}_{c12['last']}_CV.pdf",
                         layout="docx_single" if c12["layout"].startswith("pdf") else "pdf_single")
def fuzz(c):
    c["first"] = "Kartik"; c["name"] = "Kartik Sundaram"; c["email"] = "kartik.sundaram88@yahoo.co.in"
add_dup(19, "fuzzy_name_same_phone", "Kartik_Sundaram_Resume.pdf", layout="pdf_single", mutate=fuzz)
def updated(c):
    c["exp"] = [dict(title="Lead Engineer", company="Zenith Labs", s=midx(2026, 5), e=REF_IDX, cur=True)] + list(c["exp"])
    c["exp_months"] = merged_months([(x["s"], x["e"]) for x in c["exp"]]); c["uses_present"] = True
add_dup(30 if False else 18, "same_email_updated_resume", f"{cands[18]['first']}_{cands[18]['last']}_Resume_2026_updated.pdf", layout="pdf_single", mutate=updated)
def initials(c):
    c["name"] = "S. Menon"; c["first"] = "S."; c["email"] = c["email"].upper() if c["email"] else c["email"]; c["phone_style"] = (c["phone_style"] + 1) % 5
add_dup(7, "initials_same_phone", "S_Menon_CV.pdf", layout="pdf_twocol", mutate=initials)

# edge cases -----------------------------------------------------------------------------
with open(os.path.join(EDGE, "corrupt_resume.pdf"), "wb") as f:
    f.write(b"%PDF-1.4\n" + bytes(random.Random(1).randrange(256) for _ in range(2048)))
open(os.path.join(EDGE, "zero_byte.pdf"), "wb").close()
with open(os.path.join(EDGE, "notes.txt"), "w") as f:
    f.write("Plain text file. This type must be rejected by the upload endpoint (only PDF and DOCX are allowed).\n")

# answer key ---------------------------------------------------------------------------------
fields = list(rows[0].keys())
with open(os.path.join(OUT, "answer_key.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(rows)

# job descriptions -------------------------------------------------------------------------------
JD = [
    ("full-stack-engineer", "Full Stack Engineer", "Bengaluru", ["React", "Node.js"], ["TypeScript", "PostgreSQL", "Docker", "AWS"], 1, 7.0,
     "We build a recruiting SaaS and need a full stack engineer to own features end to end."),
    ("python-data-engineer", "Python Data Engineer", "Noida", ["Python", "SQL", "Pandas"], ["Airflow", "Spark", "AWS"], 2, 7.5,
     "Build and maintain data pipelines that feed analytics and ML products."),
    ("frontend-react-lead", "Frontend React Lead", "Bengaluru", ["React", "JavaScript", "CSS"], ["TypeScript", "Tailwind CSS", "GraphQL", "Figma"], 3, 7.0,
     "Lead a small frontend team and own the design system and performance budgets."),
    ("campus-graduate-trainee", "Campus Graduate Trainee (2025/2026 batch)", "Pune", ["Python", "SQL"], ["Git", "Java"], 0, 7.0,
     "Early-careers programme for 2025 and 2026 graduates. Minimum 60% in Class X and XII."),
    ("senior-backend-engineer", "Senior Backend Engineer", "Gurugram", ["Python", "SQL", "Docker"], ["REST APIs", "Kubernetes", "Kafka", "AWS", "Redis"], 4, 7.0,
     "Design and scale high-throughput APIs; mentor engineers and drive technical decisions."),
]
jd_rows = []
uniq = [cands[i] for i in range(50)]
for slug, title, loc, req, pref, mexp, mcg, blurb in JD:
    grad_line = "Graduation year: 2025 or 2026\n" if mexp == 0 else ""
    with open(os.path.join(JDS, f"{slug}.md"), "w") as f:
        f.write(f"# {title}\n\n**Location**: {loc}, India\n**Experience**: {mexp}+ years\n"
                f"**Minimum CGPA**: {mcg} / 10\n{grad_line}\n## About the role\n{blurb}\n\n## Required skills\n"
                + "\n".join(f"- {s}" for s in req) + "\n\n## Preferred skills\n" + "\n".join(f"- {s}" for s in pref)
                + "\n\n## What you will do\n- Ship reliable features and improve existing systems.\n- Work with product, design and data teams.\n"
                  "- Review code, write tests and document decisions.\n")
    ok = []
    for c in uniq:
        if not all(s in c["skills"] for s in req): continue
        if c["exp_months"] < mexp * 12: continue
        if c["cgpa"] != "" and c["cgpa"] < mcg: continue
        if mexp == 0 and c["grad"] not in (2025, 2026): continue
        ok.append(c["cid"])
    jd_rows.append(dict(jd_file=f"{slug}.md", title=title, location=loc, required_skills="|".join(req), preferred_skills="|".join(pref),
                        min_experience_years=mexp, min_cgpa=mcg, grad_years="2025|2026" if mexp == 0 else "",
                        hard_filter_pass_candidate_ids="|".join(ok), hard_filter_pass_count=len(ok)))
with open(os.path.join(OUT, "jd_answer_key.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(jd_rows[0])); w.writeheader(); w.writerows(jd_rows)

# filter tests ------------------------------------------------------------------------------------
def sel(pred): return sorted(c["cid"] for c in uniq if pred(c))
def has_all(c, ss): return all(s in c["skills"] for s in ss)
def known(v): return v != "" and v is not None
T = []
def add_t(tid, desc, params, ids): T.append(dict(test_id=tid, description=desc, api_params=params, expected_count=len(ids), expected_candidate_ids="|".join(ids)))
add_t("F01", "CGPA >= 8.0 (unknown CGPA excluded)", "cgpa_min=8.0", sel(lambda c: known(c["cgpa"]) and c["cgpa"] >= 8.0))
add_t("F02", "CGPA >= 8.0 with include_unknown", "cgpa_min=8.0&include_unknown=true", sel(lambda c: (not known(c["cgpa"])) or c["cgpa"] >= 8.0))
add_t("F03", "10th >= 90 and 12th >= 85", "tenth_min=90&twelfth_min=85", sel(lambda c: c["tenth"] and c["twelfth"] and c["tenth"]["pct"] >= 90 and c["twelfth"]["pct"] >= 85))
add_t("F04", "skills_all Python AND SQL", "skills_all=Python,SQL", sel(lambda c: has_all(c, ["Python", "SQL"])))
add_t("F05", "skills_any React OR Angular OR Vue.js", "skills_any=React,Angular,Vue.js", sel(lambda c: any(s in c["skills"] for s in ["React", "Angular", "Vue.js"])))
add_t("F06", "skills_all Python, skills_none Java", "skills_all=Python&skills_none=Java", sel(lambda c: "Python" in c["skills"] and "Java" not in c["skills"]))
add_t("F07", "Experience 2 to 5 years", "exp_min=2&exp_max=5", sel(lambda c: 24 <= c["exp_months"] <= 60))
add_t("F08", "City Bengaluru (Bangalore alias)", "city=Bengaluru", sel(lambda c: c["city"] == "Bengaluru"))
add_t("F09", "Demo query: Noida, Python, CGPA >= 7.5, 2+ years", "city=Noida&skills_all=Python&cgpa_min=7.5&exp_min=2", sel(lambda c: c["city"] == "Noida" and "Python" in c["skills"] and known(c["cgpa"]) and c["cgpa"] >= 7.5 and c["exp_months"] >= 24))
_best = max(range(2019, 2027), key=lambda y: sum(1 for c in uniq if c["grad"] == y and any(s in c["skills"] for s in ["Docker", "Kubernetes"])))
add_t("F10", f"Graduation year {_best} with Docker or Kubernetes", f"grad_year={_best}&skills_any=Docker,Kubernetes", sel(lambda c: c["grad"] == _best and any(s in c["skills"] for s in ["Docker", "Kubernetes"])))
add_t("F11", "React AND JavaScript with 1+ year", "skills_all=React,JavaScript&exp_min=1", sel(lambda c: has_all(c, ["React", "JavaScript"]) and c["exp_months"] >= 12))
add_t("F12", "Freshers (0 months) with CGPA >= 7", "exp_max=0&cgpa_min=7.0", sel(lambda c: c["exp_months"] == 0 and known(c["cgpa"]) and c["cgpa"] >= 7.0))
add_t("F13", "Text search 'IIT'", "q=IIT", sel(lambda c: "IIT" in c["college"]))
add_t("F14", "Gurugram (Gurgaon alias)", "city=Gurugram", sel(lambda c: c["city"] == "Gurugram"))
with open(os.path.join(OUT, "filter_tests.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(T[0])); w.writeheader(); w.writerows(T)

print("resumes:", len(os.listdir(RES)), "| unique candidates: 50 | duplicate files: 6")
for t in T: print(t["test_id"], t["expected_count"], t["description"])
for r_ in jd_rows: print(r_["jd_file"], r_["hard_filter_pass_count"])
