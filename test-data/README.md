# HireSwift test data

Deterministic set (fixed seed) built to exercise the parser, the filters and the matching.

| Folder / file | Contents |
|---|---|
| `resumes/` | 56 resumes: 50 unique candidates + 6 duplicate files |
| `edge_cases/` | `corrupt_resume.pdf`, `zero_byte.pdf`, `notes.txt` (must be rejected or reported as failed) |
| `jds/` | 5 job descriptions (.md) |
| `answer_key.csv` | field-level ground truth, one row per resume file |
| `jd_answer_key.csv` | expected parsed JD fields and which candidates pass the hard filters |
| `filter_tests.csv` | 14 known-answer filter tests (API params + expected candidate IDs) |
| `generate_test_data.py` | regenerates everything (`python generate_test_data.py out_dir`) |

## Format mix (56 files)
19 single-column PDF, 12 two-column PDF (sidebar), 6 PDF with tables, 9 single-column DOCX, 8 DOCX with tables,
2 scanned image-only PDFs (need OCR; `needs_ocr=True`).

## Hard cases built in
- Score formats: `8.5/10`, `CGPA: 8.5`, `8.5 / 10.0 CGPA`, `80.8%`, `3.4/4.0`. Three resumes have no CGPA.
- Class X / XII labels: Class X/XII, 10th/12th, SSC/HSC, Secondary/Senior Secondary, Matriculation/Intermediate.
  Scores as `92.4%`, `9.2 CGPA` (Class X only) or `442/500`. Two resumes lack Class X, two lack Class XII.
- City aliases: Bangalore, Bombay, Gurgaon, Calcutta, "Noida, UP", "Delhi NCR".
- Skill aliases: JS, ReactJS, NodeJS, K8s, Postgres, ML, Golang, PySpark, Amazon Web Services.
- Date formats: `Jun 2022`, `06/2022`, `June 2022`, `Jun'22`; "Present" jobs; overlapping freelance work.
- One resume has no email, one has no skills section (skills only inside projects), 4 are freshers with 0 months.
- Some lines wrap across two lines (for example `8.8 /` then `10.0 CGPA`): this is intentional.

## Normalisation rules used in the answer key
- `cgpa_10`: `x/10` and `CGPA x` = x; percentage = pct / 9.5 (2 decimals); `x/4.0` = x / 4 * 10. Tolerance +-0.05.
- `tenth_pct`, `twelfth_pct`: percentage; `9.2 CGPA` = 9.2 * 9.5; `442/500` = 88.4. Tolerance +-0.1.
- `experience_months`: sum of (end month - start month) per role, with overlapping ranges merged.
  Internships and freelance work are included. "Present" = **November 2026**. Tolerance +-2 months.
- `city`: canonical name (Bengaluru, Gurugram, Mumbai, Kolkata, ...), `college`: short canonical name
  (resumes sometimes show the long form).
- `skills`: canonical names separated by `|`.
- `phone_10`: the 10 digits only.

## Duplicates (`dup_of`, `dup_type` columns)
| dup_type | Meaning |
|---|---|
| `exact_copy` (2) | byte-identical file, different name (file-hash test) |
| `same_email_other_format` | same person, PDF vs DOCX |
| `fuzzy_name_same_phone` | `Karthik` vs `Kartik Sundaram`, different email, same phone |
| `same_email_updated_resume` | same email, newer version with an extra job |
| `initials_same_phone` | `Siddharth Menon` vs `S. Menon`, upper-case email, differently formatted phone |

## How to use
1. **Parser accuracy**: parse every file, compare with `answer_key.csv` field by field, report field-level accuracy
   (scanned files and the 3 edge cases reported separately).
2. **Filters**: run each row in `filter_tests.csv` against `GET /candidates` and compare the returned candidate IDs.
   Counts are over the 50 unique candidates (duplicates should be merged or flagged, not counted twice).
3. **Upload test**: send all 56 resumes plus the 3 edge cases. Expect 56 parsed, 3 failed with reasons.
4. **Matching**: for each JD check that `hard_filter_pass_candidate_ids` appear at the top of the ranking.
