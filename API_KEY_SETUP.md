# 🔑 GEMINI API KEY SETUP

## 🎯 Quick Fix (2 minutes)

### Step 1: Get a FREE Gemini API Key

1. **Go to Google AI Studio:**
   ```
   https://aistudio.google.com/app/apikey
   ```

2. **Click "Create API Key"**
   - Select "Create API key in new project" (or use existing project)
   - Copy the key (starts with `AIza...`)

### Step 2: Add the API Key to .env

1. **Open the `.env` file** in your project root:
   ```
   c:\Users\DELL\OneDrive\Documents\Scam-Guard-Agent\.env
   ```

2. **Replace `your_api_key_here` with your actual key:**
   ```
   GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

3. **Save the file**

### Step 3: Restart the Server

1. **Stop the current server** (press `Ctrl+C` in the terminal where npm run dev is running)

2. **Start it again:**
   ```powershell
   npm run dev
   ```

---

## ✅ Expected Result

After restarting with a valid API key:

1. Send a message from scammer view
2. **Agent will respond** using Gemini AI
3. No more "[AGENT ERROR]" messages

---

## 📌 Important Notes

- **Free Tier**: 60 requests per minute
- **Quota**: Check usage at https://aistudio.google.com/app/apikey
- **Security**: Never commit `.env` to Git (already in .gitignore)

---

## 🐛 Troubleshooting

### "API key expired" still appears
- Double-check you copied the FULL key (starts with `AIza`)
- Make sure there are no extra spaces
- Restart the server completely

### "API key not found"
- Verify the `.env` file is in the project root
- Check the file is named exactly `.env` (not `.env.txt`)

---

**Next**: Get your API key and restart the server! 🚀
