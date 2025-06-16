# 🤖 Umfrage-Automatisierung - Einfache Anleitung

## 📋 Was brauche ich?

**Vor dem ersten Start:**
1. **Ordner in lokales Verzeichnis kopieren** - dies hat entscheidenen Einfluss auf die Performance des Skripts
2. **Python** - Herunterladen von: https://python.org
3. **Node.js** - Herunterladen von: https://nodejs.org

## 🚀 Erste Schritte (nur einmal nötig)

### Schritt 1: Programme installieren
1. Python installieren (Version 3.8 oder neuer)
2. Node.js installieren (Version 16 oder neuer)
3. Computer neu starten

### Schritt 2: Abhängigkeiten installieren
1. Doppelklick auf: `setup_dependencies.bat`
2. Warten bis "Setup completed successfully!" erscheint
3. Fenster schließen

## 🌐 App starten (jedes Mal)

### So startest du die Web-App:
1. Doppelklick auf: `start_streamlit_quick.bat`
2. Warten bis "OEFFNE: http://localhost:8501" erscheint
3. Browser öffnet automatisch ODER
4. Manuell öffnen: http://localhost:8501

## 📊 App benutzen

### 1. Umfrage konfigurieren (Seitenleiste links)
- **Umfrage-URL**: Deine Rogator-Umfrage-URL einfügen
- **Anzahl Testläufe**: Wie viele Umfragen (z.B. 5)
- **Sprache**: Deutsch oder Englisch wählen

### 2. Screener einrichten (optional)
- **Screener aktivieren**: Häkchen setzen
- **Fragen hinzufügen**: Button "➕ Frage hinzufügen"
- **Beispiel**:
  - Frage: "Wie alt sind Sie?"
  - Antwort: "45"

### 3. Modus wählen
- **Normal**: Standard (empfohlen für Anfänger)
- **Visuell**: Du siehst den Browser (langsamer, gut zum Testen)
- **Turbo**: Schneller
- **Gleichzeitig**: Mehrere Browser parallel (sehr schnell)

### 4. Umfrage starten
1. **"💾 Konfiguration speichern"** klicken
2. **"▶️ Umfrage starten"** klicken
3. **Warten und zuschauen** - die Logs zeigen den Fortschritt
4. **Stoppen**: "⏹️ Umfrage stoppen" falls nötig

### 5. Ergebnisse anschauen
- **Logs**: Echzeit-Fortschritt im Hauptbereich
- **Auswertung**: Tab "📊 Auswertung" für Statistiken
- **Download**: CSV-Export für weitere Analyse

## 🎯 Tipps für Anfänger

### Erster Test:
1. **Kleine Anzahl**: Starte mit 2-3 Testläufen
2. **Visuell-Modus**: Nutze "Visuell" um zu sehen was passiert
3. **Ohne Screener**: Erstmal ohne vordefinierte Antworten testen

### Häufige Probleme:
- **Browser öffnet nicht**: Manuell zu http://localhost:8501 gehen
- **"Port already in use"**: Andere Terminal-Fenster schließen
- **Fehler beim Start**: `setup_dependencies.bat` nochmal ausführen

## 📱 Bedienung im Browser

### Seitenleiste (links):
- **⚙️ Konfiguration**: Alle Einstellungen
- **📊 Screener**: Vordefinierte Antworten
- **🚀 Ausführung**: Start/Stop-Buttons

### Hauptbereich (rechts):
- **📋 Live-Logs**: Was gerade passiert
- **📊 Auswertung**: Ergebnisse und Statistiken
- **📈 Charts**: Grafische Darstellung

## 🆘 Hilfe

### App stoppen:
- **Im Browser**: "⏹️ Umfrage stoppen" klicken
- **Im Terminal**: Strg+C drücken
- **Notfall**: Terminal-Fenster schließen

### Neu starten:
1. Terminal-Fenster schließen
2. `start_streamlit_quick.bat` wieder doppelklicken

### Alles zurücksetzen:
1. `setup_dependencies.bat` nochmal ausführen
2. Computer neu starten
3. `start_streamlit_quick.bat` starten

## ✅ Erfolgreich nutzen

**Du weißt, dass es funktioniert wenn:**
- ✅ Browser öffnet sich zu http://localhost:8501
- ✅ Du siehst "Rogator Umfrage-Automatisierung" als Titel
- ✅ Links ist eine Seitenleiste mit Einstellungen
- ✅ "▶️ Umfrage starten" Button ist sichtbar

**Bei Problemen:**
- Screenshot machen
- Terminal-Ausgabe kopieren
- Hilfe holen 😊 