# Deep Research Engine - Testing Guide

## 🚀 Quick Start

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Run the test script**:
   ```bash
   node test-deep-research.js
   ```

3. **Open browser**: http://localhost:18563

## 🧪 Testing Methods

### Method 1: Deep Research Toggle
1. Look for the **"Deep Research OFF"** button under the search box
2. Click to toggle it **ON** (should turn purple)
3. Enter any question: `"What are the benefits of meditation?"`
4. Submit - this will trigger comprehensive 4-phase research

### Method 2: Slash Commands
Type these commands directly in the search box:

- `/research What is blockchain technology?` - Comprehensive research
- `/research-quick Latest AI developments` - Quick foundation research  
- `/research-trends Future of renewable energy` - Trend analysis
- `/research-list` - Show your research history
- `/research-status [session-id]` - Check research progress

## 🔍 What to Look For

### Success Indicators:
- ✅ Purple "Deep Research ON" toggle works
- ✅ Slash commands trigger research (not regular search)
- ✅ Toast notifications appear ("Starting comprehensive research...")
- ✅ Chat shows research progress messages
- ✅ Real-time updates in the chat interface

### Error Indicators:
- ❌ Toggle doesn't change color/state
- ❌ Slash commands trigger regular search instead
- ❌ No toast notifications
- ❌ No research progress messages
- ❌ Console errors in browser dev tools

## 🛠️ Debugging Steps

### If Deep Research doesn't start:
1. **Check browser console** (F12 → Console)
2. **Check network tab** - look for `/api/deep-research/start` requests
3. **Check server logs** in terminal

### If no progress updates:
1. Streaming might not be working
2. Check if EventSource is supported
3. Look for SSE (Server-Sent Events) in network tab

### If commands don't work:
1. Make sure you're typing `/research` not `\research`
2. Check for typos in slash commands
3. Verify the query isn't empty after the command

## 📊 Expected Flow

### Deep Research Toggle (ON):
```
User types: "What is AI?"
→ Toast: "Starting comprehensive research..."
→ Chat: "🔬 Deep Research Started (Session: abc123)"
→ Real-time updates appear
→ Final results with comprehensive analysis
```

### Slash Commands:
```
User types: "/research What is AI?"
→ Toast: "Starting comprehensive research..."
→ Chat: "🔬 Deep Research Started" 
→ Progress updates
→ Results
```

## 🚨 Common Issues

### Issue: "Cannot connect to Deep Research Engine"
**Fix**: 
- Ensure `npm run dev` is running
- Check if port 18563 is available
- Verify all dependencies installed: `npm install`

### Issue: No toast notifications
**Fix**:
- Sonner should be imported and working
- Check browser console for JavaScript errors

### Issue: Research never completes
**Fix**:
- Check if Redis is running
- Check if external services (LiteLLM, Utils) are available
- May need to wait longer (research can take 2-5 minutes)

### Issue: SQLite database errors
**Fix**:
```bash
mkdir -p ./data
# Database will be created automatically
```

## 🎯 Test Scenarios

### Scenario 1: Basic Toggle Test
1. Toggle Deep Research ON
2. Search: "Benefits of exercise"
3. Verify research mode activates (not regular search)

### Scenario 2: Command Test
1. Type: `/research-quick History of pizza`
2. Verify quick research starts
3. Type: `/research-list` 
4. Verify session appears in list

### Scenario 3: Progress Tracking
1. Start long research: `/research Climate change impacts on agriculture`
2. While running, try: `/research-status [session-id]`
3. Verify progress updates

## 📈 Performance Notes

- **Foundation research**: ~30-60 seconds
- **Quick research**: ~20-40 seconds  
- **Comprehensive research**: 2-5 minutes
- **Memory usage**: Check with `/research-list` to see tier distribution

Ready to test! Start with the toggle method as it's the easiest to verify.