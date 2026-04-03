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

"%PYTHON%" -m coverage erase
if errorlevel 1 goto :end

"%PYTHON%" -m coverage run -m pytest %*
if errorlevel 1 goto :end

"%PYTHON%" -m coverage report -m
if errorlevel 1 goto :end

"%PYTHON%" -m coverage html

:end
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
