# 🔧 Troubleshooting: "Expecting value: line 1 column 1 (char 0)"

## 🚨 What This Error Means

This error occurs when the official tester receives **non-JSON** or **empty response** from your endpoint.

Common causes:
1. Wrong URL (404 page instead of JSON)
2. Server error (500 HTML error page)
3. CORS blocking
4. Endpoint doesn't exist
5. Missing required parameters

---

## ✅ STEP-BY-STEP DIAGNOSIS

### **Step 1: Verify Deployment is Live**

Test the health check endpoint:
```bash
curl https://YOUR-APP.onrender.com/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-03T11:38:31Z",
  "message": "Scam Guard Agent API is running"
}
```

❌ **If you get HTML or error** → Server not deployed correctly
✅ **If you get JSON above** → Server is running!

---

### **Step 2: Test the API Test Endpoint**

```bash
curl https://YOUR-APP.onrender.com/api/test
```

**Expected Response:**
```json
{
  "success": true,
  "message": "API is working correctly",
  "endpoints": {
    "conversations": "/api/conversations",
    "messages": "/api/conversations/:id/messages",
    "state": "/api/conversations/:id/state"
  },
  "api_key_header": "not provided"
}
```

---

### **Step 3: Check if Conversation ID 1 Exists**

```bash
curl https://YOUR-APP.onrender.com/api/conversations
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "title": "Suspected IRS Scam",
    "status": "active",
    "scamScore": 10,
    "isAgentActive": false,
    ...
  }
]
```

❌ **If empty `[]`** → Database not seeded, need to create conversation
✅ **If has conversation with id: 1** → Ready to test!

---

### **Step 4: Test Message Endpoint Locally**

**Without Header (should fail or use trigger word):**
```bash
curl -X POST https://YOUR-APP.onrender.com/api/conversations/1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": 1,
    "sender": "scammer",
    "content": "Pay $5000 via bank transfer"
  }'
```

**With Header (should work):**
```bash
curl -X POST https://YOUR-APP.onrender.com/api/conversations/1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a" \
  -d '{
    "conversation_id": 1,
    "sender": "scammer",
    "content": "Pay $5000 via bank transfer"
  }'
```

**Expected:** Valid JSON response with message object

---

## 🎯 COMMON PROBLEMS & FIXES

### **Problem 1: Wrong URL in Tester**

❌ **Wrong:**
```
https://honeypot-agenticai.onrender.com
```

✅ **Correct:**
```
https://honeypot-agenticai.onrender.com/api/conversations/1/messages
```

**MUST include the full path!**

---

### **Problem 2: Conversation ID 1 Doesn't Exist**

**Fix:** Create it manually:
```bash
curl -X POST https://YOUR-APP.onrender.com/api/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Scam",
    "status": "active",
    "isAgentActive": true
  }'
```

---

### **Problem 3: Server Crashed/Not Running**

Check Render logs:
1. Go to Render dashboard
2. Click your service
3. Check "Logs" tab
4. Look for errors

**Common issues:**
- Build failed
- Port binding error
- Missing dependencies

---

### **Problem 4: CORS Blocking**

**Check if CORS is enabled in your code:**

Look for in `server/index.ts`:
```typescript
app.use(cors());
```

Should be present!

---

### **Problem 5: API Returns HTML Instead of JSON**

This happens when hitting a 404 or error page.

**Debug:**
```bash
curl -i https://YOUR-APP.onrender.com/api/conversations/1/messages
```

Check the `Content-Type` header:
- ✅ Should be: `application/json`
- ❌ If it's: `text/html` → Wrong endpoint or 404

---

## 🧪 EXACT TESTER VALUES

Based on your error, ensure you're entering:

### **Field 1: x-api-key**
```
SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a
```
*(No quotes, no spaces)*

### **Field 2: Honeypot API Endpoint URL**

**Format:**
```
https://[YOUR-APP-NAME].onrender.com/api/conversations/1/messages
```

**Example:**
```
https://honeypot-agenticai.onrender.com/api/conversations/1/messages
```

**⚠️ Make sure:**
- No trailing slash: ❌ `.../messages/`
- No extra paths: ❌ `.../messages/create`
- Exact path: ✅ `.../messages`

---

## 🔍 DEBUGGING CHECKLIST

Run these in order:

```bash
# 1. Health check
curl https://YOUR-APP.onrender.com/health

# 2. API test
curl https://YOUR-APP.onrender.com/api/test

# 3. List conversations
curl https://YOUR-APP.onrender.com/api/conversations

# 4. Test message with header
curl -X POST https://YOUR-APP.onrender.com/api/conversations/1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a" \
  -d '{"conversation_id": 1, "sender": "scammer", "content": "test"}'
```

**All should return valid JSON.**

---

## 🚀 QUICK FIX WORKFLOW

If the tester fails:

1. ✅ **Verify deployment:** `curl https://YOUR-APP.onrender.com/health`
2. ✅ **Check conversations exist:** `curl .../api/conversations`
3. ✅ **Test endpoint manually:** Use curl with header
4. ✅ **Copy exact URL** from successful curl to tester
5. ✅ **Verify API key** is exact match

---

## 📝 WORKING CURL EXAMPLE

This MUST work before using the tester:

```bash
curl -X POST https://YOUR-APP.onrender.com/api/conversations/1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a" \
  -d '{
    "conversation_id": 1,
    "sender": "scammer",
    "content": "Hello this is IRS pay $5000"
  }'
```

**If this returns JSON** → Tester should work
**If this returns HTML/error** → Fix server first

---

## 🆘 NEED HELP?

Share the output of:
```bash
curl -i https://YOUR-APP.onrender.com/api/conversations/1/messages
```

The `-i` flag shows headers which reveal the real issue.

---

**Most common fix: Use full URL path in tester (`/api/conversations/1/messages`)** ✅
