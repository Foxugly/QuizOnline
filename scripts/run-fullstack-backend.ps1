$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $repoRoot 'quizonline-server'
$pythonExe = Join-Path $repoRoot '.venv\Scripts\python.exe'
$dbPath = Join-Path $backendRoot 'db.fullstack.sqlite3'
$mediaPath = Join-Path $backendRoot 'media-fullstack'

# Isolated sqlite DB via DATABASE_URL (SQLITE_NAME is read by nothing — the DB
# is selected by DATABASE_URL, default db.sqlite3). Keep in lockstep with the
# POSIX run-fullstack-backend.sh used by CI.
$env:DATABASE_URL = 'sqlite:///db.fullstack.sqlite3'
$env:MEDIA_ROOT_DIR = 'media-fullstack'
$env:PYTHONUNBUFFERED = '1'
# Tests legitimately exceed the 5/min token_obtain rate (each test logs in via
# the SPA AND calls /api/token/ directly to get a bearer for API checks);
# disable throttles for the test backend so we don't hit 429.
$env:DISABLE_THROTTLES = '1'

if (Test-Path $dbPath) {
  Remove-Item $dbPath -Force
}

if (Test-Path $mediaPath) {
  Remove-Item $mediaPath -Recurse -Force
}

Push-Location $backendRoot
try {
  & $pythonExe manage.py migrate --noinput
  & $pythonExe manage.py seed_fullstack_e2e
  & $pythonExe manage.py runserver 127.0.0.1:8001
} finally {
  Pop-Location
}
