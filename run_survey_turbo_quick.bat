@echo off
echo ========================================
echo    Quick Turbo Mode (5 concurrent)
echo ========================================
echo.
echo Running 5 concurrent instances in turbo mode...
echo This is the fastest way to complete surveys!
echo.
pause

node src/rogator_direct_minimal.js --turbo --concurrent=5

echo.
echo ========================================
echo COMPLETED!
echo ========================================
echo Check the 'logs' directory for results.
pause 
