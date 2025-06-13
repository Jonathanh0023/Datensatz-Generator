@echo off
chcp 65001 >nul
echo Starte Streamlit Web-App...
echo.
echo ========================================
echo    OEFFNE: http://localhost:8501
echo ========================================
echo.
echo Druecke Strg+C zum Beenden
echo.

streamlit run streamlit_app.py --server.port 8501 --server.address 0.0.0.0 --server.headless true --browser.gatherUsageStats false

pause 