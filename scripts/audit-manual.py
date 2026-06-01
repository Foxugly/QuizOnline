"""Deep coherence audit of docs/manual/.

Run from repo root: python3 scripts/audit-manual.py
"""
import re
from pathlib import Path

ROOT = Path("docs/manual")
LOCALES = ["fr", "en", "nl"]
EXPECTED_FILES = ["index.md", "learner.md", "instructor.md", "admin.md"]

issues = []

# --- 1. Required files present per locale ---
print("=== 1. Required files ===")
for loc in LOCALES:
    for f in EXPECTED_FILES:
        p = ROOT / loc / f
        if not p.exists():
            issues.append(f"MISSING: {p}")
print(f"  {len(issues)} issues so far")

# --- 2. Screenshot references vs actual files ---
print("\n=== 2. Screenshot references ===")
img_pattern = re.compile(r"!\[[^\]]*\]\(([^)]+)\)")
all_referenced_pngs = {}
all_existing_pngs = set()

for loc in LOCALES:
    for png in (ROOT / "screenshots" / loc).glob("*.png"):
        all_existing_pngs.add(f"screenshots/{loc}/{png.name}")

for md_file in ROOT.rglob("*.md"):
    text = md_file.read_text(encoding="utf-8")
    for line_no, line in enumerate(text.splitlines(), 1):
        for m in img_pattern.finditer(line):
            ref = m.group(1)
            if ref.startswith("../"):
                normalized = ref.replace("../", "")
            else:
                normalized = ref
            all_referenced_pngs.setdefault(normalized, []).append(
                f"{md_file.relative_to(ROOT)}:{line_no}"
            )

broken = []
for ref, sources in all_referenced_pngs.items():
    if ref.startswith("screenshots/") and ref not in all_existing_pngs:
        for src in sources:
            broken.append(f"  BROKEN: {src} -> {ref}")

orphans = sorted(all_existing_pngs - set(all_referenced_pngs.keys()))

print(f"  Broken refs: {len(broken)}")
for b in broken[:20]:
    print(b)
print(f"  Orphan files: {len(orphans)}")
for o in orphans[:20]:
    print(f"    ORPHAN: {o}")

# --- 3. Symmetry across locales ---
print("\n=== 3. Screenshot symmetry per locale ===")
by_loc = {}
for loc in LOCALES:
    by_loc[loc] = sorted([p.name for p in (ROOT / "screenshots" / loc).glob("*.png")])

ref_loc = "fr"
symmetric = True
for loc in LOCALES:
    if loc == ref_loc:
        continue
    diff_added = set(by_loc[loc]) - set(by_loc[ref_loc])
    diff_removed = set(by_loc[ref_loc]) - set(by_loc[loc])
    if diff_added:
        print(f"  {loc} has extras vs {ref_loc}: {sorted(diff_added)}")
        symmetric = False
    if diff_removed:
        print(f"  {loc} missing vs {ref_loc}: {sorted(diff_removed)}")
        symmetric = False
if symmetric:
    print("  All locales have identical screenshot sets")

# --- 4. Cross-locale screenshot ref pollution ---
print("\n=== 4. Cross-locale ref pollution ===")
pollution = []
for loc in LOCALES:
    for md_file in (ROOT / loc).glob("*.md"):
        text = md_file.read_text(encoding="utf-8")
        for m in img_pattern.finditer(text):
            ref = m.group(1)
            if ref.startswith("../screenshots/"):
                ref_loc = ref.split("/")[2]
                if ref_loc != loc:
                    pollution.append(f"  {md_file.relative_to(ROOT)} references {loc}'s screenshot from {ref_loc}: {ref}")
print(f"  Cross-locale pollution: {len(pollution)}")
for p in pollution[:10]:
    print(p)

# --- 5. URL routes check ---
print("\n=== 5. URL refs vs known SPA routes ===")
KNOWN_ROUTES = {
    "/", "/home", "/login", "/dashboard", "/about", "/donate", "/features",
    "/privacy", "/preferences", "/notifications", "/messages",
    "/reset-password", "/change-password", "/register",
    "/domain/list", "/domain/add",
    "/user/list", "/user/add",
    "/subject/list", "/subject/add",
    "/question/list", "/question/add", "/question/import",
    "/quiz/add", "/quiz/list", "/quiz/quick", "/quiz/test",
    "/admin/stats", "/admin/system-config", "/admin/languages", "/admin/mail-test",
    "/catalog", "/course/list", "/course/new",
    "/me/invitations", "/me/progress", "/me/certificates",
}
KNOWN_PARAM_ROUTES = {
    "/user/<id>/edit", "/user/<id>/delete",
    "/domain/<id>/edit", "/domain/<id>/delete", "/domain/<domainId>/join-requests",
    "/subject/<id>/edit", "/subject/<id>/delete",
    "/question/<questionId>/edit", "/question/<questionId>/delete", "/question/<questionId>/view",
    "/quiz/<id>",
    "/quiz/template/<templateId>/edit", "/quiz/template/<templateId>/delete", "/quiz/template/<templateId>/results",
    "/quiz/<quizId>/delete/<templateId>", "/quiz/<quizId>/delete",
    "/messages/<alertId>",
    "/join-request/decide/<token>", "/invite/accept/<token>", "/transfer/accept/<token>",
    "/course/<slug>", "/course/<id>/edit",
    "/lesson/<id>", "/lesson/<id>/edit",
    "/course-invite/<token>",
    "/certificate/<id>", "/verify/<token>",
    "/auth/magic/<token>",
}
url_pattern = re.compile(r"`(/[a-zA-Z0-9_/<>\?\-]+)`")
unknown_urls = []
for md_file in ROOT.rglob("*.md"):
    text = md_file.read_text(encoding="utf-8")
    for line_no, line in enumerate(text.splitlines(), 1):
        for m in url_pattern.finditer(line):
            url = m.group(1)
            if url.endswith(".md") or url == "/" or "/admin/" in url:
                continue
            base = url.split("?")[0]
            if base in KNOWN_ROUTES:
                continue
            matched = False
            for tmpl in KNOWN_PARAM_ROUTES:
                tmpl_parts = tmpl.split("/")
                url_parts = base.split("/")
                if len(tmpl_parts) == len(url_parts):
                    if all(t == u or t.startswith("<") for t, u in zip(tmpl_parts, url_parts)):
                        matched = True
                        break
            if not matched:
                unknown_urls.append(f"  {md_file.relative_to(ROOT)}:{line_no} -> {url}")

print(f"  Unknown URL refs: {len(unknown_urls)}")
for u in unknown_urls[:25]:
    print(u)

# --- 6. /lms/ leftover detection ---
print("\n=== 6. /lms/ stale prefix detection ===")
lms_hits = []
for md_file in ROOT.rglob("*.md"):
    text = md_file.read_text(encoding="utf-8")
    for line_no, line in enumerate(text.splitlines(), 1):
        if "/lms/" in line:
            lms_hits.append(f"  {md_file.relative_to(ROOT)}:{line_no} -> {line.strip()[:80]}")
print(f"  /lms/ leftover: {len(lms_hits)}")
for h in lms_hits[:10]:
    print(h)

# --- 7. TOC anchor coherence ---
print("\n=== 7. TOC anchor coherence ===")
anchor_re = re.compile(r"\[[^\]]+\]\((#[^)]+)\)")
def slug(text):
    """Replicate GitHub's auto-anchor algorithm.

    Critical detail: each space becomes ONE hyphen, even consecutive spaces.
    "Prérequis : être" -> "prérequis  être" (colon dropped, two spaces stay)
    -> "prérequis--être" (double hyphen). Collapsing ``\\s+`` to a single
    hyphen would diverge from GitHub and produce false-positive mismatches.
    """
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = text.strip().replace(" ", "-")
    return text

bad_anchors = []
for md_file in ROOT.rglob("*.md"):
    text = md_file.read_text(encoding="utf-8")
    headings = re.findall(r"^#{2,}\s+(.+?)\s*$", text, flags=re.MULTILINE)
    avail_anchors = {slug(h) for h in headings}
    for m in anchor_re.finditer(text):
        anchor = m.group(1)[1:]
        if anchor not in avail_anchors:
            bad_anchors.append(f"  {md_file.relative_to(ROOT)}: anchor #{anchor} has no matching heading")

print(f"  Anchor mismatches: {len(bad_anchors)}")
for a in bad_anchors[:15]:
    print(a)

# --- 8. Cross-file links ---
print("\n=== 8. Cross-file links ===")
file_link_re = re.compile(r"\]\(([a-z][a-zA-Z0-9_.-]*\.md)(?:#[^)]+)?\)")
bad_files = []
for md_file in ROOT.rglob("*.md"):
    text = md_file.read_text(encoding="utf-8")
    md_dir = md_file.parent
    for line_no, line in enumerate(text.splitlines(), 1):
        for m in file_link_re.finditer(line):
            target = md_dir / m.group(1)
            if not target.exists():
                bad_files.append(f"  {md_file.relative_to(ROOT)}:{line_no} -> {m.group(1)} (resolved: {target.relative_to(ROOT) if target.is_relative_to(ROOT) else target}) MISSING")
print(f"  Broken file links: {len(bad_files)}")
for b in bad_files[:10]:
    print(b)

# --- 9. Per-locale terminology spot-check ---
print("\n=== 9. Terminology spot-check ===")
SUSPICIOUS = {
    "fr": [
        (r"\bSign in\b", "EN term in FR"),
        (r"\bLogin\b", "EN term in FR"),
        (r"\bDashboard\b", "EN term in FR"),
        (r"\bWelcome\b", "EN term in FR"),
        (r"\bAanmelden\b", "NL term in FR"),
    ],
    "en": [
        (r"\bConnexion\b", "FR term in EN"),
        (r"\bBienvenue\b", "FR term in EN"),
        (r"\bTableau de bord\b", "FR term in EN"),
        (r"\bleçon\b", "FR term in EN"),
        (r"\bcours\b", "FR term in EN (lowercase)"),
        (r"\bAanmelden\b", "NL term in EN"),
    ],
    "nl": [
        (r"\bConnexion\b", "FR term in NL"),
        (r"\bSign in\b", "EN term in NL"),
        (r"\bDashboard\b", "EN term in NL (only top-bar label is OK)"),
        (r"\bTableau de bord\b", "FR term in NL"),
        (r"\bleçon\b", "FR term in NL"),
    ],
}
mistakes = []
for loc in LOCALES:
    for md_file in (ROOT / loc).glob("*.md"):
        text = md_file.read_text(encoding="utf-8")
        for pat, why in SUSPICIOUS[loc]:
            for m in re.finditer(pat, text):
                line_no = text[:m.start()].count("\n") + 1
                line = text.splitlines()[line_no - 1] if line_no - 1 < len(text.splitlines()) else ""
                mistakes.append(f"  {md_file.relative_to(ROOT)}:{line_no} ({why}) '{m.group(0)}': {line.strip()[:100]}")
print(f"  Suspicious cross-language terms: {len(mistakes)}")
for m in mistakes[:30]:
    print(m)

# --- 10. /lms/ leftover in screenshots filenames? (sanity) ---
print("\n=== 10. Screenshot filename sanity ===")
weird_pngs = []
for loc in LOCALES:
    for png in (ROOT / "screenshots" / loc).glob("*.png"):
        if not re.match(r"^(learner|instructor|admin)-\d{2}[a-z]?-[a-z0-9-]+\.png$", png.name):
            weird_pngs.append(f"  {png.relative_to(ROOT)}")
print(f"  Weird filenames: {len(weird_pngs)}")
for p in weird_pngs[:10]:
    print(p)

print("\n=== SUMMARY ===")
total_issues = (
    len(issues) + len(broken) + len(orphans) + len(pollution)
    + len(unknown_urls) + len(lms_hits) + len(bad_anchors)
    + len(bad_files) + len(mistakes) + len(weird_pngs)
)
print(f"  Required files missing:        {len(issues)}")
print(f"  Broken screenshot refs:        {len(broken)}")
print(f"  Orphan screenshots:            {len(orphans)}")
print(f"  Cross-locale pollution:        {len(pollution)}")
print(f"  Unknown URL refs:              {len(unknown_urls)}")
print(f"  /lms/ stale prefix:            {len(lms_hits)}")
print(f"  TOC anchor mismatches:         {len(bad_anchors)}")
print(f"  Broken cross-file links:       {len(bad_files)}")
print(f"  Suspicious cross-lang terms:   {len(mistakes)}")
print(f"  Weird screenshot filenames:    {len(weird_pngs)}")
print(f"  TOTAL:                         {total_issues}")
