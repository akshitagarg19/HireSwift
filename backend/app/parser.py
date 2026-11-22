import io
import re
from docx import Document
from pypdf import PdfReader

SKILLS = {
    'python': ['python'], 'javascript': ['javascript', 'js'],
    'typescript': ['typescript'], 'react': ['react', 'reactjs'],
    'node.js': ['node.js', 'nodejs'], 'fastapi': ['fastapi'],
    'django': ['django'], 'flask': ['flask'], 'sql': ['sql'],
    'postgresql': ['postgresql', 'postgres'], 'sqlite': ['sqlite'],
    'mysql': ['mysql'], 'docker': ['docker'],
    'kubernetes': ['kubernetes', 'k8s'], 'aws': ['aws', 'amazon web services'],
    'azure': ['azure'], 'git': ['git'], 'java': ['java'],
    'c++': ['c++'], 'c': ['c language'], 'html': ['html'],
    'css': ['css'], 'tailwind': ['tailwind'], 'pandas': ['pandas'],
    'numpy': ['numpy'], 'pytorch': ['pytorch'],
    'tensorflow': ['tensorflow'], 'scikit-learn': ['scikit-learn', 'sklearn'],
    'machine learning': ['machine learning'], 'excel': ['excel'],
    'power bi': ['power bi', 'powerbi'], 'tableau': ['tableau'],
    'mongodb': ['mongodb'], 'redis': ['redis'],
    'rest api': ['rest api', 'restful'], 'linux': ['linux'],
    'spring boot': ['spring boot'], 'next.js': ['next.js', 'nextjs'],
    'graphql': ['graphql'],
}


def extract_text(data, filename):
    if filename.lower().endswith('.pdf'):
        reader = PdfReader(io.BytesIO(data))
        return '\n'.join(page.extract_text(extraction_mode='layout') or '' for page in reader.pages)
    if filename.lower().endswith('.docx'):
        doc = Document(io.BytesIO(data))
        paragraphs = [p.text for p in doc.paragraphs]
        cells = [cell.text for table in doc.tables for row in table.rows for cell in row.cells]
        return '\n'.join(paragraphs + cells)
    raise ValueError('Only PDF and DOCX supported')


def skills_in(text):
    text = text.lower()
    return sorted(
        skill for skill, aliases in SKILLS.items()
        if any(re.search(r'(?<!\w)' + re.escape(alias) + r'(?!\w)', text) for alias in aliases)
    )


def number(pattern, text):
    match = re.search(pattern, text, re.I)
    return float(match.group(1)) if match else None


def parse(text):
    email = re.search(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}', text)
    phone = re.search(r'(?<!\d)(?:\+91[-\s]?)?[6-9]\d{9}(?!\d)', re.sub(r'[()\s-]', '', text))
    linkedin = re.search(r'https?://(?:www\.)?linkedin\.com/in/[\w-]+', text, re.I)
    github = re.search(r'https?://(?:www\.)?github\.com/[\w-]+', text, re.I)
    cgpa = number(r'(?:CGPA|GPA)\s*[:=]?\s*(\d+(?:\.\d+)?)', text)
    if cgpa is not None:
        if re.search(r'(?:CGPA|GPA)\s*[:=]?\s*\d+(?:\.\d+)?\s*/\s*4\b', text, re.I):
            cgpa *= 2.5
        elif re.search(r'(?:CGPA|GPA)\s*[:=]?\s*\d+(?:\.\d+)?\s*%', text, re.I) or cgpa > 10:
            cgpa /= 10
        cgpa = round(min(10, cgpa), 2)
    years = [int(year) for year in re.findall(r'\b20(?:1\d|2\d|3\d)\b', text)]
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    name = next((line for line in lines[:5] if len(line) < 60 and '@' not in line and not re.search(r'resume|curriculum|linkedin|github|\d{5}', line, re.I)), None)
    exp = number(r'(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s+(?:of\s+)?experience', text)
    if exp is not None:
        exp *= 12
    else:
        exp = number(r'(\d+(?:\.\d+)?)\s*months?\s+(?:of\s+)?experience', text)
    city = next((city for city in ['Delhi', 'Noida', 'Gurugram', 'Gurgaon', 'Mumbai', 'Bengaluru', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata'] if re.search(r'\b' + city + r'\b', text, re.I)), None)
    return {
        'name': name,
        'email': email.group() if email else None,
        'phone': phone.group() if phone else None,
        'linkedin': linkedin.group() if linkedin else None,
        'github': github.group() if github else None,
        'cgpa_10': cgpa,
        'tenth_pct': number(r'(?:10th|class\s*x\b|secondary)\s*(?:marks|percentage|score|:|-|=)*\s*(\d+(?:\.\d+)?)\s*%?', text),
        'twelfth_pct': number(r'(?:12th|class\s*xii\b|senior secondary)\s*(?:marks|percentage|score|:|-|=)*\s*(\d+(?:\.\d+)?)\s*%?', text),
        'grad_year': max(years) if years else None,
        'experience_months': int(exp) if exp is not None else None,
        'city': city,
        'skills': skills_in(text),
    }
