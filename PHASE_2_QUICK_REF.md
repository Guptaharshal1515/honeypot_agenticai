# Phase 2 Quick Reference - Implementation Guide

## 🎯 At a Glance

**ALL PHASE 2.3-2.8 FEATURES ARE IMPLEMENTED**

---

## 🔄 Session State Flow

```
USER SENDS MESSAGE
        ↓
┌───────────────────────────┐
│   1. Get/Create Session   │
│   (routes.ts:81)          │
└───────────────────────────┘
        ↓
┌───────────────────────────┐
│   2. Extract Intel        │
│   → Sync to Session       │
│   (routes.ts:104-122)     │  
└───────────────────────────┘
        ↓
┌───────────────────────────┐
│   3. Pass Session to      │
│      Agent                │
│   (routes.ts:165)         │
└───────────────────────────┘
        ↓
┌───────────────────────────┐
│   4. Agent Reads:         │
│   - has_initiated         │
│   - current_goal          │
│   - last_reply            │
│   - extracted_intel       │
│   (agent.ts:296-302)      │
└───────────────────────────┘
        ↓
┌───────────────────────────┐
│   5. Determine Next Goal  │
│   Based on Session State  │
│   (agent.ts:302)          │
└───────────────────────────┘
        ↓
┌───────────────────────────┐
│   6. Build LLM Prompt     │
│   with Session Context    │
│   (agent.ts:305)          │
└───────────────────────────┘
        ↓
┌───────────────────────────┐
│   7. Call LLM             │
│   (agent.ts:320)          │
└───────────────────────────┘
        ↓
┌───────────────────────────┐
│   8. Check Repetition     │
│   vs session.last_reply   │
│   (agent.ts:330-348)      │
└───────────────────────────┘
        ↓
┌───────────────────────────┐
│   9. Return Response +    │
│      Session Updates      │
│   (agent.ts:361-368)      │
└───────────────────────────┘
        ↓
┌───────────────────────────┐
│  10. Update Session:      │
│   - has_initiated = true  │
│   - current_goal = X      │
│   - last_reply = "..."    │
│   (routes.ts:179-191)     │
└───────────────────────────┘
        ↓
┌───────────────────────────┐
│  11. Check Exit?          │
│   If yes: mark inactive   │
│   (routes.ts:184-188)     │
└───────────────────────────┘
```

---

## 📊 Session Data Structure

```typescript
{
  conversation_id: "1",
  created_at: 1738528920000,
  last_active: 1738528930000,
  is_active: true,  // false when EXIT_SAFELY
  
  agent_state: {
    has_initiated: true,  // false on first call
    current_goal: "ASK_UPI_DETAILS",
    last_reply: "Beta, what is your UPI ID?"
  },
  
  extracted_intel: {
    upi_ids: ["scammer@paytm"],
    bank_accounts: [],
    phishing_links: [],
    phone_numbers: ["+911234567890"]
  }
}
```

---

## 🎯 Goal Transition Logic

| Current Goal | Next Goal (based on intel) |
|--------------|---------------------------|
| `null` (fresh) | `INITIATE_CONTACT` |
| `INITIATE_CONTACT` | `ENGAGE_AND_STALL` |
| `ENGAGE_AND_STALL` (2+ msgs) | `ASK_PAYMENT_CONTEXT` |
| `ASK_PAYMENT_CONTEXT` | No UPI? → `ASK_UPI_DETAILS`<br>No Bank? → `ASK_BANK_DETAILS`<br>No Link? → `ASK_PHISHING_LINK`<br>All? → `EXIT_SAFELY` |
| `ASK_UPI_DETAILS` | No Bank? → `ASK_BANK_DETAILS`<br>No Link? → `ASK_PHISHING_LINK`<br>All? → `EXIT_SAFELY` |
| `ASK_BANK_DETAILS` | No Link? → `ASK_PHISHING_LINK`<br>All? → `EXIT_SAFELY` |
| `ASK_PHISHING_LINK` | `EXIT_SAFELY` |
| Any (15+ messages) | `EXIT_SAFELY` |

---

## 🔍 Key Functions

### `analyzeSessionIntelligence(session)` (agent.ts:70-77)
- **Purpose**: Check what intel is already collected
- **Input**: Session object
- **Output**: `{ hasUPI, hasBank, hasPhishingLink, hasPhoneNumber }`
- **Phase**: 2.6 (Extraction-Aware)

### `determineNextGoal(session, intelligence, length)` (agent.ts:85-136)
- **Purpose**: Decide agent's next action
- **Input**: Session, intelligence gaps, conversation length
- **Output**: AgentGoal enum
- **Phase**: 2.5 (Goal-Based State Machine)

### `buildSystemPrompt(goal, intelligence, session)` (agent.ts:143-252)
- **Purpose**: Create LLM prompt with session context
- **Input**: Current goal, intelligence gaps, session
- **Output**: Complete system prompt string
- **Phase**: 2.3 (Session-Aware Prompting)

### `isTooSimilar(newMessage, lastMessage)` (agent.ts:258-274)
- **Purpose**: Detect repetitive responses
- **Input**: New reply, last reply from session
- **Output**: Boolean (>80% similarity triggers regeneration)
- **Phase**: 2.7 (Anti-Repetition)

---

## 🛠️ Testing Commands

### Check Session State
```typescript
// In browser console after starting conversation:
fetch('/api/conversations/1/messages', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    conversation_id: "1",
    content: "Send UPI to scammer@paytm",
    sender: "scammer"
  })
});

// Check console logs for:
// 📊 [Session Intel] Added UPI: scammer@paytm
// 🤖 [Session: 1] Goal: ASK_BANK_DETAILS | Initiated: true
```

### Trigger Anti-Repetition
```typescript
// Send same scammer message twice
// Agent should detect repetition and regenerate
// Console: ⚠️ Repetition detected, regenerating via LLM...
```

### Verify Safe Exit
```typescript
// Send 16+ messages OR provide all intel types
// Console: 🛑 Session 1 marked inactive (EXIT_SAFELY)
```

---

## ✅ Phase 2 Completion Checklist

- [x] **2.3** Session passed to agent - `generateAgentResponse(history, conversation, session)`
- [x] **2.4** Agent initiation control - `has_initiated` flag
- [x] **2.5** Goal-based state machine - 7 distinct goals
- [x] **2.6** Extraction-aware questioning - checks `session.extracted_intel`
- [x] **2.7** Anti-repetition guard - compares to `session.last_reply`
- [x] **2.8** Safe exit handling - marks `is_active = false`

---

## 🚀 Benefits Over Phase 1

| Feature | Phase 1 | Phase 2 |
|---------|---------|---------|
| State Management | ❌ Stateless | ✅ Session-based |
| Repetition | ❌ Possible | ✅ Prevented |
| Initiation | ❌ User-driven | ✅ Agent-driven |
| Intel Tracking | ❌ Re-parse history | ✅ Session store |
| Exit Logic | ❌ None | ✅ Clean termination |
| Goal Awareness | ❌ Random | ✅ Structured path |

---

## 📞 Support & Debugging

### Common Issues

**Issue**: Agent repeating same message  
**Fix**: Check `session.agent_state.last_reply` is being updated (routes.ts:182)

**Issue**: Agent not speaking first  
**Fix**: Verify `has_initiated = false` on handoff (agent.ts:90)

**Issue**: Agent asking for same intel twice  
**Fix**: Ensure intel sync is working (routes.ts:104-122)

**Issue**: Session never exits  
**Fix**: Check exit conditions (agent.ts:98, routes.ts:185)

---

## 📝 Code Comments Legend

Throughout the codebase, you'll see:

```typescript
// PHASE 2.3: ...  → Session-aware feature
// PHASE 2.4: ...  → Initiation control
// PHASE 2.5: ...  → Goal state machine
// PHASE 2.6: ...  → Extraction awareness
// PHASE 2.7: ...  → Anti-repetition
// PHASE 2.8: ...  → Safe exit
```

These mark all Phase 2 implementations for easy tracking.

---

**Generated**: February 3, 2026  
**Agent**: Antigravity  
**Status**: ✅ COMPLETE & READY FOR DEMO
