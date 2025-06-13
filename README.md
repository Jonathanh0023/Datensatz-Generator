# 🤖  Survey Automation - Web App

A user-friendly Streamlit web application for automating  surveys with real-time monitoring and results visualization.

## 🌟 Features

### 📊 **Interactive Dashboard**
- **Real-time Progress Monitoring** - Watch surveys run live with color-coded logs
- **Configuration Management** - Easy-to-use forms for all survey settings
- **Results Visualization** - Charts and metrics for survey performance
- **Historical Data** - Browse and analyze previous survey runs

### ⚙️ **Configuration Options**
- **Survey URL** - Set the  survey link
- **Test Runs** - Configure number of survey completions (1-100)
- **Language Selection** - Choose between German and English
- **Screener Mode** - Define predefined answers for specific questions
- **Execution Modes** - Normal, Visual, Turbo, or Concurrent execution

### 🚀 **Execution Modes**
- **Normal Mode** - Standard headless execution
- **Visual Mode** - See the browser in action (great for debugging)
- **Turbo Mode** - Fast execution with optimizations
- **Concurrent Mode** - Run multiple browser instances simultaneously (2-10 instances)

### 📈 **Analytics & Reporting**
- **Success Rate Gauge** - Visual success rate indicator
- **Question Type Distribution** - Pie chart of encountered question types
- **Error Tracking** - Recent errors with detailed information
- **CSV Export** - Download results for further analysis

## 🚀 Quick Start

### 1. **Install Dependencies**
```bash
pip install -r requirements_streamlit.txt
```

### 2. **Run the Web App**
**Option A: Use the batch file (Windows)**
```bash
run_streamlit_app.bat
```

**Option B: Run directly**
```bash
streamlit run streamlit_app.py
```

### 3. **Access the Web App**
Open your browser and go to: `http://localhost:8501`

## 📋 How to Use

### **Step 1: Configure Survey Settings**
1. **Enter Survey URL** - Paste your  survey link in the sidebar
2. **Set Number of Runs** - Choose how many completions you want (1-100)
3. **Select Language** - Choose German or English
4. **Save Configuration** - Click "💾 Save Configuration"

### **Step 2: Set Up Screener (Optional)**
1. **Enable Screener Mode** - Check the checkbox if you want predefined answers
2. **Add Questions** - Click "➕ Add Question" to add predefined answers
3. **Configure Answers** - Enter question text and corresponding answer text
4. **Example Screener Questions:**
   - Question: "Geschlecht" → Answer: "Weiblich"
   - Question: "Alter" → Answer: "45"
   - Question: "Branche" → Answer: "Andere Branchen"

### **Step 3: Choose Execution Mode**
- **Normal** - Standard execution, good for most cases
- **Visual** - See the browser (useful for debugging, slower)
- **Turbo** - Fast execution with optimizations
- **Concurrent** - Multiple browsers (2-10 instances for speed)

### **Step 4: Run Survey**
1. **Click "▶️ Start Survey"** - Survey will begin automatically
2. **Monitor Progress** - Watch real-time logs in the main panel
3. **View Status** - Green indicator shows survey is running
4. **Stop if Needed** - Click "⏹️ Stop Survey" to halt execution

### **Step 5: Analyze Results**
1. **Select Log File** - Choose from recent survey runs
2. **View Metrics** - See success rates, total runs, failures
3. **Check Charts** - Analyze question types and success rates
4. **Review Errors** - Check any issues that occurred
5. **Download Data** - Export results as CSV for further analysis

## 🎯 Screener Configuration Examples

### **Basic Demographics**
```
Question: "Geschlecht" → Answer: "Weiblich"
Question: "Alter" → Answer: "45"
Question: "Bundesland" → Answer: "Baden-Württemberg"
```

### **Industry & Usage**
```
Question: "Branche" → Answer: "Andere Branchen"
Question: "Nutzung" → Answer: "Ja, nutze ich"
Question: "Häufigkeit" → Answer: "Regelmäßig"
```

## 📊 Understanding the Dashboard

### **Live Logs Panel**
- **🟢 Green Messages** - Successful operations
- **🔴 Red Messages** - Errors and failures
- **🟡 Yellow Messages** - Warnings
- **🔵 Blue Messages** - General information

### **Results Dashboard**
- **Success Rate Gauge** - Shows percentage of successful completions
- **Question Types Chart** - Distribution of question types encountered
- **Recent Errors** - Last 5 errors with details
- **Metrics Cards** - Total runs, successful, and failed counts

## 🔧 Advanced Features

### **Concurrent Execution**
- Run 2-10 browser instances simultaneously
- Significantly faster for large test runs
- Automatically distributes surveys across instances
- Real-time progress from all instances

### **Visual Mode Debugging**
- See exactly what the automation is doing
- Useful for troubleshooting survey issues
- Slower execution but great for understanding behavior
- Browser windows stay visible

### **Turbo Mode Optimization**
- Blocks images, fonts, and stylesheets for speed
- Reduced delays between actions
- Optimized for maximum throughput
- Best for large-scale testing

## 📁 File Structure

```
_Datensatz_Creator/
├── streamlit_app.py              # Main Streamlit application
├── requirements_streamlit.txt    # Python dependencies
├── run_streamlit_app.bat        # Windows batch file to run app
├── config.json                  # Survey configuration
├── src/
│   └── _direct_minimal.js # Core automation script
└── logs/                        # Survey result logs
    └── *.json                   # Individual log files
```

## 🐛 Troubleshooting

### **Common Issues**

**1. "Python not found"**
- Install Python from https://python.org
- Make sure Python is added to your PATH

**2. "Streamlit not installed"**
- Run: `pip install -r requirements_streamlit.txt`
- Or manually: `pip install streamlit pandas plotly`

**3. "Survey not starting"**
- Check that Node.js is installed
- Verify the survey URL is correct
- Ensure config.json is properly formatted

**4. "Browser not opening"**
- Manually go to http://localhost:8501
- Check if port 8501 is available
- Try a different port: `streamlit run streamlit_app.py --server.port 8502`

### **Performance Tips**

**For Speed:**
- Use Turbo mode for fastest execution
- Use Concurrent mode with 3-5 instances
- Disable Visual mode for production runs

**For Debugging:**
- Use Visual mode to see what's happening
- Check live logs for detailed information
- Review error messages in the dashboard

**For Reliability:**
- Start with smaller test runs (5-10)
- Use screener mode for consistent results
- Monitor success rates and adjust as needed

## 🔄 Updates & Maintenance

The web app automatically:
- Saves configuration changes
- Loads the latest survey results
- Updates live logs in real-time
- Preserves session state during use

## 📞 Support

If you encounter issues:
1. Check the live logs for error messages
2. Review the troubleshooting section above
3. Try running in Visual mode to see what's happening
4. Check that all dependencies are properly installed

---

**Happy Survey Automation! 🚀** 
