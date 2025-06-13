# Rogator Survey Automation - Batch Files Guide

## Available Batch Files

### 🎯 **run_survey_interactive.bat** (RECOMMENDED)
**Interactive menu for full control**
- Choose between Visual and Turbo mode
- Set custom concurrent instances for Turbo mode  
- User-friendly interface with validation
- Perfect for first-time users
st
### ⚡ **run_survey_turbo_quick.bat**
**Quick launch for power users**
- Runs 5 concurrent instances in Turbo mode
- No questions asked - fastest execution
- Perfect for repeated testing

### 👀 **run_survey_visual.bat**
**Visual mode only**
- Shows browser window with slowed actions
- Good for debugging or demonstrations
- Single instance only

### 📁 **run_survey_minimal.bat**
**Simple turbo mode**
- Single instance turbo mode
- Basic execution without options

## Mode Comparison

| Mode | Speed | Browser Visible | Concurrent | Best For |
|------|-------|----------------|------------|----------|
| **Visual** | Slow | ✅ Yes | ❌ No | Debugging, Demo |
| **Turbo** | Fast | ❌ No | ✅ Yes | Production, Testing |

## Concurrent Instances Guide

- **1-2 instances**: Safe for any system
- **3-5 instances**: Recommended for most systems
- **6-10 instances**: Fast systems with good internet
- **10+ instances**: High-end systems only

⚠️ **Warning**: Too many concurrent instances can:
- Overload your system (CPU/RAM)
- Get blocked by the survey server
- Cause unstable results

## Quick Start

1. **For beginners**: Run `run_survey_interactive.bat`
2. **For speed**: Run `run_survey_turbo_quick.bat`
3. **For debugging**: Run `run_survey_visual.bat`

All results are saved in the `logs/` directory. 
