# 🎯 OFFICIAL HONEYPOT API - GUVI Hackathon Submission Guide

## ⚠️ CRITICAL ISSUE FOUND

Your API endpoint **does not match** the format expected by the official tester!

### Problem Identified

1. **Wrong Endpoint**: The official tester is sending requests to `/api/conversations/1/messages`
2. **Wrong Request Format**: The tester is sending the Problem Statement 2 format:
   ```json
   {
     "sessionId": "1fc994e9-f4c5-47ee-8806-90aeb969928f",
     "message": {
       "sender": "scammer",
       "text": "Your bank account will be blocked today...",
       "timestamp": 1769776085000
     },
     "conversationHistory": [],
     "metadata": {...}
   }
   ```

3. **Wrong Response Format**: Your current endpoint returns complex objects, but the tester expects:
   ```json
   {
     "status": "success",
     "reply": "Why is my account being suspended?"
   }
   ```

## ✅ SOLUTION IMPLEMENTED

We've created a **NEW COMPLIANT ENDPOINT** that implements the exact specification:

### New Endpoint
```
POST /api/honeypot/message
```

### Headers Required
```
Content-Type: application/json
x-api-key: SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a
```

### Request Body (Exact Problem Statement Format)
```json
{
  "sessionId": "unique-session-id",
  "message": {
    "sender": "scammer",
    "text": "Your bank account will be blocked today. Verify immediately.",
    "timestamp": 1769776085000
  },
  "conversationHistory": [],
  "metadata": {
    "channel": "SMS",
    "language": "English",
    "locale": "IN"
  }
}
```

### Response (Exact Problem Statement Format)
```json
{
  "status": "success",
  "reply": "Why is my account being suspended?"
}
```

## 🔧 CONFIGURATION REQUIRED

### 1. Set Your Gemini API Key

Edit `.env` file and add your key:
```env
GEMINI_API_KEY=your-actual-gemini-api-key-here
```

Get your free key from: https://aistudio.google.com/apikey

**Note**: The system will work without the API key using rule-based responses, but Gemini provides more realistic, dynamic agent behavior.

### 2. Test Locally First

```powershell
# Start the server
npm run dev

# In another terminal, test the endpoint
curl -X POST http://localhost:5000/api/honeypot/message `
  -H "Content-Type: application/json" `
  -H "x-api-key: SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a" `
  -d '{
    "sessionId": "test-session-1",
    "message": {
      "sender": "scammer",
      "text": "Your bank account will be blocked today. Verify immediately.",
      "timestamp": 1769776085000
    },
    "conversationHistory": [],
    "metadata": {
      "channel": "SMS",
      "language": "English",
      "locale": "IN"
    }
  }'
```

Expected response:
```json
{
  "status": "success",
  "reply": "Why is my account being suspended?"
}
```

## 🚀 DEPLOYMENT TO RENDER

### Step 1: Commit and Push Changes

```powershell
git add .
git commit -m "Add official GUVI honeypot API endpoint"
git push origin main
```

### Step 2: Update Environment Variable on Render

1. Go to your Render dashboard
2. Select your service: `honeypot-agentical`
3. Go to **Environment** tab
4. Add new variable:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: (your actual Gemini API key)
5. Click **Save Changes**

### Step 3: Trigger Redeploy

Render will automatically redeploy after you push. Alternatively:
- Click **Manual Deploy** → **Deploy latest commit**

### Step 4: Wait for Deployment

Monitor the logs for:
```
==> Build successful 🎉
==> Deploying...
==> Your service is live 🎉
```

## 🧪 TEST DEPLOYED API

After deployment, test the live endpoint:

```powershell
curl -X POST https://honeypot-agentical.onrender.com/api/honeypot/message `
  -H "Content-Type: application/json" `
  -H "x-api-key: SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a" `
  -d '{
    "sessionId": "test-live-1",
    "message": {
      "sender": "scammer",
      "text": "Your bank account will be blocked today. Verify immediately.",
      "timestamp": 1769776085000
    },
    "conversationHistory": [],
    "metadata": {
      "channel": "SMS",
      "language": "English",
      "locale": "IN"
    }
  }'
```

## 📝 UPDATE YOUR SUBMISSION

**IMPORTANT**: The official tester URL needs to be updated!

### Current (WRONG) Submission
```
URL: https://honeypot-agentical.onrender.com/api/conversations/1/messages
```

### Correct Submission
```
URL: https://honeypot-agentical.onrender.com/api/honeypot/message
API Key: SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a
```

## 🎯 WHAT THE SYSTEM DOES

### 1. Scam Detection
- Detects scam intent from keywords like "account blocked", "verify immediately", etc.
- Marks session as scam if detected

### 2. Intelligence Extraction
- **UPI IDs**: Extracts patterns like `username@bank`
- **Bank Accounts**: Extracts 9-18 digit numbers with banking context
- **URLs**: Detects phishing links
- **Phone Numbers**: Extracts contact information
- **Keywords**: Tracks suspicious phrases

### 3. Agentic Engagement
- **With Gemini**: Generates dynamic, context-aware responses
- **Without Gemini**: Uses rule-based responses
- Maintains conversation state across multiple turns
- Adapts strategy based on intelligence collected

### 4. Final Report to GUVI
When enough intelligence is collected (3+ items OR 10+ messages), the system automatically sends the final report to:
```
POST https://hackathon.guvi.in/api/updateHoneyPotFinalResult
```

Payload includes:
- All extracted intelligence
- Total messages exchanged
- Scam detection status
- Agent notes

## ⚠️ IMPORTANT NOTES

1. **Session Management**: Each `sessionId` maintains independent conversation state
2. **API Key Validation**: The endpoint validates the official API key
3. **Error Handling**: Returns proper error responses with status code
4. **Logging**: All requests/responses are logged for debugging
5. **GUVI Callback**: Automatically triggered when sufficient intelligence collected

## 🐛 TROUBLESHOOTING

### If you get "Expecting value: line 1 column 1"
- The endpoint is returning empty/non-JSON response
- Check server logs for errors
- Verify environment variables are set
- Test health endpoint: `GET https://honeypot-agentical.onrender.com/health`

### If agent responses are repetitive
- Add your Gemini API key to enable dynamic responses
- Check that `GEMINI_API_KEY` is set in Render environment

### If GUVI callback fails
- Check server logs for callback errors
- Verify the GUVI endpoint is accessible
- Intelligence collection may be below threshold

## 📚 NEXT STEPS

1. ✅ Set `GEMINI_API_KEY` in `.env`
2. ✅ Test locally with curl command above
3. ✅ Commit and push changes
4. ✅ Add `GEMINI_API_KEY` to Render environment
5. ✅ Wait for deployment
6. ✅ Test deployed endpoint
7. ✅ **UPDATE YOUR SUBMISSION URL** to `/api/honeypot/message`
8. ✅ Re-submit to official tester

## 🎉 SUCCESS CRITERIA

You'll know it's working when:
- Local test returns `{"status": "success", "reply": "..."}`
- Deployed test returns same format
- Official tester shows **HTTP 200** instead of error
- Logs show intelligence extraction
- GUVI receives final callback after conversation

---

**Team RAKSHAK - Good luck with your submission! 🚀**
