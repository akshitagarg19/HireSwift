        return now.year * 12 + now.month
    match = re.match(r'([a-z]+)[ /\-]+(\d{4})$', value)
    if match and match.group(1) in MONTHS:
        return int(match.group(2)) * 12 + MONTHS[match.group(1)]
    match = re.match(r'(\d{1,2})/(\d{4})$', value)
    if match and 1 <= int(match.group(1)) <= 12:
        return int(match.group(2)) * 12 + int(match.group(1))
    if re.fullmatch(r'(?:19|20)\d{2}', value):
        return int(value) * 12 + 1
    return None


def _experience_months(text):
    # Explicitly stated total experience takes precedence over date inference.
    match = re.search(r'\b(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s+(?:of\s+)?(?:work\s+|professional\s+)?experience\b', text, re.I)
    if match:
        return round(float(match.group(1)) * 12)
    match = re.search(r'\b(\d+(?:\.\d+)?)\s*months?\s+(?:of\s+)?(?:work\s+|professional\s+)?experience\b', text, re.I)
    if match:
        return round(float(match.group(1)))

    # Only infer employment periods within a clearly labeled experience section.
    section = re.search(r'(?im)^\s*(?:work\s+experience|professional\s+experience|employment\s+history|experience)\s*:?\s*$', text)
    if not section:
        return None
    rest = text[section.end():]
    end = re.search(r'(?im)^\s*(?:education|projects|skills|certifications|awards|interests|references)\s*:?\s*$', rest)
    if end:
        rest = rest[:end.start()]
    intervals = []
    for match in RANGE_RE.finditer(rest):
        start = _date_month(match.group('start'))
        finish = _date_month(match.group('end'))
        if start is not None and finish is not None and start <= finish:
            intervals.append((start, finish))
    if not intervals:
        return None
    intervals.sort()
    merged = []
    for start, end in intervals:
        if merged and start <= merged[-1][1] + 1:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))
    return sum(end - start + 1 for start, end in merged)


def _cgpa(text):
    match = re.search(r'\b(?:CGPA|GPA)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(?:/\s*(4(?:\.0)?|10(?:\.0)?)|(%))?', text, re.I)
    if not match:
        return None
    value = float(match.group(1))
    scale = float(match.group(2)) if match.group(2) else None
    if match.group(3) or (scale is None and 10 < value <= 100):
        value /= 10
    elif scale == 4:
        value *= 2.5  # Approximate conversion, not institution-specific equivalence.
    elif scale is None and value > 10:
        return None
    if not 0 <= value <= 10:
        return None
    return round(value, 2)


def _school_percentage(text, grade):
    names = r'(?:10th|class\s*(?:10|x)\b|secondary|ssc)' if grade == 10 else r'(?:12th|class\s*(?:12|xii)\b|senior\s+secondary|hsc)'
    match = re.search(names + r'[^\n\r]{0,65}?(\d{2}(?:\.\d+)?)\s*%', text, re.I)
    if not match:
        match = re.search(names + r'\s*(?:marks|percentage|score)?\s*[:=\-]\s*(\d{2}(?:\.\d+)?)\b', text, re.I)
    if not match:
        return None
    value = float(match.group(1))
    return value if 0 <= value <= 100 else None


def _graduation_year(text):
    # Require a graduation/degree context; never take the last year in the resume.
    for line in text.splitlines():
        if re.search(r'graduat(?:ed|ion|ing)|b\.?tech|b\.?e\.?\b|bachelor|master|m\.?tech|degree|university|college', line, re.I):
            years = re.findall(r'\b(?:19|20)\d{2}\b', line)
            if years:
                return int(years[-1])
    return None


def _phone(text):
    # Matches common international and Indian formats without swallowing long IDs.
    candidates = re.findall(r'(?<!\w)(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?|\d{2,4}[\s.-])?\d{3,5}[\s.-]?\d{4,5}(?!\w)', text)
    for candidate in candidates:
        digits = re.sub(r'\D', '', candidate)
        if 10 <= len(digits) <= 15:
            return digits
    return None


def parse(text):
    email = re.search(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}', text)
    linkedin = re.search(r'(?:https?://)?(?:www\.)?linkedin\.com/in/[\w-]+', text, re.I)
    github = re.search(r'(?:https?://)?(?:www\.)?github\.com/[\w-]+', text, re.I)
    lines = [s.strip() for s in text.splitlines() if s.strip()]
    name = next((s for s in lines[:8] if len(s) < 60 and '@' not in s
                 and not re.search(r'resume|curriculum|linkedin|github|\d{5}|https?://|\bprofile\b', s, re.I)), None)
    city = next((canonical for canonical, aliases in CITIES.items()
                 if any(re.search(r'(?<!\w)' + re.escape(alias) + r'(?!\w)', text, re.I)
                        for alias in aliases)), None)
    return {
        'name': name,
        'email': email.group() if email else None,
        'phone': _phone(text),
        'linkedin': linkedin.group() if linkedin else None,
        'github': github.group() if github else None,
        'cgpa_10': _cgpa(text),
        'tenth_pct': _school_percentage(text, 10),
        'twelfth_pct': _school_percentage(text, 12),
        'grad_year': _graduation_year(text),
        'experience_months': _experience_months(text),
        'city': city,
        'skills': skills_in(text),
    }