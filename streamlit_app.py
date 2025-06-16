import streamlit as st
import json
import os
import subprocess
import threading
import time
from datetime import datetime
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from pathlib import Path
import queue

# Page configuration
st.set_page_config(
    page_title="bonsAI - Umfrage-Automatisierung",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state safely
def init_session_state():
    if 'survey_running' not in st.session_state:
        st.session_state.survey_running = False
    if 'survey_logs' not in st.session_state:
        st.session_state.survey_logs = []
    if 'config_data' not in st.session_state:
        st.session_state.config_data = {}
    if 'log_queue' not in st.session_state:
        st.session_state.log_queue = queue.Queue()

def load_config():
    """Load configuration from config.json"""
    try:
        with open('config.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        st.error(f"Error loading config.json: {e}")
        return {}

def save_config(config_data):
    """Save configuration to config.json"""
    try:
        with open('config.json', 'w', encoding='utf-8') as f:
            json.dump(config_data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        st.error(f"Error saving config.json: {e}")
        return False

def get_log_files():
    """Get list of log files"""
    log_dir = Path("logs")
    if not log_dir.exists():
        return []
    return sorted([f for f in log_dir.glob("*.json")], key=lambda x: x.stat().st_mtime, reverse=True)

def load_log_file(log_file):
    """Load and parse log file"""
    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        st.error(f"Error loading log file: {e}")
        return []

def run_survey_process(config_data, mode_args, log_queue):
    """Run the survey process in a separate thread, putting logs into a queue"""
    try:
        save_config(config_data)
        cmd = ["node", "src/rogator_direct_minimal.js"] + mode_args
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True,
            encoding='utf-8',
            errors='replace'
        )
        
        st.session_state.survey_process = process
        
        for line in iter(process.stdout.readline, ''):
            if line:
                log_queue.put(line.strip())
        
        process.wait()
        
    except Exception as e:
        log_queue.put(f"ERROR: {str(e)}")
    finally:
        # Signal that the process is finished
        log_queue.put(None)

# Main app
def main():
    st.title("🤖 Datensatz-Generator")
    
    # Load current config
    config_data = load_config()
    
    # Sidebar for configuration
    with st.sidebar:
        st.header("⚙️ Konfiguration")
        
        # Survey URL
        survey_url = st.text_input(
            "Umfrage-URL",
            value=config_data.get('surveyUrl', ''),
            help="Die Umfrage-URL, die du automatisieren möchtest"
        )
        
        # Number of test runs
        num_runs = st.number_input(
            "Anzahl der Testläufe",
            min_value=1,
            max_value=100,
            value=config_data.get('numTestRuns', 5),
            help="Wie viele Umfragen abgeschlossen werden sollen"
        )
        
        # Set default language (no UI selection needed)
        language = "deutsch"
        
        st.subheader("🎯 Screener-Konfiguration")
        
        # Screener enabled
        screener_enabled = st.checkbox(
            "Screener-Modus aktivieren",
            value=config_data.get('screener', {}).get('enabled', False),
            help="Verwende vordefinierte Antworten für bestimmte Fragen"
        )
        
        screener_questions = []
        if screener_enabled:
            st.markdown("**Vordefinierte Antworten:**")
            
            # Load existing screener questions
            existing_questions = config_data.get('screener', {}).get('questions', [])
            
            # Display existing questions
            for i, q in enumerate(existing_questions):
                col1, col2, col3 = st.columns([3, 3, 1])
                with col1:
                    question_text = st.text_input(f"Frage {i+1}", value=q.get('questionText', ''), key=f"q_{i}")
                with col2:
                    answer_text = st.text_input(f"Antwort {i+1}", value=q.get('answerText', ''), key=f"a_{i}")
                with col3:
                    if st.button("🗑️", key=f"del_{i}", help="Diese Frage löschen"):
                        existing_questions.pop(i)
                        st.rerun()
                
                if question_text and answer_text:
                    screener_questions.append({
                        'questionText': question_text,
                        'answerText': answer_text
                    })
            
            # Add new question button
            if st.button("➕ Frage hinzufügen"):
                existing_questions.append({'questionText': '', 'answerText': ''})
                st.rerun()
        
        st.subheader("🚀 Ausführungsmodus")
        
        # Execution mode
        mode_options_map = {
            "Normal": "Normal",
            "Turbo": "Turbo",
            "Parallel": "Concurrent"
        }
        execution_mode_display = st.radio(
            "Modus",
            options=list(mode_options_map.keys()),
            help="Wähle den Ausführungsmodus"
        )
        execution_mode = mode_options_map[execution_mode_display]

        concurrent_instances = 1
        if execution_mode == "Concurrent":
            concurrent_instances = st.slider(
                "Gleichzeitige Instanzen",
                min_value=2,
                max_value=100,
                value=50,
                help="Anzahl der parallelen Browser-Instanzen"
            )
        
        # Build config data
        updated_config = {
            'surveyUrl': survey_url,
            'numTestRuns': num_runs,
            'preferredLanguage': language,
            'logDirectory': 'logs',
            'screener': {
                'enabled': screener_enabled,
                'questions': screener_questions
            }
        }
        
        # Save config button
        if st.button("💾 Konfiguration speichern"):
            if save_config(updated_config):
                st.success("Konfiguration gespeichert!")
                st.rerun()
    
    # Main content area - single column layout
    st.markdown("---")
    st.header("🎮 Hauptmenü")
    
    # Survey control buttons
    button_col1, button_col2, button_col3 = st.columns(3)
    
    with button_col1:
        if not st.session_state.survey_running:
            if st.button("▶️ Umfrage starten", type="primary", use_container_width=True):
                if not survey_url:
                    st.error("Bitte gib zuerst eine Umfrage-URL ein!")
                else:
                    # Build mode arguments
                    mode_args = []
                    if execution_mode == "Turbo":
                        mode_args.append("--turbo")
                    elif execution_mode == "Concurrent":
                        mode_args.extend(["--turbo", f"--concurrent={concurrent_instances}"])
                    
                    # Clear previous logs
                    st.session_state.survey_logs = []
                    st.session_state.survey_running = True
                    
                    # Use the queue from session state
                    log_queue = st.session_state.log_queue
                    
                    # Start survey in thread
                    thread = threading.Thread(
                        target=run_survey_process,
                        args=(updated_config, mode_args, log_queue)
                    )
                    thread.daemon = True
                    thread.start()
                    
                    st.success(f"Umfrage im {execution_mode_display}-Modus gestartet!")
                    st.rerun()
        else:
            if st.button("⏹️ Umfrage stoppen", type="secondary", use_container_width=True):
                if hasattr(st.session_state, 'survey_process'):
                    st.session_state.survey_process.terminate()
                st.session_state.survey_running = False
                st.warning("Umfrage gestoppt!")
                st.rerun()
    
    with button_col2:
        if st.button("🔄 Logs aktualisieren", use_container_width=True):
            st.rerun()
    
    with button_col3:
        if st.button("🗑️ Logs löschen", use_container_width=True):
            st.session_state.survey_logs = []
            st.rerun()
    
    # Status indicator
    if st.session_state.survey_running:
        st.success("🟢 Umfrage läuft...")
    else:
        st.info("🔵 Umfrage gestoppt")
    
    # Simplified Live logs
    st.subheader("📋 Umfrage-Verlauf")
    
    # This part handles draining the queue and updating the UI
    while not st.session_state.get('log_queue', queue.Queue()).empty():
        log_entry = st.session_state.log_queue.get_nowait()
        if log_entry is None:
            st.session_state.survey_running = False
            break
        st.session_state.survey_logs.append({
            'timestamp': datetime.now().strftime('%H:%M:%S'),
            'message': log_entry
        })

    log_placeholder = st.empty()

    def simplify_log_message(message):
        """Make log messages more human-readable"""
        # Remove technical prefixes and simplify common messages
        message = message.strip()
        
        # Common patterns to simplify
        if "=== Minimal Rogator Automation ===" in message:
            return "🚀 Umfrage-Automatisierung gestartet"
        elif "Configuration loaded successfully" in message:
            return "✅ Konfiguration geladen"
        elif "Starting survey run" in message:
            return "▶️ Neuer Umfrage-Durchlauf gestartet"
        elif "Survey completed successfully" in message:
            return "✅ Umfrage erfolgreich abgeschlossen"
        elif "Processing page" in message:
            return "📄 Bearbeite Seite..."
        elif "Found question:" in message:
            return f"❓ Frage gefunden: {message.split('Found question:')[-1].strip()}"
        elif "Selected answer:" in message:
            return f"✔️ Antwort gewählt: {message.split('Selected answer:')[-1].strip()}"
        elif "Error:" in message.lower():
            return f"❌ Fehler: {message.split('Error:')[-1].strip()}"
        elif "WARNING:" in message:
            return f"⚠️ Warnung: {message.split('WARNING:')[-1].strip()}"
        elif message.startswith("[") and "]" in message:
            # Remove timestamp prefix if it exists
            return message.split("]", 1)[-1].strip()
        
        return message

    with log_placeholder.container():
        if st.session_state.survey_running:
            st.info("🟢 Umfrage läuft... Hier siehst du was gerade passiert:")
        else:
            st.info("🔵 Umfrage ist gestoppt.")
        
        # Display simplified logs from session state
        if st.session_state.survey_logs:
            # Show only the last 20 messages for better readability
            recent_logs = st.session_state.survey_logs[-20:]
            
            for log in reversed(recent_logs):
                simplified_message = simplify_log_message(log['message'])
                
                # Color code based on message type
                if simplified_message.startswith("✅"):
                    st.success(f"[{log['timestamp']}] {simplified_message}")
                elif simplified_message.startswith("❌"):
                    st.error(f"[{log['timestamp']}] {simplified_message}")
                elif simplified_message.startswith("⚠️"):
                    st.warning(f"[{log['timestamp']}] {simplified_message}")
                elif simplified_message.startswith("🚀") or simplified_message.startswith("▶️"):
                    st.info(f"[{log['timestamp']}] {simplified_message}")
                else:
                    st.text(f"[{log['timestamp']}] {simplified_message}")
        else:
            st.info("Noch keine Aktivität. Starte eine Umfrage, um den Verlauf zu sehen.")
    
    # Auto-refresh when survey is running
    if st.session_state.survey_running:
        time.sleep(1)  # Short sleep to yield control
        st.rerun()

if __name__ == "__main__":
    init_session_state()
    main() 
