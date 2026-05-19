"""Pre-commit guard against an out-of-sync OpenAPI client.

Trigger: any commit that touches a backend file whose changes are
likely to flip the OpenAPI schema (URL routes, serializers, view
return shapes). When such a file is staged but ``openapi.yaml`` /
the generated Angular client are NOT staged in the same commit, the
hook refuses the commit and tells the developer to run
``scripts/sync-openapi.ps1``.

The check is a *heuristic*: changes that genuinely do not affect
the schema (e.g. comment-only edits, refactors that keep the
public field set identical) will still trip the hook. Override via
``git commit --no-verify`` in those cases — but that should be
rare, since the CI re-runs the actual regen and would catch a real
drift anyway.

The matching CI step lives in ``.github/workflows/ci.yml`` under
"Ensure generated artifacts are committed".
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

# Backend changes likely to alter the OpenAPI schema. Conservative —
# we'd rather false-positive than ship a broken client.
TRIGGER_PATTERNS = (
    "quizonline-server/",  # narrow further below
)

TRIGGER_FILES = (
    "api_urls.py",
    "serializers.py",
    "views.py",
)

# When any of those land in staged changes, at least one of these
# generated paths MUST also be staged or the commit is blocked.
EXPECTED_REGEN_PATHS = (
    "quizonline-server/openapi.yaml",
    "quizonline-frontend/openapi.yaml",
    "quizonline-frontend/src/app/api/generated",
)


def staged_files() -> list[str]:
    out = subprocess.run(
        ["git", "diff", "--name-only", "--cached"],
        capture_output=True, text=True, check=True,
    ).stdout
    return [line for line in out.splitlines() if line.strip()]


def _is_trigger(path: str) -> bool:
    if not any(path.startswith(p) for p in TRIGGER_PATTERNS):
        return False
    return any(path.endswith("/" + t) or path == t for t in TRIGGER_FILES)


def _has_regen(paths: list[str]) -> bool:
    return any(
        any(p.startswith(expected) for expected in EXPECTED_REGEN_PATHS)
        for p in paths
    )


def main() -> int:
    staged = staged_files()
    triggers = [p for p in staged if _is_trigger(p)]
    if not triggers:
        return 0
    if _has_regen(staged):
        return 0

    print("❌ OpenAPI sync drift suspected.", file=sys.stderr)
    print("", file=sys.stderr)
    print("These backend files are staged but no generated artifact is:", file=sys.stderr)
    for p in triggers:
        print(f"  - {p}", file=sys.stderr)
    print("", file=sys.stderr)
    print("If the change touches API URLs or serializer fields, run:", file=sys.stderr)
    print("  powershell -ExecutionPolicy Bypass -File scripts/sync-openapi.ps1", file=sys.stderr)
    print("and stage the resulting openapi.yaml + quizonline-frontend/src/app/api/generated changes.", file=sys.stderr)
    print("", file=sys.stderr)
    print("If the change is comment-only / does not affect the public schema,", file=sys.stderr)
    print("override with: git commit --no-verify", file=sys.stderr)
    return 1


if __name__ == "__main__":
    # ``cwd`` may be the repo root or anywhere — we rely on ``git diff``
    # so we don't need to resolve it ourselves.
    sys.exit(main())
