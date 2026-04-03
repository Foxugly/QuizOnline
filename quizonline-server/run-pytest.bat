@echo off
setlocal

pushd "%~dp0"
set "DJANGO_ENV=test"
set "PYTHON=%~dp0..\.venv\Scripts\python.exe"

if not exist "%PYTHON%" (
    echo Python virtualenv introuvable: "%PYTHON%"
    popd
    exit /b 1
)

"%PYTHON%" -m pytest %*
set "EXIT_CODE=%ERRORLEVEL%"

popd
exit /b %EXIT_CODE%
