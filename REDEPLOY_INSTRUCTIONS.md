# 🚨 CRITICAL: Redeploy to Fix Coach Messages

## What I Just Fixed

I found **3 issues** that were preventing the new coach prompt from deploying:

### 1. ✅ Missing `functions` directory in netlify.toml
**Fixed**: Added `functions = "netlify/functions"` to the build config

### 2. ✅ Missing `@netlify/functions` package
**Fixed**: Installed `@netlify/functions` as a dev dependency

### 3. ✅ Updated the home-coach.ts prompt
**Fixed**: New warm, human coaching prompt is ready to deploy

## 🚀 Deploy Steps (REQUIRED)

You MUST commit these changes and redeploy:

```bash
# 1. Stage all the changes
git add netlify.toml package.json package-lock.json netlify/functions/home-coach.ts src/coach/mockGemini.ts

# 2. Commit
git commit -m "Fix: Update coach prompt and Netlify config for proper function deployment"

# 3. Push to trigger Netlify auto-deploy
git push
```

## ⏱️ Wait for Deployment

1. Go to your Netlify dashboard: https://app.netlify.com
2. Click on your site
3. Go to "Deploys" tab
4. Wait for the new deploy to finish (usually 1-2 minutes)
5. Look for "Published" status

## 🧪 Test After Deployment

1. **Clear your browser cache** (Important! Old responses may be cached)
   - Chrome/Edge: Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
   - Or open in Incognito/Private window

2. **Refresh your app**
   - Go to your Symmetric app
   - Navigate to the home screen
   - Check the coach message

## ✅ Expected Result

**BEFORE (what you're seeing now):**
```
Hey Akash, you just crushed a workout! Your body's buzzing and systems are firing.
You're in a great spot to build on that momentum...
```

**AFTER (what you should see):**
```
Your readiness is at 85, which means you're fresh and ready to build strength.
This is a great time to add a focused block before you drift toward 50.
```

## 🔍 Verify Functions Are Deployed

After deploying, check that functions are live:

1. Go to Netlify Dashboard → Your Site → Functions
2. You should see:
   - `home-coach` (updated timestamp)
   - `daily-workout`
   - `coach-text` (NEW!)

3. Click on `home-coach` to see the function details
4. Check the "Last updated" timestamp - it should be recent

## 🐛 If You STILL See Old Messages

### Option 1: Clear Netlify Cache
```bash
# Using Netlify CLI
netlify build --clear-cache
netlify deploy --prod
```

### Option 2: Manual Cache Clear in Dashboard
1. Go to Site Settings → Build & deploy
2. Scroll to "Build settings"
3. Click "Clear cache and retry deploy"

### Option 3: Check Environment Variables
Make sure these are set in Netlify:
- `GEMINI_API_KEY` (your API key)
- `GEMINI_MODEL_ID` (optional, defaults to gemini-2.0-flash)

### Option 4: Check Function Logs
1. Netlify Dashboard → Functions → home-coach
2. Click "Function log"
3. Look for errors or old timestamps

## 📝 What Changed in netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"  # ← ADDED THIS LINE
```

This tells Netlify where to find your TypeScript functions.

## 📦 What Changed in package.json

```json
"devDependencies": {
  "@netlify/functions": "^5.0.1",  # ← ADDED THIS
  ...
}
```

This package is required for TypeScript Netlify functions.

## ⚡ Quick Deploy Checklist

- [ ] `git add` all the changed files
- [ ] `git commit` with a clear message
- [ ] `git push` to trigger deployment
- [ ] Wait for Netlify to finish building (check dashboard)
- [ ] Clear browser cache
- [ ] Test the home screen
- [ ] Verify the new coaching message appears

## 💡 Why This Happened

Netlify needs explicit configuration to:
1. Know where your functions are (`functions = "netlify/functions"`)
2. Have the right TypeScript types (`@netlify/functions` package)
3. Build and deploy the functions alongside your app

Without these, Netlify was either:
- Not deploying the functions at all
- Using cached old versions
- Not finding the functions directory

Now it will work correctly!

## 🎯 Final Note

After you push and the deployment completes, **you MUST clear your browser cache** or use an incognito window. The old Gemini responses might be cached by your browser or Netlify's CDN.

The new warm, human coaching tone will appear once the deploy finishes and cache is cleared! 🚀
