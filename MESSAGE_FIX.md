# ✅ MESSAGE SENDING FIX

## 🐛 Problem
Messages were not sending because the frontend wasn't including `conversation_id` in the request body.

## 🔧 Fix Applied
Updated `client/src/hooks/use-messages.ts` line 28-32:

```typescript
// BEFORE (Broken)
body: JSON.stringify({ content, sender }),

// AFTER (Fixed)
body: JSON.stringify({ 
  conversation_id: conversationId,  // Backend requires this
  content, 
  sender 
}),
```

## 📌 Why This Was Required
From `server/routes.ts` line 105-112:
```typescript
const { conversation_id, content, sender, apiKey } = req.body;

// Validate conversation_id
if (!conversation_id) {
  return res.status(400).json({
    error: "conversation_id is required"
  });
}
```

The backend validates that `conversation_id` must be present in the request body (Phase 2.1 requirement).

## ✅ Changes Made
1. ✅ Added `conversation_id` to message POST body
2. ✅ Added invalidation of conversation state query on message success

## 🧪 Test Now
1. **Refresh your browser** (Ctrl+R or F5) on both windows
2. Send a message from scammer view
3. **Expected**: Message should appear and agent should respond

---

**The fix is live!** The server has automatically reloaded the changes via HMR.
