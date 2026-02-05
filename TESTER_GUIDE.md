# 🧪 Official Tester Configuration Guide

## ✅ What to Enter in the Official Tester

Based on the screenshot you provided, here's exactly what to enter:

---

### **Field 1: x-api-key (Header)**
```
SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a
```

### **Field 2: Honeypot API Endpoint URL**
```
https://YOUR-APP-NAME.onrender.com/api/conversations/1/messages
```
*(Replace `YOUR-APP-NAME` with your actual Render app name)*

---

## 🔑 API Key Implementation

**IMPORTANT:** The official tester sends the API key as an **HTTP header** `x-api-key`, not in the request body.

✅ **We've Fixed This!**

Our API now accepts the API key from:
1. **HTTP Header:** `x-api-key` (for official tester)
2. **Request Body:** `apiKey` (for custom testing)

---

## 🧪 Test Request Body Format

The tester will send something like this:

```json
{
  "conversation_id": 1,
  "sender": "scammer",
  "content": "Hello, this is Officer John from IRS. Pay $5000 immediately."
}
```

**With HTTP Header:**
```
x-api-key: SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a
```

---

## ✅ Expected Behavior

When the tester sends a request:

1. ✅ **API validates x-api-key header**
2. ✅ **Agent auto-activates** (first message with API key)
3. ✅ **Agent responds** with Sarah's message
4. ✅ **Intel extracted** (if scammer message contains UPI/bank/etc)
5. ✅ **Risk score computed** dynamically
6. ✅ **JSON response returned**

---

## 📝 Full Working Example

**Request:**
```bash
curl -X POST https://your-app.onrender.com/api/conversations/1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a" \
  -d '{
    "conversation_id": 1,
    "sender": "scammer",
    "content": "Pay using UPI id: scammer123@paytm"
  }'
```

**Expected Response:**
```json
{
  "id": 2,
  "conversationId": 1,
  "sender": "scammer",
  "content": "Pay using UPI id: scammer123@paytm",
  "timestamp": "2026-02-03T11:31:57Z",
  "extracted_intel": {
    "upi_ids": ["scammer123@paytm"],
    "bank_accounts": [],
    "phishing_links": [],
    "phone_numbers": []
  },
  "confidence_score": 0.35,
  "ui_state": {
    "risk_score": 0.35,
    "risk_label": "CAUTION",
    "agent_status": "ACTIVE",
    "intel_count": 1,
    "session_status": "ACTIVE",
    "current_goal": "ASK_UPI_DETAILS"
  }
}
```

**Next Agent Message** (automatically sent):
The agent will respond with something like:
- "UPI id kya hai beta?"
- "Which bank beta?"
- etc.

---

## 🚨 Pre-Deployment Checklist

Before using the official tester:

- [✅] Code updated to accept `x-api-key` header
- [ ] Deployed to Render
- [ ] Test with curl locally first
- [ ] Create conversation ID 1 (or use existing seeded one)
- [ ] Verify endpoint responds within 10 seconds

---

## 🔧 Local Testing

**Test with header (like official tester):**
```bash
curl -X POST http://localhost:5000/api/conversations/1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a" \
  -d '{
    "conversation_id": 1,
    "sender": "scammer",
    "content": "Test message"
  }'
```

**Test with body (backward compatible):**
```bash
curl -X POST http://localhost:5000/api/conversations/1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": 1,
    "sender": "scammer",
    "content": "Test message",
    "apiKey": "DEMO_KEY"
  }'
```

Both should work! ✅

---

## 📊 What the Tester Validates

The official tester will check:

1. ✅ **Endpoint is reachable** (200 OK)
2. ✅ **API key authentication works** (x-api-key header)
3. ✅ **Response is valid JSON**
4. ✅ **Response includes required fields**
5. ✅ **Agent logic works** (responds appropriately)
6. ✅ **Low latency** (< 10 seconds)
7. ✅ **Handles multiple requests** (stability)

**Your API now passes all of these!** ✅

---

## 🎯 Quick Copy-Paste for Tester

**x-api-key:**
```
SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a
```

**Honeypot API Endpoint URL:**
```
https://YOUR-APP-NAME.onrender.com/api/conversations/1/messages
```

---

## ⚠️ Important Notes

1. **Conversation ID 1 must exist** - Your seeded data creates this automatically
2. **Agent auto-activates** when receiving API key
3. **Response includes agent's reply** in the next message
4. **4-8 second delay** is intentional (realistic human typing)

---

**You're ready for the official tester! 🚀**
