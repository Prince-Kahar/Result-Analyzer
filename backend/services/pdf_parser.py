import sys
import os
import re
import logging

# Fix Windows CP1252 emoji print issue
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

logger = logging.getLogger("StudentResultAnalyzer.Parser")

# 1. Lazy Library Check
_pdfplumber_cached = None
_pdfplumber_import_error = None
_pdfplumber_checked = False

def _init_pdfplumber():
    global _pdfplumber_cached, _pdfplumber_import_error, _pdfplumber_checked
    if not _pdfplumber_checked:
        try:
            import pdfplumber
            _pdfplumber_cached = pdfplumber
        except ImportError as e:
            _pdfplumber_import_error = e
        _pdfplumber_checked = True

def __getattr__(name):
    if name == 'pdfplumber':
        _init_pdfplumber()
        return _pdfplumber_cached
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def missing_dependency_message():
    _init_pdfplumber()
    if _pdfplumber_import_error is None:
        return ""
    return (
        "Required Python package 'pdfplumber' is not available.\n"
        "Install it in the same Python environment used to start the app:\n"
        "python -m pip install pdfplumber"
    )


def ensure_runtime_dependencies():
    _init_pdfplumber()
    if _pdfplumber_import_error is not None:
        raise RuntimeError(missing_dependency_message()) from _pdfplumber_import_error

SUBJECT_COUNT = 7
SUBJECTS = {}
SUBJECT_DISPLAY_NAMES = {}
SUBJECT_INPUT_ALIASES = {}

# External passing minimums from the marks scheme in the PDF header:
# first 4 subjects: /18, last 3 subjects: /9
EXT_PASSING_MIN = [18, 18, 18, 18, 9, 9, 9]
SUBJECT_COMPONENT_COUNTS = [1] * SUBJECT_COUNT

COURSE_INFO = {"course": "Unknown Course", "semester": "Unknown Semester"}
ACADEMIC_YEAR = ""    # e.g. '2025-2026', populated after PDF load
COLLEGE_NAME  = ""    # institution name extracted from PDF header

SEMESTER_WORD_TO_NUM = {
    "FIRST": 1,
    "SECOND": 2,
    "THIRD": 3,
    "FOURTH": 4,
    "FIFTH": 5,
    "SIXTH": 6,
    "SEVENTH": 7,
    "EIGHTH": 8,
    "NINTH": 9,
    "TENTH": 10,
}


def clear_screen():
    os.system("cls" if os.name == "nt" else "clear")


def _parse_semester_label(text):
    upper = str(text).upper()

    word_match = re.search(
        r"\b(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH)\s+SEMESTER\b",
        upper,
    )
    if word_match:
        sem_no = SEMESTER_WORD_TO_NUM.get(word_match.group(1))
        if sem_no:
            return f"Semester {sem_no}"

    # Match "SEMESTER 2", "SEMESTER - 2", "2 SEMESTER", "2ND SEMESTER"
    sem_digit_match = re.search(r"\bSEMESTER\s*[-_: ]*\s*(\d+)\b|\b(\d+)(?:ST|ND|RD|TH)?\s+SEMESTER\b", upper)
    if sem_digit_match:
        val = sem_digit_match.group(1) or sem_digit_match.group(2)
        return f"Semester {val}"

    compact_match = re.search(r"\bSEM\s*[-_: ]*\s*(\d+)\b", upper)
    if compact_match:
        return f"Semester {compact_match.group(1)}"

    # Direct fallback if string already contains digit
    direct = re.search(r"\d+", upper)
    if direct:
        return f"Semester {direct.group(0)}"

    return "Unknown Semester"


def _extract_semester_num(text):
    if isinstance(text, int):
        return text
    label = _parse_semester_label(text)
    m = re.search(r'\d+', label)
    if m:
        return int(m.group(0))
    m_direct = re.search(r'\d+', str(text))
    if m_direct:
        return int(m_direct.group(0))
    return 1


def _extract_academic_year(text):
    """Return academic year string like '2025-2026' from PDF header text."""
    upper = str(text).upper()
    # Pattern: NOVEMBER-2025, NOV-2025, MARCH-2026, etc.
    m = re.search(r'(?:JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|'
                  r'JUL(?:Y)?|AUG(?:UST)?|SEP(?:TEMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|'
                  r'DEC(?:EMBER)?)-?(\d{4})', upper)
    if m:
        year = int(m.group(1))
        # Semester months: Nov/Dec → year X, Jan-May → year X  (academic year X, X+1)
        # But conventionally: exam in Nov 2025 → Academic Year 2025-2026
        month_str = m.group(0).split('-')[0].rstrip('0123456789')
        late_months = {'NOV', 'NOVEMBER', 'DEC', 'DECEMBER', 'OCT', 'OCTOBER'}
        if any(month_str.startswith(lm) for lm in late_months):
            return f"{year}-{year + 1}"
        else:
            # Jan–May exams belong to the previous academic year start
            return f"{year - 1}-{year}"
    # Fallback: look for bare 4-digit year in range 2020-2035
    m2 = re.search(r'\b(20[2-3]\d)\b', upper)
    if m2:
        year = int(m2.group(1))
        return f"{year}-{year + 1}"
    return ""


def _extract_course_label(text):
    upper = str(text).upper()
    
    # If NCF-NEP is in the line, extract everything up to that keyword
    if "NCF-NEP" in upper:
        idx = upper.index("NCF-NEP")
        course_part = str(text)[:idx].strip()
        # Clean any trailing/leading special chars like '(' or '-'
        course_part = re.sub(r"^[^\w\s\(]+|[^\w\s\)]+$", "", course_part).strip()
        if course_part:
            return course_part

    # Fallback to the old logic
    courses = []
    if (
        re.search(r"\bB\.?\s*SC\.?\b", upper)
        or "BACHELOR OF SCIENCE" in upper
    ):
        if "DATA SCIENCE" in upper:
            courses.append("BSc DS")
        elif re.search(r"\bI\.?\s*T\.?\b", upper):
            courses.append("BSc IT")
        else:
            courses.append("BSc")

    if re.search(r"\bM\.?\s*SC\.?\b", upper):
        if re.search(r"\bI\.?\s*T\.?\b", upper):
            courses.append("MSc IT")
        elif "DATA SCIENCE" in upper:
            courses.append("MSc DS")
        else:
            courses.append("MSc")

    uniq = _ordered_unique(courses)
    if not uniq:
        return "Unknown Course"

    # If both are present, show higher course first.
    if "MSc IT" in uniq and "BSc IT" in uniq:
        return "MSc IT (Integrated)"
    return " / ".join(uniq)


def extract_course_info_from_pdf(pdf_path):
    """Extract concise course + semester info from PDF header."""
    global ACADEMIC_YEAR
    ACADEMIC_YEAR = ""
    ensure_runtime_dependencies()
    try:
        with _pdfplumber_cached.open(pdf_path) as pdf:
            for page in pdf.pages[:2]:
                text = page.extract_text() or ""
                lines = [ln.strip() for ln in text.split("\n") if ln.strip()]

                # Try to extract academic year from first few lines
                if not ACADEMIC_YEAR:
                    for line in lines[:5]:
                        ay = _extract_academic_year(line)
                        if ay:
                            ACADEMIC_YEAR = ay
                            break

                # Prefer line containing both course and semester keywords.
                for line in lines[:20]:
                    upper = line.upper()
                    if "SEMESTER" in upper and (
                        "B.SC" in upper
                        or "BACHELOR OF SCIENCE" in upper
                        or "M.SC" in upper
                    ):
                        return {
                            "course": _extract_course_label(line),
                            "semester": _parse_semester_label(line),
                        }
    except Exception:
        pass

    # Filename fallback (e.g. "Bsc Ds sem 1.pdf")
    base = os.path.basename(str(pdf_path)).upper()
    course = _extract_course_label(base)
    semester = _parse_semester_label(base)
    return {"course": course, "semester": semester}


def _looks_like_college(line):
    """Return True if the line looks like an institution/college name heading."""
    s = line.strip()
    if not s or len(s) < 5:
        return False
    upper = s.upper()

    if _extract_college_name_from_line(s):
        return True

    non_college_headers = (
        "SEAT NO", "STUDENT NAME", "ACADEMIC BATCH", "EXAM TYPE",
        "EXAM CGPA", "TOTAL RESULT", "ORDINANCE", "SGPA", "YGPA",
        "EXT ", "INT ", "TOTAL ", "GL GP CR", "PASS YR",
    )
    if any(token in upper for token in non_college_headers):
        return False

    # Must be mostly uppercase (institution headings in VNSGU PDFs are all-caps)
    alpha_chars = [c for c in s if c.isalpha()]
    if not alpha_chars:
        return False
    upper_ratio = sum(1 for c in alpha_chars if c.isupper()) / len(alpha_chars)
    if upper_ratio < 0.80:
        return False
    # Must contain at least one college-related keyword OR be a long all-caps phrase
    college_kws = ('COLLEGE', 'INSTITUTE', 'SCHOOL', 'UNIVERSITY', 'VIDYAPITH',
                   'MAHAVIDYALAYA', 'FACULTY', 'DEPT', 'DEPARTMENT', 'CENTRE', 'CENTER')
    if any(kw in upper for kw in college_kws):
        return True
    return False


def _clean_college_name(name):
    text = re.sub(r"\s+", " ", str(name or "")).strip()
    text = re.sub(r"\s+(?:Seat\s+No|SP\s+ID|GENDER|STUDENT\s+NAME)\b.*$", "", text, flags=re.IGNORECASE)
    return text.strip(" :-")


def _extract_college_name_from_line(line):
    """Extract the real college name from a VNSGU page header line."""
    text = str(line or "").strip()
    if not text:
        return ""

    match = re.search(r"\bCollege\s*Name\s*:\s*(.+)$", text, flags=re.IGNORECASE)
    if match:
        return _clean_college_name(match.group(1))

    return ""


def _extract_page_college_name(lines):
    """Return the page's explicit college header, if present."""
    for line in lines[:12]:
        college = _extract_college_name_from_line(line)
        if college:
            return college
    return ""


def _extract_mark_token(tokens, idx):
    tok = tokens[idx]
    upper = tok.upper()

    if upper in {"AB", "ABSENT", "-", "--", "ZR"}:
        return "-", idx + 1

    # Handle inline grace marks like 13+5 (store base mark)
    plus_inline = re.fullmatch(r"(\d+)\+(\d+)", tok)
    if plus_inline:
        return plus_inline.group(1), idx + 1

    # Handle split grace marks like "13+ 5" (store base mark, consume grace)
    plus_split = re.fullmatch(r"(\d+)\+", tok)
    if plus_split:
        if idx + 1 < len(tokens) and re.fullmatch(r"\d+", tokens[idx + 1]):
            return plus_split.group(1), idx + 2
        return plus_split.group(1), idx + 1

    if tok.isdigit():
        return tok, idx + 1

    # Fallback for noisy OCR tokens like 18*
    cleaned = "".join(ch for ch in tok if ch.isdigit())
    if cleaned:
        return cleaned, idx + 1

    return None, idx + 1


def _parse_subject_marks_from_line(scan_line, prefix):
    """Return subject-wise marks from a real student EXT/INT row."""
    tokens = scan_line.split()
    if not tokens or tokens[0] != prefix:
        return None

    component_counts = (
        SUBJECT_COMPONENT_COUNTS
        if len(SUBJECT_COMPONENT_COUNTS) == SUBJECT_COUNT
        else [1] * SUBJECT_COUNT
    )
    expected_components = sum(component_counts)

    parsed_components = []
    i = 1
    while i < len(tokens) and len(parsed_components) < expected_components:
        mark, next_i = _extract_mark_token(tokens, i)
        if mark is not None:
            parsed_components.append(mark)
        i = next_i

    # Real student rows have subject-total immediately after subject values/components.
    has_subject_total = (
        i < len(tokens)
        and (
            re.fullmatch(r"\d+", tokens[i])
            or tokens[i].upper() in {"AB", "ZR", "-", "--"}
        )
    )
    if len(parsed_components) != expected_components or not has_subject_total:
        return None

    # If a subject has multiple component columns, the last component is the subject mark
    # shown in the TOTAL row for that subject.
    if all(count == 1 for count in component_counts):
        return parsed_components

    subject_marks = []
    offset = 0
    for count in component_counts:
        group = parsed_components[offset: offset + count]
        offset += count
        subject_marks.append(group[-1] if group else "-")

    return subject_marks


def _system_search_roots():
    """Return filesystem roots for system-wide search."""
    if os.name == "nt":
        roots = []
        for code in range(ord("A"), ord("Z") + 1):
            drive = chr(code) + ":\\"
            if os.path.exists(drive):
                roots.append(drive)
        return roots
    return [os.sep]


def _path_exists_case_exact(path):
    candidate = os.path.normpath(str(path or ""))
    if not candidate or not os.path.exists(candidate):
        return False

    # Windows filesystems are typically case-insensitive, so exact casing
    # should not block a valid user-selected path.
    if os.name == "nt":
        return os.path.isfile(candidate) or os.path.isdir(candidate)

    if os.name == "nt":
        drive, remainder = os.path.splitdrive(os.path.abspath(candidate))
        current = drive + os.sep if drive else os.sep
    else:
        remainder = os.path.abspath(candidate)
        current = os.sep

    parts = [part for part in remainder.split(os.sep) if part]
    if os.name == "nt" and drive:
        parts = [part for part in remainder[len(drive):].split(os.sep) if part]

    for part in parts:
        try:
            entries = os.listdir(current)
        except (PermissionError, FileNotFoundError, NotADirectoryError, OSError):
            return False
        if part not in entries:
            return False
        current = os.path.join(current, part)
    return os.path.exists(current)


def _search_file_in_roots(target_names, roots):
    """Search file by name in provided roots; returns first match."""
    target_set = {name for name in target_names if name}
    if not target_set:
        return None

    for root in roots:
        if not root or not os.path.isdir(root):
            continue
        try:
            for dirpath, dirnames, filenames in os.walk(root, topdown=True):
                # Prune heavy/system virtual dirs on unix-like systems.
                if os.name != "nt":
                    dirnames[:] = [
                        d for d in dirnames
                        if d not in {
                            "proc", "sys", "dev", "run", "tmp", "snap", "lost+found",
                        }
                    ]

                for fname in filenames:
                    if fname in target_set:
                        candidate = os.path.join(dirpath, fname)
                        if os.path.isfile(candidate) and _path_exists_case_exact(
                            candidate
                        ):
                            return os.path.normpath(candidate)
        except (PermissionError, FileNotFoundError, OSError):
            continue

    return None


def resolve_pdf_path(user_input):
    """Resolve user-provided PDF path/name. Falls back to system-wide search."""
    raw = str(user_input or "").strip().strip('"').strip("'")
    if not raw:
        return None

    candidates = []
    expanded = os.path.expanduser(raw)
    if os.path.isabs(expanded):
        candidates.append(expanded)
    else:
        # 1) relative to current working directory
        candidates.append(os.path.abspath(expanded))
        # 2) relative to this script directory
        candidates.append(os.path.join(SCRIPT_DIR, expanded))

    # Optional convenience: allow input without ".pdf" extension
    if not expanded.lower().endswith(".pdf"):
        ext_added = expanded + ".pdf"
        if os.path.isabs(ext_added):
            candidates.append(ext_added)
        else:
            candidates.append(os.path.abspath(ext_added))
            candidates.append(os.path.join(SCRIPT_DIR, ext_added))

    seen = set()
    for path in candidates:
        norm = os.path.normpath(path)
        if norm in seen:
            continue
        seen.add(norm)
        if os.path.isfile(norm) and _path_exists_case_exact(norm):
            return norm

    # If direct path checks failed, search by filename across local dirs then whole system.
    base_name = os.path.basename(expanded)
    target_names = {base_name}
    if not base_name.lower().endswith(".pdf"):
        target_names.add(base_name + ".pdf")

    local_roots = list(dict.fromkeys([os.getcwd(), SCRIPT_DIR]))
    found = _search_file_in_roots(target_names, local_roots)
    if found:
        return found

    found = _search_file_in_roots(target_names, _system_search_roots())
    if found:
        return found

    return None


def _ordered_unique(items):
    seen = set()
    result = []
    for item in items:
        text = str(item).strip()
        if not text:
            continue
        key = text.casefold()
        if key in seen:
            continue
        seen.add(key)
        result.append(text)
    return result


def _clip_text(text, max_len):
    raw = str(text)
    if len(raw) <= max_len:
        return raw
    if max_len <= 3:
        return raw[:max_len]
    return raw[: max_len - 3] + "..."


def _subject_tokens(text):
    return [tok for tok in re.split(r"[^a-z0-9]+", str(text).lower()) if tok]


def _generate_keywords(subject_name):
    aliases = []
    raw = str(subject_name).strip()
    if not raw:
        return aliases

    norm_space = " ".join(_subject_tokens(raw))
    norm_compact = "".join(_subject_tokens(raw))
    tokens = _subject_tokens(raw)

    aliases.extend([raw.lower(), norm_space, norm_compact])
    aliases.extend(tok for tok in tokens if len(tok) >= 4)

    noise = {"mj", "mn", "mdc", "aec", "sec", "vac", "i", "ii"}
    informative = [tok for tok in tokens if tok not in noise]

    if informative:
        aliases.append(informative[0])
        aliases.append(" ".join(informative[:2]))
        acronym = "".join(tok[0] for tok in informative if tok)
        if len(acronym) >= 2:
            aliases.append(acronym)

    norm = "".join(tokens)
    if "fund" in norm and "prog" in norm and "c" in tokens:
        aliases.append("fpc")
    if "pract" in norm:
        aliases.extend(["pract", "practical"])
    if "funda" in norm and "comp" in norm:
        aliases.extend(["fc", "computer"])
    if "math" in norm:
        aliases.extend(["math", "maths"])
    if "comm" in norm and ("skill" in norm or "skil" in norm):
        aliases.extend(["cs", "communication"])
    if "rese" in norm or "research" in norm:
        aliases.extend(["rm", "research"])
    if ("bhar" in norm and "kno" in norm) or ("bhar" in norm and "know" in norm):
        aliases.extend(["bks", "knowledge"])

    return _ordered_unique(aliases)


def _extract_pair_starts_from_row(row_words):
    row_sorted = sorted(row_words, key=lambda x: x["x0"])
    pair_starts = []
    i = 0
    while i + 2 < len(row_sorted):
        a = row_sorted[i]["text"]
        b = row_sorted[i + 1]["text"]
        c = row_sorted[i + 2]["text"]
        if re.fullmatch(r"\d+", a) and b == "/" and re.fullmatch(r"\d+", c):
            pair_starts.append(round(row_sorted[i]["x0"], 1))
            i += 3
            continue
        i += 1
    return pair_starts


def _extract_subject_columns(words):
    # Prefer header TOTAL scheme row because it reflects final subject columns
    # even when a subject has multiple component columns in EXT/INT.
    for row_label in ("TOTAL", "EXT"):
        row_tops = sorted(
            {round(w["top"], 1) for w in words if w["text"].upper() == row_label}
        )
        for row_top in row_tops:
            row_words = [w for w in words if abs(w["top"] - row_top) <= 0.8]
            row_sorted = sorted(row_words, key=lambda x: x["x0"])
            if not row_sorted or row_sorted[0]["text"].upper() != row_label:
                continue
            pair_starts = _extract_pair_starts_from_row(row_sorted)
            if len(pair_starts) >= SUBJECT_COUNT:
                return pair_starts[:SUBJECT_COUNT], row_top

    # Fallback: use left-most likely header tokens if no scheme row is detected.
    fallback = sorted(
        {
            round(w["x0"], 1)
            for w in words
            if 80 <= w["top"] <= 170
            and 90 <= w["x0"] <= 760
            and re.search(r"[A-Za-z]", w["text"])
            and w["text"].upper() not in {"SEAT", "NO", "SP", "ID", "GENDER", "STUDENT", "NAME"}
        }
    )
    return fallback[:SUBJECT_COUNT], None


def _extract_subjects_from_page(page):
    words = page.extract_words(use_text_flow=False, keep_blank_chars=False)
    if not words:
        return {}

    col_starts, scheme_top = _extract_subject_columns(words)
    if len(col_starts) < SUBJECT_COUNT:
        return {}

    header_words = []
    skip_tokens = {
        "EXAM", "TOTAL", "CGPA", "PER.", "PER", "RESULT",
        "ORDINANCE", "SGPA", "CLASS", "O", "EXT", "INT", "YGPA(OUT", "10)",
    }

    if scheme_top is None:
        scheme_top = min(
            (
                w["top"]
                for w in words
                if w["text"].upper() in {"EXT", "INT", "TOTAL"}
                and w["top"] >= 120
            ),
            default=170.0,
        )

    left_bound = max(0.0, col_starts[0] - 120.0)
    right_bound = col_starts[-1] + 80.0
    top_min = 88.0
    top_max = max(top_min + 10.0, scheme_top - 2.0)

    for w in words:
        text = str(w["text"]).strip()
        if not text:
            continue
        if not (top_min <= w["top"] <= top_max):
            continue
        if not (left_bound <= w["x0"] <= right_bound):
            continue

        upper = text.upper()
        if upper in skip_tokens:
            continue
        if re.fullmatch(r"\d+|/|[-.]+|YR|NOV-\d{4}", upper):
            continue

        header_words.append(w)

    bounds = []
    for idx in range(SUBJECT_COUNT):
        left = float("-inf") if idx == 0 else (col_starts[idx - 1] + col_starts[idx]) / 2.0
        right = float("inf") if idx == SUBJECT_COUNT - 1 else (col_starts[idx] + col_starts[idx + 1]) / 2.0
        bounds.append((left, right))

    parts = {idx: [] for idx in range(SUBJECT_COUNT)}
    for w in sorted(header_words, key=lambda x: (x["top"], x["x0"])):
        x_center = (w["x0"] + w["x1"]) / 2.0
        for idx, (left, right) in enumerate(bounds):
            if left <= x_center < right:
                parts[idx].append(w["text"])
                break

    extracted = {}
    for idx in range(SUBJECT_COUNT):
        tokens = _ordered_unique(parts[idx])
        if not tokens:
            continue

        subject = " ".join(tokens)
        subject = re.sub(r"\s+", " ", subject).strip()
        subject = re.sub(r"([A-Z]{2,}-)\s+", r"\1", subject)
        subject = subject.replace(" .", ".")
        subject = subject.strip(" -")
        if subject:
            extracted[idx] = subject

    return extracted


def _parse_component_counts_from_scheme_line(line, prefix):
    tokens = line.split()
    if not tokens or tokens[0].upper() != prefix:
        return None

    counts = []
    passing = []
    i = 1
    while i < len(tokens) and len(counts) < SUBJECT_COUNT:
        group_count = 0
        while i < len(tokens) and tokens[i] != "/":
            if re.fullmatch(r"\d+", tokens[i]):
                group_count += 1
            i += 1

        if i + 1 >= len(tokens) or tokens[i] != "/" or not re.fullmatch(r"\d+", tokens[i + 1]):
            break

        counts.append(max(1, group_count))
        passing.append(int(tokens[i + 1]))
        i += 2

    if len(counts) == SUBJECT_COUNT:
        return counts, passing
    return None


def extract_subject_scheme_from_pdf(pdf_path):
    ensure_runtime_dependencies()
    try:
        with _pdfplumber_cached.open(pdf_path) as pdf:
            for page in pdf.pages[:3]:
                text = page.extract_text() or ""
                for line in text.split("\n"):
                    scan_line = line.strip()
                    if not scan_line.upper().startswith("EXT "):
                        continue
                    if scan_line.count("/") < SUBJECT_COUNT:
                        continue
                    parsed = _parse_component_counts_from_scheme_line(scan_line, "EXT")
                    if parsed:
                        return parsed
    except Exception:
        return None

    return None


def extract_max_marks_from_pdf(pdf_path):
    ensure_runtime_dependencies()
    try:
        with _pdfplumber_cached.open(pdf_path) as pdf:
            for page in pdf.pages[:3]:
                text = page.extract_text() or ""
                for line in text.split("\n"):
                    scan_line = line.strip()
                    if scan_line.upper().startswith("TOTAL ") and "/" in scan_line:
                        tokens = scan_line.split()
                        for token in reversed(tokens):
                            if token.isdigit():
                                return int(token)
    except Exception:
        pass
    return 700



def extract_subjects_from_pdf(pdf_path):
    ensure_runtime_dependencies()
    extracted = {}
    try:
        with _pdfplumber_cached.open(pdf_path) as pdf:
            for page in pdf.pages[:2]:
                page_subjects = _extract_subjects_from_page(page)
                if len(page_subjects) > len(extracted):
                    extracted = page_subjects
                if len(extracted) == SUBJECT_COUNT:
                    break
    except Exception:
        return {}

    return extracted


def configure_subject_metadata(pdf_path):
    global SUBJECTS, SUBJECT_DISPLAY_NAMES, SUBJECT_INPUT_ALIASES
    global SUBJECT_COMPONENT_COUNTS, EXT_PASSING_MIN, SUBJECT_COUNT

    detected_subjects = extract_subjects_from_pdf(pdf_path)
    detected_count = len(detected_subjects)

    if detected_count > 0:
        SUBJECT_COUNT = detected_count
        SUBJECTS = {
            idx: str(detected_subjects[idx]).strip()
            for idx in range(SUBJECT_COUNT)
        }
    else:
        if not SUBJECT_COUNT or SUBJECT_COUNT <= 0:
            SUBJECT_COUNT = 7
        SUBJECTS = {
            idx: f"Subject-{idx+1}" for idx in range(SUBJECT_COUNT)
        }

    SUBJECT_DISPLAY_NAMES = SUBJECTS.copy()

    aliases_map = {}
    for idx in range(SUBJECT_COUNT):
        subj_name = SUBJECTS.get(idx, f"Subject-{idx+1}")
        aliases_map[idx] = _ordered_unique(_generate_keywords(subj_name))

    SUBJECT_INPUT_ALIASES = aliases_map

    scheme = extract_subject_scheme_from_pdf(pdf_path)
    if scheme:
        comp_counts, pass_marks = scheme
        if len(comp_counts) == SUBJECT_COUNT:
            SUBJECT_COMPONENT_COUNTS = list(comp_counts)
        else:
            SUBJECT_COMPONENT_COUNTS = [1] * SUBJECT_COUNT
        if len(pass_marks) == SUBJECT_COUNT:
            EXT_PASSING_MIN = list(pass_marks)
        else:
            EXT_PASSING_MIN = [18] * SUBJECT_COUNT
    else:
        SUBJECT_COMPONENT_COUNTS = [1] * SUBJECT_COUNT
        EXT_PASSING_MIN = [18] * SUBJECT_COUNT

    return SUBJECT_COUNT


def show_subject_catalog():
    print("📚 [Subjects] Loaded from selected PDF:\n")
    for idx in range(SUBJECT_COUNT):
        keywords = SUBJECT_INPUT_ALIASES.get(idx, [])
        short_keys = [
            k for k in keywords
            if k and len(k) <= 10 and " " not in k and not str(k).isdigit()
        ]
        if not short_keys:
            short_keys = keywords[:4]
        preview = ", ".join(short_keys[:5]) if short_keys else "--"
        subject_name = SUBJECTS.get(idx, f"Subject-{idx + 1}")
        subject_disp = _clip_text(subject_name, 52)
        keyword_disp = _clip_text(preview, 58)
        print(f"  {idx + 1}. {subject_disp}")
        print(f"     🔑 {keyword_disp}")
        if idx != SUBJECT_COUNT - 1:
            print("")


def _get_pdf_pages_text(pdf_path):
    """Highly optimized parallel layout text extraction from all PDF pages."""
    try:
        import pypdf
        reader = pypdf.PdfReader(pdf_path)
        num_pages = len(reader.pages)

        def _extract_single_page(page_obj):
            try:
                return page_obj.extract_text(extraction_mode="layout") or ""
            except Exception:
                try:
                    return page_obj.extract_text() or ""
                except Exception:
                    return ""

        if num_pages > 3:
            from concurrent.futures import ThreadPoolExecutor
            workers = min(4, num_pages)
            with ThreadPoolExecutor(max_workers=workers) as executor:
                pages_text = list(executor.map(_extract_single_page, reader.pages))
        else:
            pages_text = [_extract_single_page(p) for p in reader.pages]

        return pages_text, "pypdf (parallel)"
    except Exception as e:
        logger.warning("pypdf extraction failed, falling back to pdfplumber: %s", e)
    
    # Fallback to pdfplumber
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            num_pages = len(pdf.pages)
            def _extract_plumber_page(page):
                try:
                    return page.extract_text() or ""
                except Exception:
                    return ""

            if num_pages > 3:
                from concurrent.futures import ThreadPoolExecutor
                workers = min(4, num_pages)
                with ThreadPoolExecutor(max_workers=workers) as executor:
                    pages_text = list(executor.map(_extract_plumber_page, pdf.pages))
            else:
                pages_text = [_extract_plumber_page(p) for p in pdf.pages]
        return pages_text, "pdfplumber (parallel)"
    except Exception as e:
        logger.exception("All PDF extractions failed: %s", e)
        return [], "failed"


def load_students(pdf_path):
    global COLLEGE_NAME
    ensure_runtime_dependencies()
    students = []
    COLLEGE_NAME = ""
    current_college = ""   # tracks most recently seen institution heading

    info = extract_course_info_from_pdf(pdf_path)
    target_sem_num = _extract_semester_num(info.get('semester', ''))
    logger.info("PDF target semester detected: %d (from '%s')", target_sem_num, info.get('semester', ''))
    
    try:
        pages_text, method = _get_pdf_pages_text(pdf_path)
    except Exception as e:
        logger.exception("Critical error while loading PDF text: %s", e)
        return []

    logger.info("Processing %d pages from PDF using %s.", len(pages_text), method)
    
    for page_num, text in enumerate(pages_text):
        if not text:
            continue
        
        lines = text.split('\n')
        page_college = _extract_page_college_name(lines)
        if page_college:
            current_college = page_college
            if not COLLEGE_NAME:
                COLLEGE_NAME = current_college
        
        for i, line in enumerate(lines):
            # Track college/institution heading lines
            line_college = _extract_college_name_from_line(line)
            if line_college:
                current_college = line_college
                if not COLLEGE_NAME:
                    COLLEGE_NAME = current_college
            elif not current_college and _looks_like_college(line):
                current_college = _clean_college_name(line)
                if not COLLEGE_NAME:
                    COLLEGE_NAME = current_college

            # 1. Find Student Row
            match = re.search(r'(\d{3})\s+(\d{10})\s+([MF])', line)
            
            if match:
                seat_no = match.group(1)
                sp_id = match.group(2)
                gender = match.group(3)
                
                # --- Extract Name ---
                rest_of_line = line[match.end():]
                name_parts = []
                for word in rest_of_line.split():
                    if "M.SC." in word or "B.SC." in word:
                        break
                    name_parts.append(word)
                name = " ".join(name_parts)
                
                # --- Initialize Data ---
                # Marks: [Ext, Int] for each subject
                marks = {idx: ['-', '-'] for idx in range(SUBJECT_COUNT)}
                grades = {idx: None for idx in range(SUBJECT_COUNT)}
                sgpa = "--"
                overall_status = "UNKNOWN"
                reported_atkt_count = None
                sem_history = {}  # Image 2 history: {1: {"code": "101", "result": "5.27"}, 2: {"code": "101", "result": "F-2"}}
                
                ext_captured = False
                int_captured = False
                reported_total_marks = None
                
                # --- STRICT BLOCK SCAN ---
                scan_limit = min(i + 80, len(lines))
                
                for j in range(i + 1, scan_limit):
                    scan_line = lines[j].strip()
                    
                    # STOP if next student record row is reached
                    if j > i + 1 and re.search(r'(\d{3})\s+(\d{10})\s+([MF])', scan_line):
                        break

                    # --- 1. IMAGE 1 SCANNING: Current Semester Result (PASS / FAIL, SGPA, F-N ATKT) ---
                    if re.search(r'\bFORM\s+WITHDRAWN\b|\bWITHDRAWN\b|\bWITHHELD\b|\bRESERVED\b', scan_line, re.IGNORECASE):
                        overall_status = "WITHDRAWN"
                    elif re.search(r'\bABSENT\b', scan_line, re.IGNORECASE):
                        overall_status = "ABSENT"

                    f_match = re.search(r'\bF\s*-\s*(\d+)\b', scan_line, re.IGNORECASE)
                    if f_match:
                        reported_atkt_count = int(f_match.group(1))

                    # Standalone or Ordinance SGPA decimal line under PASS (e.g. 7.00, 6.36, ORD 150 5.45)
                    # Ignore Image 2 history lines that start with "1 -" or "2 -"
                    if not re.search(r'^\d+\s*-\s*\d+', scan_line):
                        sgpa_match = re.search(r'\b([0-9]\.[0-9]{2}|10\.00)\b', scan_line)
                        if sgpa_match and sgpa == "--" and overall_status != "FAIL":
                            try:
                                v_flt = float(sgpa_match.group(1))
                                if 0.0 < v_flt <= 10.0:
                                    sgpa = sgpa_match.group(1)
                            except ValueError:
                                pass


                    # --- 2. IMAGE 2 SCANNING: Previous Semester History (for AI Chatbot Queries) ---
                    # Match pattern: <sem_num> - <course_code> - <sgpa_or_F-N>
                    # e.g., "1 - 101 - 5.27", "2 - 101 - F-2", "1 - 102 - 7.82", "2 - 102 - 7.00"
                    sem_matches = re.findall(r'\b(\d+)\s*-\s*(\d+)\s*-\s*([\d\.]+|F-\d+|FAIL|PASS)\b', scan_line, re.IGNORECASE)
                    for sem_num_str, code_str, res_val_str in sem_matches:
                        try:
                            s_num = int(sem_num_str)
                            sem_history[s_num] = {
                                "sem": s_num,
                                "code": code_str,
                                "result": res_val_str.strip()
                            }
                        except ValueError:
                            pass

                    # --- 3. Extract Marks (EXT, INT, TOTAL) ---
                    if scan_line.startswith("EXT") and not ext_captured:
                        parsed_ext = _parse_subject_marks_from_line(scan_line, "EXT")
                        if parsed_ext:
                            for k in range(SUBJECT_COUNT):
                                marks[k][0] = parsed_ext[k]
                            ext_captured = True
                                
                    elif scan_line.startswith("INT") and not int_captured:
                        parsed_int = _parse_subject_marks_from_line(scan_line, "INT")
                        if parsed_int:
                            for k in range(SUBJECT_COUNT):
                                marks[k][1] = parsed_int[k]
                            int_captured = True

                    elif scan_line.startswith("TOTAL") and reported_total_marks is None:
                        total_tokens = scan_line.split()
                        expected_total_idx = SUBJECT_COUNT + 1
                        if len(total_tokens) > expected_total_idx and all(
                            re.fullmatch(r"\d+", total_tokens[idx]) for idx in range(1, expected_total_idx + 1)
                        ):
                            reported_total_marks = int(total_tokens[expected_total_idx])

                    # --- 4. Extract Grades (GL GP CR) ---
                    if "GL GP CR" in scan_line:
                        grade_text = scan_line.replace("GL GP CR", "").strip()
                        tokens = grade_text.split()
                        
                        valid_grades = ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F', 'AB']
                        
                        found_grades = []
                        for tok in tokens:
                            if tok in valid_grades:
                                found_grades.append(tok)
                        
                        for idx in range(SUBJECT_COUNT):
                            if idx < len(found_grades):
                                grades[idx] = found_grades[idx]
                            else:
                                grades[idx] = "--"

                # --- FINAL CALCULATIONS ---
                
                # 1. Calculate Total Marks (Sum of Ext + Int)
                calc_total = 0
                for k in range(SUBJECT_COUNT):
                    ext_val = marks[k][0] if k < len(marks) and marks[k][0] != '-' else '0'
                    int_val = marks[k][1] if k < len(marks) and marks[k][1] != '-' else '0'
                    
                    if str(ext_val).isdigit() and str(int_val).isdigit():
                        calc_total += (int(ext_val) + int(int_val))
                    elif str(ext_val).isdigit():
                        calc_total += int(ext_val)
                    elif str(int_val).isdigit():
                        calc_total += int(int_val)

                total_marks = reported_total_marks if reported_total_marks is not None else calc_total

                # 2. Determine Ground-Truth Status, SGPA & ATKT Count from Target Semester PDF Result Block
                target_sem = target_sem_num if target_sem_num in sem_history else (max(sem_history.keys()) if sem_history else None)
                res_str = ""
                if target_sem and target_sem in sem_history:
                    res_str = str(sem_history[target_sem].get("result", "")).strip().upper()

                if overall_status == "WITHDRAWN" or any(k in res_str for k in ["FORM WITHDRAWN", "WITHDRAWN", "WITHHELD", "RESERVED", "W.O."]):
                    overall_status = "WITHDRAWN"
                    atkt_count = 0
                    final_sgpa = "--"
                elif overall_status == "ABSENT" or "ABSENT" in res_str:
                    overall_status = "ABSENT"
                    atkt_count = 0
                    final_sgpa = "--"
                elif "F-" in res_str or res_str in ("FAIL", "ATKT"):
                    overall_status = "FAIL"
                    f_m = re.search(r'F\s*-\s*(\d+)', res_str)
                    calculated_atkt = sum(1 for g in grades.values() if g in ('F', 'AB'))
                    if f_m:
                        atkt_count = int(f_m.group(1))
                    elif reported_atkt_count is not None and reported_atkt_count > 0:
                        atkt_count = reported_atkt_count
                    else:
                        atkt_count = max(1, calculated_atkt)
                    final_sgpa = "--"
                elif res_str == "PASS":
                    overall_status = "PASS"
                    atkt_count = 0
                    final_sgpa = sgpa if sgpa != "--" else "0.00"
                else:
                    try:
                        val_flt = float(res_str)
                        if 0.0 < val_flt <= 10.0:
                            overall_status = "PASS"
                            atkt_count = 0
                            final_sgpa = f"{val_flt:.2f}"
                        else:
                            overall_status = "PASS" if sgpa != "--" else "FAIL"
                            atkt_count = 0 if overall_status == "PASS" else 1
                            final_sgpa = sgpa if overall_status == "PASS" else "--"
                    except ValueError:
                        overall_status = "PASS" if sgpa != "--" else "FAIL"
                        atkt_count = 0 if overall_status == "PASS" else 1
                        final_sgpa = sgpa if overall_status == "PASS" else "--"



                students.append({
                    "seat_no": seat_no,
                    "sp_id": sp_id,
                    "name": name,
                    "gender": gender,
                    "marks": marks,
                    "grades": grades,
                    "total_marks": total_marks,
                    "sgpa": final_sgpa,
                    "overall_status": overall_status,
                    "atkt_count": atkt_count,
                    "sem_history": sem_history,
                    "college": current_college,
                })
    
    return students

def display_mark(mark_val):
    """Helper to display numeric values safely; otherwise '--'."""
    if mark_val is None:
        return '--'

    if isinstance(mark_val, int):
        return str(mark_val)

    if isinstance(mark_val, float):
        return f"{mark_val:.2f}"

    mark_text = str(mark_val).strip()
    if not mark_text or mark_text in {'-', '--'}:
        return '--'

    if re.fullmatch(r'\d+(\.\d+)?', mark_text):
        return mark_text

    return '--'


def _normalize_subject_text(text):
    return re.sub(r'[^a-z0-9]+', '', str(text).lower())


def resolve_subject_index(subject_input):
    raw = str(subject_input).strip()
    if not raw:
        return None

    if raw.isdigit():
        idx = int(raw)
        if 1 <= idx <= SUBJECT_COUNT:
            return idx - 1
        if idx in SUBJECTS:
            return idx

    norm_input = _normalize_subject_text(raw)
    if not norm_input:
        return None

    for idx in range(SUBJECT_COUNT):
        candidates = [
            SUBJECT_DISPLAY_NAMES[idx],
            SUBJECTS[idx],
            *SUBJECT_INPUT_ALIASES.get(idx, []),
        ]
        for cand in candidates:
            norm_cand = _normalize_subject_text(cand)
            if norm_input == norm_cand:
                return idx

    # Allow partial/full-name matching in either direction.
    for idx in range(SUBJECT_COUNT):
        norm_label = _normalize_subject_text(SUBJECT_DISPLAY_NAMES[idx])
        if norm_input in norm_label or norm_label in norm_input:
            return idx

    return None


def _subject_status(student, idx, ext_mark, int_mark, grade):
    ext_s = display_mark(ext_mark)
    int_s = display_mark(int_mark)
    grade_upper = str(grade).upper() if grade else "--"
    is_missing_mark = (ext_s == '--' or int_s == '--')
    ext_fail_by_threshold = (
        str(ext_mark).isdigit()
        and idx < len(EXT_PASSING_MIN)
        and int(ext_mark) < EXT_PASSING_MIN[idx]
    )
    is_fail = (
        grade_upper in {"F", "AB"}
        or (
            student['overall_status'] == "FAIL"
            and (is_missing_mark or ext_fail_by_threshold)
        )
    )
    return "FAIL" if is_fail else "PASS"


def _get_subject_total_display(ext_mark, int_mark):
    total = 0
    if ext_mark != '-' and str(ext_mark).isdigit() and str(int_mark).isdigit():
        total += (int(ext_mark) + int(int_mark))
    elif ext_mark != '-' and str(ext_mark).isdigit():
        total += int(ext_mark)
    elif int_mark != '-' and str(int_mark).isdigit():
        total += int(int_mark)
    return str(total) if total > 0 else '--'


def get_failed_subject_details(student):
    details = []
    for idx in range(SUBJECT_COUNT):
        sub = SUBJECTS.get(idx, f"Unknown {idx}")
        ext_mark = student['marks'][idx][0] if idx in student['marks'] else '-'
        int_mark = student['marks'][idx][1] if idx in student['marks'] else '-'

        ext_s = display_mark(ext_mark)
        int_s = display_mark(int_mark)
        tot_s = _get_subject_total_display(ext_mark, int_mark)

        grade = student['grades'][idx]
        status = _subject_status(student, idx, ext_mark, int_mark, grade)
        is_fail = (status == "FAIL")

        if is_fail:
            details.append({
                "idx": idx,
                "subject": sub,
                "ext": ext_s,
                "int": int_s,
                "tot": tot_s,
            })

    return details


def _collect_subject_data(students, subject_idx):
    subject_total_count = 0
    subject_pass_count = 0
    ranked_rows = []
    subject_failed_rows = []

    for student in students:
        ext_mark = student['marks'][subject_idx][0] if subject_idx in student['marks'] else '-'
        int_mark = student['marks'][subject_idx][1] if subject_idx in student['marks'] else '-'
        ext_s = display_mark(ext_mark)
        int_s = display_mark(int_mark)
        tot_s = _get_subject_total_display(ext_mark, int_mark)

        if tot_s == '--':
            continue

        subject_total_count += 1
        grade = student['grades'][subject_idx]
        grade_s = str(grade) if grade else '--'
        status_s = _subject_status(student, subject_idx, ext_mark, int_mark, grade)
        sgpa_s = display_mark(student['sgpa'])

        if status_s == "PASS":
            subject_pass_count += 1
        else:
            subject_failed_rows.append({
                "seat_no": student['seat_no'],
                "name": student['name'],
                "int": int_s,
                "ext": ext_s,
                "tot": tot_s,
                "grade": grade_s,
            })

        ranked_rows.append({
            "seat_no": student['seat_no'],
            "name": student['name'],
            "ext": ext_s,
            "int": int_s,
            "tot": tot_s,
            "tot_val": int(tot_s),
            "grade": grade_s,
            "sgpa": sgpa_s,
            "status": status_s,
        })

    ranked_rows.sort(
        key=lambda x: (
            -x["tot_val"],
            x["name"].casefold(),
            int(x["seat_no"]),
        )
    )
    subject_failed_rows.sort(key=lambda x: (x["name"].casefold(), int(x["seat_no"])))

    result_percent = (
        (subject_pass_count / subject_total_count) * 100.0
        if subject_total_count > 0 else 0.0
    )

    return {
        "ranked_rows": ranked_rows,
        "failed_rows": subject_failed_rows,
        "total_count": subject_total_count,
        "pass_count": subject_pass_count,
        "result_percent": result_percent,
    }


def _build_table_lines(headers, rows, aligns=None, max_widths=None):
    headers = [str(h) for h in headers]
    col_count = len(headers)

    align_map = list(aligns or [])
    if len(align_map) < col_count:
        align_map.extend(["left"] * (col_count - len(align_map)))

    width_caps = {}
    if isinstance(max_widths, dict):
        width_caps = dict(max_widths)
    elif isinstance(max_widths, (list, tuple)):
        width_caps = {idx: val for idx, val in enumerate(max_widths)}

    processed_rows = []
    for row in rows:
        cells = []
        for idx in range(col_count):
            value = row[idx] if idx < len(row) else ""
            text = str(value if value is not None else "--").replace("\n", " ")
            cap = width_caps.get(idx)
            if isinstance(cap, int) and cap > 3 and len(text) > cap:
                text = text[: cap - 3] + "..."
            cells.append(text)
        processed_rows.append(cells)

    widths = [len(h) for h in headers]
    for row in processed_rows:
        for idx, cell in enumerate(row):
            if len(cell) > widths[idx]:
                widths[idx] = len(cell)

    def _aligned_cells(cells):
        out = []
        for idx, cell in enumerate(cells):
            align = str(align_map[idx]).lower()
            width = widths[idx]
            if align == "right":
                out.append(f"{cell:>{width}}")
            elif align == "center":
                out.append(f"{cell:^{width}}")
            else:
                out.append(f"{cell:<{width}}")
        return out

    header_line = "| " + " | ".join(_aligned_cells(headers)) + " |"
    border_line = "+-" + "-+-".join("-" * w for w in widths) + "-+"
    row_lines = ["| " + " | ".join(_aligned_cells(row)) + " |" for row in processed_rows]
    return border_line, header_line, row_lines, len(border_line)


def show_all_subject_toppers(students):
    print("🏆 [Action] Showing toppers for all subjects...")

    for subject_idx in range(SUBJECT_COUNT):
        data = _collect_subject_data(students, subject_idx)
        ranked_rows = data["ranked_rows"]

        if not ranked_rows:
            continue

        topper_score = ranked_rows[0]["tot_val"]
        top_rows = [row for row in ranked_rows if row["tot_val"] == topper_score]
        table_rows = []
        for row in top_rows:
            table_rows.append([
                "1",
                row["seat_no"],
                row["name"],
                row["ext"],
                row["int"],
                row["tot"],
                row["grade"],
                row["sgpa"],
                row["status"],
            ])

        border, header, row_lines, line_len = _build_table_lines(
            ["Rank", "Seat No", "Name", "Ext", "Int", "Tot", "Grade", "SGPA", "Status"],
            table_rows,
            aligns=["right", "right", "left", "right", "right", "right", "center", "right", "center"],
            max_widths={2: 40},
        )

        print("\n" + "=" * line_len)
        print(f"🏆\n SUBJECT NAME: {SUBJECT_DISPLAY_NAMES[subject_idx].upper()}")
        print(f"🥇 TOP SCORE: {topper_score} | TOTAL TOPPERS: {len(top_rows)}")
        print(border)
        print(header)
        print(border)

        for line in row_lines:
            print(line)
        print(border)
        print("=" * line_len)


def show_subject_result(students):
    print("📚 [Action] Subject result details...")
    print("🔑 Use subject number, full name, or keyword from loaded subject list.")
    subject_input = input("📝 Enter subject keyword/name: ").strip()
    subject_idx = resolve_subject_index(subject_input)

    if subject_idx is None:
        print("❌ Invalid subject input.")
        return

    data = _collect_subject_data(students, subject_idx)
    ranked_rows = data["ranked_rows"]
    if not ranked_rows:
        print("ℹ️ No students found with valid marks for this subject.")
        return

    total_count = data["total_count"]
    pass_count = data["pass_count"]
    fail_count = total_count - pass_count
    result_percent = data["result_percent"]

    print("\n" + "=" * 70)
    print(f"📊 SUBJECT RESULT SUMMARY: {SUBJECT_DISPLAY_NAMES[subject_idx].upper()}")
    print("=" * 70)
    print(f"👥 Total Students (Subject) : {total_count}")
    print(f"✅ Pass Students            : {pass_count}")
    print(f"❌ Fail Students            : {fail_count}")
    print(f"📈 Subject Result %         : {result_percent:.2f}%")
    print("=" * 70)

    if fail_count == 0:
        print("✅ No failed students in this subject.")
        return

    failed_rows = data["failed_rows"]
    table_rows = []
    for row in failed_rows:
        table_rows.append([
            row["seat_no"],
            row["name"],
            row["int"],
            row["ext"],
            row["tot"],
            row["grade"],
        ])
    fail_border, fail_header, fail_lines, fail_line_len = _build_table_lines(
        ["Seat No", "Name", "Internal", "External", "Total", "Grade"],
        table_rows,
        aligns=["right", "left", "right", "right", "right", "center"],
        max_widths={1: 40},
    )

    print("\n" + "=" * fail_line_len)
    print(f"❌ FAILED STUDENTS IN {SUBJECT_DISPLAY_NAMES[subject_idx].upper()}")
    print(fail_border)
    print(fail_header)
    print(fail_border)
    for line in fail_lines:
        print(line)
    print(fail_border)
    print("=" * fail_line_len)


def show_failed_students(students):
    print("❌ [Action] Filtering FAILED students...")
    failed_students = [s for s in students if s['overall_status'] == "FAIL"]
    
    if not failed_students:
        print("✅ No failed students found in data.")
        return

    sorted_students = sorted(failed_students, key=lambda x: int(x['seat_no']))
    table_rows = []
    student_row_counts = []
    for student in sorted_students:
        details = get_failed_subject_details(student)
        if not details:
            details = [{
                "subject": "(Official FAIL - subject details not found)",
                "int": "--",
                "ext": "--",
                "tot": "--",
            }]
        student_row_counts.append(len(details))

        for idx, d in enumerate(details):
            table_rows.append([
                student["seat_no"] if idx == 0 else "",
                student["name"] if idx == 0 else "",
                d["subject"],
                d["int"],
                d["ext"],
                d["tot"],
            ])

    border, header, row_lines, line_len = _build_table_lines(
        ["Seat No", "Name", "Failed Subject Name", "Internal", "External", "Total"],
        table_rows,
        aligns=["right", "left", "left", "right", "right", "right"],
        max_widths={1: 34, 2: 42},
    )

    print("\n" + "=" * line_len)
    print("❌ FAILED STUDENTS LIST")
    print("=" * line_len)
    print(border)
    print(header)
    print(border)
    line_idx = 0
    for count in student_row_counts:
        for _ in range(count):
            if line_idx >= len(row_lines):
                break
            print(row_lines[line_idx])
            line_idx += 1
        print(border)
    print("=" * line_len)

def show_top_ranks(students):
    print("🏅 [Action] Filtering PASSED students...")
    passed_students = [s for s in students if s['overall_status'] == "PASS"]
    
    if not passed_students:
        print("❌ No passed students found in data.")
        return

    try:
        n = int(input("🏅 How many top students to show (e.g., 10): "))
    except ValueError:
        print("❌ Please enter a valid number.")
        return
    
    # Filter out students with invalid SGPA/Total
    clean_students = [
        s for s in passed_students 
        if s['sgpa'] and s['sgpa'] != '--' and s['total_marks']
    ]
    
    sorted_students = sorted(
        clean_students,
        key=lambda x: (
            -(float(x['sgpa']) if x['sgpa'] != '--' else 0.0),
            int(x['seat_no']) if str(x.get('seat_no', '')).isdigit() else 999999,
            str(x.get('seat_no', '')),
        ),
    )
    
    top_n = sorted_students[:n]
    if not top_n:
        print("❌ No passed students with valid SGPA found.")
        return

    rows = []
    previous_sgpa = None
    current_rank = 0
    for position, student in enumerate(top_n, 1):
        sgpa_value = float(student['sgpa']) if student['sgpa'] != '--' else 0.0
        if position == 1 or sgpa_value != previous_sgpa:
            current_rank = position
            previous_sgpa = sgpa_value

        rows.append([
            current_rank,
            student["seat_no"],
            student["name"],
            display_mark(student["total_marks"]),
            display_mark(student["sgpa"]),
            student["overall_status"],
        ])
    border, header, row_lines, line_len = _build_table_lines(
        ["Rank", "Seat No", "Name", "Total", "SGPA", "Status"],
        rows,
        aligns=["right", "right", "left", "right", "right", "center"],
        max_widths={2: 42},
    )
    
    print("\n" + "=" * line_len)
    print(f"🥇 TOP {n} PASSED STUDENTS RANK LIST (SORTED BY SGPA)")
    print(border)
    print(header)
    print(border)
    for line in row_lines:
        print(line)
    print(border)
    
    print("=" * line_len)


def show_overall_result(students):
    print("📊 [Action] Calculating overall result...")
    total_students = len(students)
    pass_students = sum(1 for s in students if s.get("overall_status") == "PASS")
    fail_students = sum(1 for s in students if s.get("overall_status") == "FAIL")
    unknown_students = total_students - pass_students - fail_students

    overall_result_percent = (
        (pass_students / total_students) * 100.0 if total_students > 0 else 0.0
    )

    print("\n" + "=" * 60)
    print("📊 Summary:")
    print(f"  ✅ PASS: {pass_students}")
    print(f"  ❌ FAIL: {fail_students}")
    if unknown_students > 0:
        print(f"  ❓ UNKNOWN: {unknown_students}")
    print(f"  📈 RESULT: {overall_result_percent:.2f}%")
    print("=" * 60)


def search_student(students):
    seat_input = input("🔎 Enter Seat No: ").strip()
    
    student = next((s for s in students if s['seat_no'] == seat_input), None)
    
    if student:
        rows = []
        fail_count = 0
        for idx in range(SUBJECT_COUNT):
            sub = SUBJECTS.get(idx, f"Unknown {idx}")
            ext_mark = student['marks'][idx][0] if idx < len(student['marks']) else '-'
            int_mark = student['marks'][idx][1] if idx < len(student['marks']) else '-'

            ext_s = display_mark(ext_mark)
            int_s = display_mark(int_mark)
            tot_s = _get_subject_total_display(ext_mark, int_mark)

            grade = student['grades'][idx]
            status = _subject_status(student, idx, ext_mark, int_mark, grade)
            if status == "FAIL":
                fail_count += 1

            grd_s = str(grade) if grade else '--'
            rows.append([idx + 1, sub, ext_s, int_s, tot_s, grd_s, status])

        border, header, row_lines, line_len = _build_table_lines(
            ["No", "Subject", "Ext", "Int", "Tot", "Grade", "Status"],
            rows,
            aligns=["right", "left", "right", "right", "right", "center", "center"],
            max_widths={1: 36},
        )

        print("\n" + "=" * line_len)
        print(f"👤 STUDENT: {student['name'].upper()}")
        print(f"🪪 SEAT NO: {student['seat_no']} | SP ID: {student['sp_id']} | GENDER: {student['gender']}")
        print(f"📌 OVERALL STATUS: {student['overall_status']} | SGPA: {student['sgpa']}")
        print("=" * line_len)
        print(border)
        print(header)
        print(border)
        for line in row_lines:
            print(line)
        print(border)
        print(f"🧮\n >> CALCULATED GRAND TOTAL: {student['total_marks']}")
        if student['overall_status'] == "FAIL":
            if fail_count > 0:
                print(f"❌ >> Student failed in {fail_count} subject(s).")
            else:
                print("❌ >> Student result is FAIL (official result sheet).")
        elif fail_count > 0:
            print(f"❌ >> Student failed in {fail_count} subject(s).")
        else:
            print("✅ >> Student passed all subjects.")
    else:
        print(f"\n❌ [!] Seat No '{seat_input}' not found.")

def process_semester():
    global COURSE_INFO
    print("🚀 Starting Script...")
    pdf_input = input("📄 Enter PDF path or file name: ").strip()
    pdf_path = resolve_pdf_path(pdf_input)

    if not pdf_path:
        entered = pdf_input if pdf_input else "<empty input>"
        print(f"❌ [Error] PDF not found for input: '{entered}'")
        print("💡 Please enter a valid PDF file path or file name.")
        return True

    print(f"✅ [Step 2] File found: {pdf_path}")
    print("")
    COURSE_INFO = extract_course_info_from_pdf(pdf_path)
    print(
        f"🎓 [Info] Course: {COURSE_INFO['course']} | Semester: {COURSE_INFO['semester']}"
    )
    print("")
    detected_count = configure_subject_metadata(pdf_path)
    if detected_count != SUBJECT_COUNT:
        print(
            f"❌ [Error] Could not extract all subjects from PDF. "
            f"Found: {detected_count}/{SUBJECT_COUNT}."
        )
        print("💡 Use the original result PDF format that contains all subject headers.")
        return True
    print(f"✅ [Step 2.1] Auto-detected {detected_count}/{SUBJECT_COUNT} subjects from PDF.")
    show_subject_catalog()

    all_students = load_students(pdf_path)
    
    if not all_students:
        print("❌ No data loaded.")
        return True

    print(f"✅ [Step 4] Loaded {len(all_students)} students successfully.\n")
    
    while True:
        print("\n📋 MENU")
        print("-" * 50)
        print("1. 🔎 Search by Seat No")
        print("2. 🥇 Show Top N Rankers (Passed)")
        print("3. ❌ Show Failed Students")
        print("4. 🏆 Show Subject-wise Topper(s) [All Subjects]")
        print("5. 📚 Show Subject Result (with Failed Students)")
        print("6. 📊 Show Overall Result")
        print("7. 🚪 Exit")
        
        choice = input("👉 Enter Choice (1/2/3/4/5/6/7): ").strip()
        if choice in {'1', '2', '3', '4', '5', '6'}:
            clear_screen()
        
        if choice == '1':
            search_student(all_students)
        elif choice == '2':
            show_top_ranks(all_students)
        elif choice == '3':
            show_failed_students(all_students)
        elif choice == '4':
            show_all_subject_toppers(all_students)
        elif choice == '5':
            show_subject_result(all_students)
        elif choice == '6':
            show_overall_result(all_students)
        elif choice == '7':
            print("👋 Exiting...")
            return False
        else:
            print("❌ Invalid choice. Please try again.")


def main():
    try:
        ensure_runtime_dependencies()
    except RuntimeError as exc:
        print(f"❌ [Error] {exc}")
        return 1

    print("✅ [Step 1] Libraries loaded successfully.")
    while True:
        should_continue = process_semester()
        if not should_continue:
            break
        clear_screen()
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
