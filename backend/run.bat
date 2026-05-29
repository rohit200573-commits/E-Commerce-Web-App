@echo off
echo =========================================================
echo   Starting Chronos Timepieces Full-Stack Server...
echo   Backend APIs will be available at: http://localhost:8000/docs
echo   Frontend will be served at:       http://localhost:8000/
echo =========================================================
cd /d "%~dp0"
call .\venv\Scripts\activate.bat
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
