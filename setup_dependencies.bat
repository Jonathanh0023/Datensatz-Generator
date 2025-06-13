@echo off
echo ========================================
echo    Setting up Datensatz-Generator
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

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Python version:
python --version
echo Node.js version:
node --version
echo.

REM Install Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)

REM Install Node.js dependencies
echo Installing Node.js dependencies...
npm install
if errorlevel 1 (
    echo ERROR: Failed to install Node.js dependencies
    pause
    exit /b 1
)

REM Install Playwright browsers
echo Installing Playwright browsers...
npx playwright install
if errorlevel 1 (
    echo ERROR: Failed to install Playwright browsers
    pause
    exit /b 1
)

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

echo.
echo ========================================
echo    Setup completed successfully!
echo ========================================
echo.
echo You can now run the Streamlit app with:
echo   start_streamlit.bat
echo.
pause 