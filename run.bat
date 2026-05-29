@echo off
echo ==========================================================
echo               BOOTING SENPAISUPPLY APIS...
echo ==========================================================
echo.
echo [INFO] Activating Python Virtual Environment...
call .\venv\Scripts\activate.bat
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to activate virtual environment. Is venv folder missing?
    pause
    exit /b %ERRORLEVEL%
)

echo [INFO] Opening system browser to http://127.0.0.1:5000/ ...
start http://127.0.0.1:5000/

echo [INFO] Starting Flask Server...
python app.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Flask server exited with an error.
    pause
)
