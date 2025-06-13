@echo off
echo ========================================
echo    Rogator Survey Automation Web App
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

REM Check if streamlit is installed
python -c "import streamlit" >nul 2>&1
if errorlevel 1 (
    echo Installing Streamlit dependencies...
    pip install -r requirements_streamlit.txt
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo Starting Streamlit web app...
echo.
echo The web app will open in your default browser.
echo If it doesn't open automatically, go to: http://localhost:8501
echo.
echo Press Ctrl+C to stop the web app
echo.

REM Start Streamlit
streamlit run streamlit_app.py --server.port 8501 --server.address localhost

pause 
