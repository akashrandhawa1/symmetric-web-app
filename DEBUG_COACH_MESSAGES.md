# 🔍 Debug Coach Messages - Step by Step

## The Issue

You're still seeing old messages like:
```
Hey Akash, you just crushed your workout! Your body's buzzing and primed for more.
```

This means either:
1. The new code isn't deployed yet
2. Responses are being cached
3. The wrong code path is being used

## 🧪 Step 1: Deploy the Latest Code

```bash
# Make sure you have the latest changes
git add src/coach/useHomeCoach.ts
git commit -m "Add debug logging to coach prompts"
git push

# Wait for Netlify to deploy
```

## 🔍 Step 2: Check Console Logs (CRITICAL)

After deploying, do this:

1. **Open your app in Incognito/Private window** (to avoid cache)
2. **Press F12** to open DevTools
3. **Go to Console tab**
4. **Refresh the page**
5. **Look for these logs:**

```
[generateCoachSuggestion] Sending prompt to Gemini: You are a warm, encouraging personal trainer who speaks like a human.
...
[generateCoachSuggestion] Raw Gemini response: {"type":"suggestion","mode":"TRAIN","message":"Your readiness is at..."}
```

### ✅ If you see "warm, encouraging personal trainer"
- **Good!** The new prompt is being sent
- The problem is Gemini's response is being cached somewhere

### ❌ If you DON'T see these logs at all
- The code isn't being called
- OR you're using the Netlify function instead (check for network requests to `/api/gemini/home-coach`)

## 🔍 Step 3: Check Network Tab

1. In DevTools, click **Network** tab
2. Refresh the page
3. Filter for "home-coach"
4. Look for a request to `/api/gemini/home-coach`

### If you see the request:
1. Click on it
2. Go to **Response** tab
3. Check what JSON is being returned
4. Is it using the old prompt or new prompt?

### If you DON'T see the request:
- The app is using the client-side direct call (which we just updated)
- Check Console logs instead

## 🧹 Step 4: Hard Clear Everything

Try this nuclear option:

1. **Close all browser tabs** for your app
2. **Clear browsing data:**
   - Chrome: `chrome://settings/clearBrowserData`
   - Select "Cached images and files"
   - Select "All time"
   - Click "Clear data"
3. **Restart browser completely**
4. **Open in Incognito** first to test

## 🔧 Step 5: Verify the Build

Check if the new prompt is in your dist folder:

```bash
# This should return text
grep "warm, encouraging personal trainer" dist/assets/*.js

# If it returns nothing, the build is old
```

## 🚨 Step 6: Force Netlify Cache Clear

If nothing else works:

### Option A: Netlify Dashboard
1. Go to **Site settings** → **Build & deploy**
2. Scroll to "Build image selection"
3. Click **Clear cache and deploy site**

### Option B: Netlify CLI
```bash
netlify build --clear-cache
netlify deploy --prod
```

## 🎯 What Success Looks Like

### In Console:
```
[generateCoachSuggestion] Sending prompt to Gemini: You are a warm, encouraging personal trainer...
[generateCoachSuggestion] Raw Gemini response: {"type":"suggestion","mode":"TRAIN","message":"Your readiness is at 85, which means you're fresh and ready to build strength. This is a great time to add a focused block before you drift toward 50.","cta":"Start strength training","secondary":"Aim for 3-6 reps per set with 90-120s rest, and stop when power starts to fade."}
```

### On Screen:
```
Your readiness is at 85, which means you're fresh and ready to build strength.
This is a great time to add a focused block before you drift toward 50.
```

## 📋 Checklist

- [ ] Deployed latest code to Netlify
- [ ] Waited for deploy to complete (check Netlify dashboard)
- [ ] Opened app in Incognito window
- [ ] Opened DevTools Console (F12)
- [ ] Refreshed the page
- [ ] Checked console for `[generateCoachSuggestion]` logs
- [ ] Verified the prompt starts with "You are a warm, encouraging personal trainer"
- [ ] Checked Network tab for `/api/gemini/home-coach` requests
- [ ] Cleared browser cache completely
- [ ] Restarted browser

## 💡 Most Likely Causes

1. **Old build deployed** - Verify `dist/` has the new code
2. **Browser cache** - Use Incognito to bypass
3. **Netlify CDN cache** - Clear cache in Netlify dashboard
4. **Service worker cache** - Check if your app has a service worker caching responses

## 📞 What to Share

If it still doesn't work, share:
1. Screenshot of Console logs
2. Screenshot of Network tab showing the request/response
3. The exact text you're seeing
4. Netlify deploy log (last 50 lines)

This will help me identify exactly where the old prompt is coming from!
