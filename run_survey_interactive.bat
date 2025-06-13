@echo off
color 0A

:start
cls
echo.
echo ========================================
echo    Rogator Survey Automation Tool
echo ========================================
echo.
echo Choose your automation mode:
echo.
echo [1] Visual Mode (Browser visible, slower)
echo [2] Turbo Mode (Headless, faster)
echo [3] Exit
echo.
set /p mode_choice="Enter your choice (1-3): "

if "%mode_choice%"=="1" goto visual_mode
if "%mode_choice%"=="2" goto turbo_mode
if "%mode_choice%"=="3" goto exit
goto invalid_choice

:visual_mode
echo.
echo ========================================
echo Starting VISUAL MODE
echo ========================================
echo * Browser window will be visible
echo * Actions will be slowed down for visibility
echo * Press Ctrl+C to stop
echo.
pause
echo.
echo Running visual mode...
node src/rogator_direct_minimal.js --visual
goto completed

:turbo_mode
echo.
echo ========================================
echo TURBO MODE Configuration
echo ========================================
echo.
echo How many concurrent instances do you want to run?
echo (Recommended: 2-10, depending on your system)
echo (Higher numbers = faster completion but more CPU/RAM usage)
echo.
set /p concurrent="Enter number of concurrent instances (1-20): "

:: Validate input
if "%concurrent%"=="" goto invalid_concurrent
if %concurrent% LEQ 0 goto invalid_concurrent
if %concurrent% GTR 20 goto too_many_concurrent

echo.
echo ========================================
echo Starting TURBO MODE
echo ========================================
echo * Mode: Headless (no browser window)
echo * Concurrent instances: %concurrent%
echo * Estimated completion time: Much faster!
echo.
pause
echo.
echo Running turbo mode with %concurrent% concurrent instances...
node src/rogator_direct_minimal.js --turbo --concurrent=%concurrent%
goto completed

:invalid_choice
echo.
echo [ERROR] Invalid choice! Please enter 1, 2, or 3.
echo.
pause
goto start

:invalid_concurrent
echo.
echo [ERROR] Please enter a valid number between 1 and 20.
echo.
pause
goto turbo_mode

:too_many_concurrent
echo.
echo [WARNING] %concurrent% concurrent instances might be too many!
echo This could overload your system or the survey server.
echo.
echo Do you want to continue anyway?
set /p confirm="Type 'yes' to continue or press Enter to go back: "
if /i "%confirm%"=="yes" (
    echo.
    echo Running turbo mode with %concurrent% concurrent instances...
    node src/rogator_direct_minimal.js --turbo --concurrent=%concurrent%
    goto completed
) else (
    goto turbo_mode
)

:completed
echo.
echo ========================================
echo AUTOMATION COMPLETED
echo ========================================
echo.
echo Check the 'logs' directory for detailed results!
echo.
echo Want to run another automation?
set /p restart="Press 'r' to restart or any other key to exit: "
if /i "%restart%"=="r" goto start
goto exit

:exit
echo.
echo Thank you for using Rogator Survey Automation!
echo.
pause
exit 
