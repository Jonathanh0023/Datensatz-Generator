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
    page_title="Rogator Umfrage-Automatisierung",
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
    st.title("🤖 Rogator Umfrage-Automatisierung")
    st.markdown("---")
    
    # Load current config
    config_data = load_config()
    
    # Sidebar for configuration
    with st.sidebar:
        st.header("⚙️ Konfiguration")
        
        # Survey URL
        survey_url = st.text_input(
            "Umfrage-URL",
            value=config_data.get('surveyUrl', ''),
            help="Die Rogator Umfrage-URL, die du automatisieren möchtest"
        )
        
        # Number of test runs
        num_runs = st.number_input(
            "Anzahl der Testläufe",
            min_value=1,
            max_value=100,
            value=config_data.get('numTestRuns', 5),
            help="Wie viele Umfragen abgeschlossen werden sollen"
        )
        
        # Language preference
        language = st.selectbox(
            "Bevorzugte Sprache",
            options=["deutsch", "english"],
            index=0 if config_data.get('preferredLanguage', 'deutsch') == 'deutsch' else 1
        )
        
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
            "Visuell": "Visual",
            "Turbo": "Turbo",
            "Gleichzeitig": "Concurrent"
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
    
    # Main content area
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.header("🎮 Umfragesteuerung")
        
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
                        if execution_mode == "Visual":
                            mode_args.append("--visual")
                        elif execution_mode == "Turbo":
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
        
        # Live logs
        st.subheader("📋 Live-Logs")
        
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

        with log_placeholder.container():
            if st.session_state.survey_running:
                st.info("🟢 Umfrage läuft... die Logs siehst du unten.")
            else:
                st.info("🔵 Umfrage ist gestoppt.")
            
            # Display logs from session state
            if st.session_state.survey_logs:
                log_messages = [f"[{log['timestamp']}] {log['message']}" for log in st.session_state.survey_logs]
                log_text = "\n".join(reversed(log_messages))
                st.text_area("Logs", value=log_text, height=400, key="log_area", disabled=True)
            else:
                st.info("Noch keine Logs vorhanden. Starte eine Umfrage, um Live-Updates zu sehen.")
        
        # Auto-refresh when survey is running
        if st.session_state.survey_running:
            time.sleep(1) # Short sleep to yield control
            st.rerun()
    
    with col2:
        st.header("📊 Ergebnis-Dashboard")
        
        # Log file selector
        log_files = get_log_files()
        if log_files:
            selected_log = st.selectbox(
                "Log-Datei auswählen",
                options=log_files,
                format_func=lambda x: f"{x.name} ({datetime.fromtimestamp(x.stat().st_mtime).strftime('%Y-%m-%d %H:%M')})"
            )
            
            if selected_log:
                log_data = load_log_file(selected_log)
                
                if log_data:
                    # Convert to DataFrame
                    df = pd.DataFrame(log_data)
                    
                    # Summary metrics
                    total_runs = df['run_id'].nunique() if 'run_id' in df.columns else 0
                    successful_runs = len(df[df['success'] == True]) if 'success' in df.columns else 0
                    failed_runs = len(df[df['success'] == False]) if 'success' in df.columns else 0
                    
                    # Display metrics
                    metric_col1, metric_col2, metric_col3 = st.columns(3)
                    with metric_col1:
                        st.metric("Testläufe Gesamt", total_runs)
                    with metric_col2:
                        st.metric("Erfolgreich", successful_runs)
                    with metric_col3:
                        st.metric("Fehlgeschlagen", failed_runs)
                    
                    # Success rate chart
                    if total_runs > 0:
                        success_rate = (successful_runs / (successful_runs + failed_runs)) * 100 if (successful_runs + failed_runs) > 0 else 0
                        
                        fig = go.Figure(go.Indicator(
                            mode = "gauge+number+delta",
                            value = success_rate,
                            domain = {'x': [0, 1], 'y': [0, 1]},
                            title = {'text': "Erfolgsrate (%)"},
                            delta = {'reference': 80},
                            gauge = {
                                'axis': {'range': [None, 100]},
                                'bar': {'color': "darkblue"},
                                'steps': [
                                    {'range': [0, 50], 'color': "lightgray"},
                                    {'range': [50, 80], 'color': "gray"}
                                ],
                                'threshold': {
                                    'line': {'color': "red", 'width': 4},
                                    'thickness': 0.75,
                                    'value': 90
                                }
                            }
                        ))
                        fig.update_layout(height=300)
                        st.plotly_chart(fig, use_container_width=True)
                    
                    # Question type distribution
                    if 'type' in df.columns:
                        type_counts = df['type'].value_counts()
                        fig_pie = px.pie(
                            values=type_counts.values,
                            names=type_counts.index,
                            title="Verteilung der Fragetypen"
                        )
                        fig_pie.update_layout(height=400)
                        st.plotly_chart(fig_pie, use_container_width=True)
                    
                    # Recent errors
                    if 'error' in df.columns:
                        errors = df[df['error'].notna() & (df['error'] != '')]
                        if not errors.empty:
                            st.subheader("🚨 Letzte Fehler")
                            for _, error_row in errors.tail(5).iterrows():
                                st.error(f"Lauf {error_row.get('run_id', 'N/A')}, Seite {error_row.get('page', 'N/A')}: {error_row['error']}")
                    
                    # Download results
                    if st.button("📥 Ergebnisse als CSV herunterladen"):
                        csv = df.to_csv(index=False)
                        st.download_button(
                            label="CSV herunterladen",
                            data=csv,
                            file_name=f"survey_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                            mime="text/csv"
                        )
        else:
            st.info("Keine Log-Dateien gefunden. Führe eine Umfrage durch, um Ergebnisse zu erzeugen.")

if __name__ == "__main__":
    init_session_state()
    main() 
