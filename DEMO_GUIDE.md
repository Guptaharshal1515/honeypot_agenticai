# 🚀 Quick Start Guide - National AI Summit Demo

## ⚡ 5-Minute Setup

### 1. Prerequisites
```bash
✅ Node.js (v18+)
✅ npm or yarn
✅ Gemini API Key
```

### 2. Environment Setup
Create `.env` file:
```bash
GEMINI_API_KEY=your_api_key_here
PORT=5000
```

### 3. Install & Run
```bash
npm install
npm run dev
```

---

## 🎯 Quick Demo Script

### Demo 1: Agent Initiation (30 seconds)

**Action**: Create conversation and activate agent  
**Expected**: Agent speaks first automatically

```bash
curl -X POST http://localhost:5000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Scam"}'

# Note the conversation ID (e.g., 1)

# Activate agent
curl -X POST http://localhost:5000/api/conversations/1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "1",
    "content": "trigger",
    "sender": "scammer",
    "apiKey": "DEMO_KEY"
  }'
```

**Look for**: Agent auto-generates first message like "Hello? Who is this?..."

---

### Demo 2: Intelligence Extraction (1 minute)

**Action**: Send scammer message with intel

```bash
curl -X POST http://localhost:5000/api/conversations/1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "1",
    "content": "Send refund to raj123@paytm or account 12345678901",
    "sender": "scammer"
  }'
```

**Expected Response**:
```json
{
  "extracted_intel": {
    "upi_ids": ["raj123@paytm"],
    "bank_accounts": ["12345678901"],
    ...
  },
  "confidence_score": 0.7
}
```

**Look for**: 
- ✅ UPI extracted
- ✅ Bank account extracted
- ✅ Confidence score calculated

---

### Demo 3: Goal Progression (2 minutes)

**Action**: Send multiple messages and watch goals evolve

```bash
# Check console logs for:
🤖 [Session: 1] Goal: INITIATE_CONTACT | Initiated: false
🤖 [Session: 1] Goal: ENGAGE_AND_STALL | Initiated: true
🤖 [Session: 1] Goal: ASK_PAYMENT_CONTEXT | ...
🤖 [Session: 1] Goal: ASK_UPI_DETAILS | ...
🤖 [Session: 1] Goal: EXIT_SAFELY | ...
```

**Look for**: Logical progression through all 7 goals

---

### Demo 4: Anti-Repetition (30 seconds)

**Action**: If LLM tries to repeat, watch regeneration

**Console Output**:
```
⚠️ Repetition detected (compared to session.last_reply), regenerating via LLM...
✅ Regenerated via LLM: "Sorry beta, the screen is frozen..."
```

**Look for**: Genuinely different responses (not just appended text)

---

## 📊 Live Monitoring

### Console Logs to Watch

```bash
# Session creation
📦 Active session: 1 | has_initiated: false

# Intel extraction
📊 [Session Intel] Added UPI: raj123@paytm
📊 [Session Intel] Added Bank: 12345678901

# Goal progression
🤖 [Session: 1] Goal: ASK_UPI_DETAILS | Initiated: true | Intel: {...}

# Session exit
🛑 Session 1 marked inactive (EXIT_SAFELY)
```

---

## 🎤 Judge Presentation Script

### Opening (30 sec)
"Our Scam-Guard Agent demonstrates true agentic behavior through 3 key innovations:"

### Innovation 1: Agent-Initiated Conversations (1 min)
"Unlike typical chatbots, our agent speaks first when handed off, establishing control of the conversation immediately."

**Demo**: Show agent auto-initiation

### Innovation 2: Goal-Driven Intelligence (1 min)
"The agent uses a 7-state machine to systematically extract evidence: UPI IDs, bank accounts, and phishing links."

**Demo**: Show goal progression in console

### Innovation 3: 100% LLM-Driven (1 min)
"Zero hardcoded responses. Every reply is generated dynamically by Gemini based on current goal and extracted intel."

**Demo**: Show varied responses for same goal

### Technical Excellence (30 sec)
"Deterministic regex-based extraction ensures no hallucinations - critical for law enforcement evidence."

**Demo**: Show structured JSON output

### Closing (30 sec)
"Our system is evaluation-ready with structured JSON output, confidence scoring, and complete session management."

---

## ⚠️ Common Issues & Fixes

### Issue: Agent not responding
**Fix**: Check `GEMINI_API_KEY` in `.env`

### Issue: No extraction happening
**Fix**: Ensure sender is `"scammer"` (not `"agent"`)

### Issue: Agent repeating
**Fix**: Check console for regeneration logs (this is expected and handled)

### Issue: Session not exiting
**Fix**: Send 15+ messages OR provide all intel types (UPI + Bank + Link)

---

## 📈 Success Indicators

During demo, judges should see:

✅ Agent speaks first (no user prompt needed)  
✅ Console shows goal transitions  
✅ JSON response includes `extracted_intel`  
✅ Confidence score increases with more intel  
✅ No identical responses (anti-repetition working)  
✅ Clean session exit after intel collection

---

## 🏆 Key Talking Points

1. **"100% Agentic"**: Agent makes decisions, not just reacts
2. **"Law Enforcement Ready"**: Deterministic extraction, no hallucinations
3. **"Evaluation Compatible"**: Structured JSON, confidence scoring
4. **"Production Quality"**: Session management, error handling, type safety

---

## 📞 Emergency Backup Demo

If live demo fails:

1. **Show console logs** from previous successful run
2. **Show code**: `agent.ts` goal-driven logic
3. **Show extraction**: `scam_detection.ts` regex patterns
4. **Show docs**: SUMMIT_READY.md capabilities table

---

## ⏱️ Time Allocation (5 min presentation)

- Intro: 30s
- Live Demo: 2min 30s
- Code Walkthrough: 1min
- Q&A Prep: 1min

**Good luck at the National AI Summit! 🚀**
