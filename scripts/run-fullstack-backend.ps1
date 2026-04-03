$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $repoRoot 'quizonline-server'
$pythonExe = Join-Path $repoRoot '.venv\Scripts\python.exe'
$dbPath = Join-Path $backendRoot 'db.fullstack.sqlite3'
$mediaPath = Join-Path $backendRoot 'media-fullstack'

$env:SQLITE_NAME = 'db.fullstack.sqlite3'
$env:MEDIA_ROOT_DIR = 'media-fullstack'
$env:PYTHONUNBUFFERED = '1'

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
