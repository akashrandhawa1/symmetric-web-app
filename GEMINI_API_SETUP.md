# Gemini API Setup for Local Development

To enable **intelligent Coach Milo questions** during `npm run dev`, you need to add your Gemini API key.

---

## Quick Setup (2 minutes)

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Get API key"** or **"Create API key"**
3. Copy your API key (starts with `AIza...`)

---

### 2. Add the Key to Your Project

**Option A: Environment Variable (Recommended)**

Create a `.env.local` file in the project root:

```bash
# .env.local
VITE_GEMINI_API_KEY=AIzaSy...your-key-here
```

**Option B: Browser LocalStorage (Quick Test)**

Open your browser console (`F12`) and run:
```javascript
localStorage.setItem('GEMINI_API_KEY', 'AIzaSy...your-key-here');
```

Then refresh the page.

---

### 3. Verify It Works

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Open the app and start Coach Milo onboarding

3. Check the browser console - you should see:
   ```
   [intake] Trying direct Gemini API...
   [intake] ✓ Direct Gemini succeeded: ask|What should I call you?
   ```

---

## How It Works

The new implementation uses a **fallback chain**:

```
1. Direct Gemini API (browser)
   ├─ ✅ Works on npm run dev
   ├─ ✅ Works on netlify dev
   └─ ✅ Works in production

2. Netlify Functions
   ├─ ✅ Works on netlify dev
   └─ ✅ Works in production

3. Hard-coded fallback
   └─ ⚠️ Less intelligent (no context awareness)
```

**Priority:** Direct API → Functions → Fallback

---

## Benefits of Using Gemini

### With Gemini API ✨
```
Milo: What should I call you?
You: Alex
Milo: What's your main focus—strength, muscle, general fitness, or rehab?
You: I want to get stronger
Milo: Got it—are you chasing lower-body strength specifically?  ← Contextual!
You: yes
Milo: Perfect. What gear do you have—barbell, dumbbells, machines, or bodyweight?
```

### Without Gemini API 😐
```
Milo: What should I call you?
You: Alex
Milo: What's the focus—strength, muscle, general fitness, or rehab?
You: I want to get stronger
Milo: What's the focus—strength, muscle, general fitness, or rehab?  ← Repeats!
You: strength
Milo: What equipment do you have today—barbell+rack, dumbbells, machines, or bodyweight only?
```

---

## Troubleshooting

### "No API key found"
- Check your `.env.local` file exists and has the right key
- Restart your dev server (`npm run dev`)
- Try the LocalStorage option as a quick test

### "Gemini error 400"
- Your API key may be invalid
- Copy a fresh key from [AI Studio](https://aistudio.google.com/app/apikey)

### "Gemini error 429"
- You've hit the free tier rate limit
- Wait a few minutes or upgrade to a paid plan

### Still seeing hard-coded fallback
- Open browser console and check which method is being tried
- Verify the API key is being resolved: `resolveGeminiApiKey()` in console

---

## Security Note

**Your API key is safe:**
- ✅ `.env.local` is in `.gitignore` (won't be committed)
- ✅ LocalStorage is only on your machine
- ✅ Gemini API calls are made directly from your browser (no server exposure)

**For production:**
- Use Netlify environment variables (not exposed to browser)
- Functions make server-side calls with the key

---

## Cost

Gemini API free tier includes:
- **15 requests/minute**
- **1,500 requests/day**
- **1 million tokens/month**

Each onboarding conversation uses ~5-7 requests.

**Cost:** $0 for typical development usage 🎉

---

**Status:** You're now set up to get intelligent Coach Milo questions during `npm run dev`!
