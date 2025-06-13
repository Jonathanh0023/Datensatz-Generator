# Rogator Survey Tester

Dieses Skript führt automatisierte Testdurchläufe für eine konfigurierte Rogator-Umfrage mit Playwright durch.

## 🌟 Neue Web-App verfügbar!

**Für eine benutzerfreundliche Oberfläche nutzen Sie die neue Streamlit Web-App:**

### Schnellstart Web-App:
```bash
# Abhängigkeiten installieren
pip install streamlit pandas plotly

# Web-App starten
streamlit run streamlit_app.py
```

**Oder einfach die Batch-Datei ausführen:**
```bash
run_streamlit_app.bat
```

Die Web-App bietet:
- 📊 **Interaktives Dashboard** mit Live-Monitoring
- ⚙️ **Einfache Konfiguration** über Web-Interface
- 🚀 **Verschiedene Ausführungsmodi** (Normal, Visual, Turbo, Concurrent)
- 📈 **Ergebnis-Visualisierung** mit Diagrammen und Metriken
- 🎯 **Screener-Konfiguration** über benutzerfreundliche Formulare

**Detaillierte Anleitung:** Siehe [STREAMLIT_README.md](STREAMLIT_README.md)

---

## Kommandozeilen-Version (Original)

## Voraussetzungen

*   **Node.js und npm:** Stelle sicher, dass Node.js (Version 16 oder höher empfohlen) und npm auf deinem System installiert sind. Du kannst sie von [https://nodejs.org/](https://nodejs.org/) herunterladen.

## Einrichtung

1.  **Abhängigkeiten installieren:**
    *   Öffne eine Kommandozeile (cmd oder PowerShell) im Verzeichnis.
			npx playwright install

## Konfiguration

*   Bearbeite die Datei `config.json` im `rogator-tester`-Verzeichnis, um die Testparameter anzupassen:
    *   `surveyUrl`: Die URL der Rogator-Umfrage.
    *   `numTestRuns`: Die Anzahl der gewünschten Testdurchläufe.
    *   `logDirectory`: Der Ordner (relativ zum `rogator-tester`-Verzeichnis), in dem die JSON-Logdateien gespeichert werden sollen. Dieser Ordner wird bei Bedarf erstellt.
    *   `preferredLanguage`: Die bevorzugte Sprache für die Umfrage ("deutsch" oder "english").

### Screener-Konfiguration

Das Skript unterstützt vordefinierte Antworten für spezifische Fragen (Screener). Dies ist nützlich, um konsistente Antworten für Qualifikationsfragen zu gewährleisten.

*   `screener.enabled`: Aktiviert/deaktiviert den Screener-Modus (true/false).
*   `screener.questions`: Array von Screener-Regeln mit folgenden Eigenschaften:
    *   `questionText`: Der Text der Frage, für die eine vordefinierte Antwort gesetzt werden soll.
    *   `answerText`: Die gewünschte Antwort.
    *   `description`: Optionale Beschreibung der Regel.

**Beispiel-Konfiguration:**
```json
{
  "screener": {
    "enabled": true,
    "questions": [
      {
        "questionText": "Are you … ?",
        "answerText": "Female",
        "description": "Gender selection - always select Female"
      },
      {
        "questionText": "What is your age?",
        "answerText": "25",
        "description": "Age question - always answer 25"
      }
    ]
  }
}
```

**Unterstützte Fragetypen für Screener:**
- **Single Choice:** Wählt die Option mit dem passenden Text aus
- **Multiple Choice:** Wählt die Option mit dem passenden Text aus (als einzige Auswahl)
- **Freitext:** Gibt den vordefinierten Text ein
- **Dropdown:** Wählt die Option mit dem passenden Text aus

**Hinweise:**
- Die Textübereinstimmung ist nicht case-sensitive
- Das Skript sucht nach exakter Übereinstimmung oder Teilübereinstimmung im Fragetext
- Wenn keine Screener-Regel gefunden wird, werden zufällige Antworten generiert
- **Wichtig:** Spezifische Antworten für Alter, Postleitzahl, Stadt etc. sollten über die Screener-Konfiguration definiert werden, nicht mehr im Code hardcodiert

**Beispiele für häufige Fragetypen:**
```json
{
  "questionText": "Wie alt sind Sie?",
  "answerText": "28",
  "description": "Altersfrage"
},
{
  "questionText": "Postleitzahl",
  "answerText": "10115",
  "description": "PLZ Berlin"
},
{
  "questionText": "In welcher Stadt wohnen Sie?",
  "answerText": "Berlin",
  "description": "Wohnort"
}
```

## Ausführung

1.  **Test starten:**
    *   Öffne eine Kommandozeile (cmd oder PowerShell) im `rogator-tester`-Verzeichnis.
    *   Führe das Skript `run_survey.bat` aus.
    ```bash
    .\run_survey.bat
    ```

2.  **Optionale Modi:**
    *   **Turbo-Modus:** Führt den Test schneller aus (Headless-Browser, keine Wartezeiten, blockiert Bilder/CSS). Hänge `--turbo` an den Befehl an:
        ```bash
        .\run_survey.bat --turbo
        ```
    *   **Debug-Modus:** Erstellt zusätzliche Screenshots (z.B. von der Endseite). Hänge `--debug` an den Befehl an:
        ```bash
        .\run_survey.bat --debug
        ```
    *   Beide Modi können kombiniert werden:
        ```bash
        .\run_survey.bat --turbo --debug
        ```

## Logs

*   Nach jedem Durchlauf wird eine JSON-Datei mit detaillierten Logs im konfigurierten `logDirectory` (standardmäßig `logs/`) gespeichert. Der Dateiname enthält einen Zeitstempel.
*   Fehler-Screenshots (z.B. bei Interaktionsfehlern oder unerwarteten Seiten) werden direkt im `rogator-tester`-Verzeichnis gespeichert. 
