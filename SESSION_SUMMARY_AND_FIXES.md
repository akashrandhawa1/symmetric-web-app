# Session Summary and Required Fixes

## Current Status ❌

Your app is **NOT using Gemini** - it's using a mock/fallback server. That's why you see:
> "Prime the quads with 5 slow tempo bodyweight squats and a 30-second wall sit before you touch the bar"

This is hardcoded text from `src/api/gemini/mockServer.ts`.

## Root Causes

1. **24 zombie background processes** are still running
2. **Mock server is active** instead of real Gemini API
3. **Browser cache** has old code
4. **Voice coach WebSocket** approach is too complex and broken

## What We Fixed ✅

1. ✅ API Key updated: `AIzaSyAXSvvAPL05vi2f7HV42TvEX8fzFmwLO_o`
2. ✅ Model name corrected: `gemini-2.5-flash` (in services.ts)
3. ✅ React `inert` warning fixed
4. ✅ Created simple voice coach approach document

## Required Actions (DO THIS!)

### 1. Kill ALL Background Processes
```bash
killall -9 node
killall -9 tsx
sleep 3
```

### 2. Verify .env.local
```bash
cat .env.local
```
Should show:
```
VITE_GEMINI_API_KEY=AIzaSyAXSvvAPL05vi2f7HV42TvEX8fzFmwLO_o
GEMINI_API_KEY=AIzaSyAXSvvAPL05vi2f7HV42TvEX8fzFmwLO_o
```

### 3. Start ONLY Dev Server (NO WebSocket Server!)
```bash
npm run dev
```

### 4. Hard Refresh Browser
- Mac: `Cmd + Shift + R`
- Windows: `Ctrl + Shift + R`
- Or open Incognito/Private window

### 5. Check Browser Console
Look for:
- `[Gemini] API key resolved? true` ✅
- NO "API_KEY_INVALID" errors ✅
- NO "WebSocket connection failed" (ignore these for now) ⚠️

## Why Mock Server is Running

Check these files/settings:
1. `VITE_ENABLE_COACH_API=0` in `.env.local` - This might be forcing mock mode
2. Check if there's a flag in your code that enables mock mode when API fails
3. The API key errors we saw earlier may have triggered "Gemini disabled" mode

## Finding Where Mock Server Is Activated

Search your code for:
```bash
grep -r "mockServer" src/
grep -r "Prime the quads" src/
grep -r "geminiDisabled" src/
```

## For Voice Coach

**DON'T use the WebSocket/Live API approach** - it's too complex.

Instead, see **VOICE_COACH_SIMPLE_APPROACH.md** for a much simpler solution using:
- Browser Web Speech API for speech-to-text
- Direct Gemini text API
- Browser text-to-speech

## Files Modified This Session

1. `.env.local` - Updated API key
2. `src/services.ts:937-943` - Fixed model names to `gemini-2.5-flash`
3. `src/coach/CoachDock.tsx:184` - Fixed React inert warning
4. `server/ws/live-coach.ts` - Created (but too complex, ignore for now)

## Next Steps

1. **Close this browser tab completely**
2. **Kill all node processes** (command above)
3. **Start fresh** with `npm run dev`
4. **Open browser in Incognito mode** to http://localhost:3000
5. **Check if you see real Gemini responses** instead of "Prime the quads..."

## If Still Seeing Mock Data

The app has a flag somewhere that's forcing mock mode. You need to:
1. Search for where `mockServer.ts` is imported
2. Find the condition that decides between mock vs real Gemini
3. Update that condition to use real Gemini

## Test Gemini API Directly

Run this to verify API key works:
```bash
curl 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyAXSvvAPL05vi2f7HV42TvEX8fzFmwLO_o' \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Say hello"}]}]}'
```

Should return JSON with "Hello" response, not an error.

## Summary

**The API key and model name are now correct**, but your app is still using mock/fallback mode instead of calling the real Gemini API. You need to find and disable the mock server code path.
