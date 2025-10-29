# 🧪 Local Testing Guide - Verify Coach Messages

## ✅ Dev Server is Running

Your dev server is now running at: **http://localhost:3001/**

## 🔍 How to Test the New Coach Messages

### Step 1: Open the App
1. Open your browser
2. Go to: **http://localhost:3001/**
3. Navigate to the **Home Screen**

### Step 2: Open DevTools Console
1. Press **F12** (or Cmd+Option+I on Mac)
2. Click on the **Console** tab
3. Keep it open while testing

### Step 3: Watch for Debug Logs

You should see logs like this in the console:

```
[generateCoachSuggestion] Sending prompt to Gemini: You are a warm, encouraging personal trainer who speaks like a human.

Return JSON only:
{ "type": "suggestion", "mode": "TRAIN" | "ACTIVE_RECOVERY" | "FULL_REST", "message": string, "cta": string, "secondary": string | null }

Tone & length:
- Friendly, natural, no slang.
```

### Step 4: Check the Coach Message

On the home screen, you should see a message like:

**✅ NEW STYLE (What you SHOULD see):**
```
Your readiness is at 85, which means you're fresh and ready to build strength.
This is a great time to add a focused block before you drift toward 50.
```

**❌ OLD STYLE (What you should NOT see):**
```
Hey Akash, you just crushed your workout! Your body's buzzing and primed for more.
Let's keep that energy going with a strength session...
```

### Step 5: Check the Raw Gemini Response

Look in the console for:
```
[generateCoachSuggestion] Raw Gemini response: {"type":"suggestion","mode":"TRAIN","message":"Your readiness is at...","cta":"Start strength training","secondary":"Aim for 3-6 reps..."}
```

## 🎯 What to Look For

### ✅ Success Indicators:
- [ ] Console shows: "You are a warm, encouraging personal trainer"
- [ ] Console shows the full new prompt (no old prompt text)
- [ ] Raw response includes: "Your readiness is at [number], which means..."
- [ ] UI shows the new coaching message style
- [ ] No "Hey Akash" or "body's buzzing" text

### ❌ Failure Indicators:
- [ ] Console shows: "Symmetric's strength coach" (old prompt)
- [ ] UI shows: "Hey Akash, you just crushed your workout"
- [ ] Message includes: "body's buzzing" or "primed for more"

## 🔧 Important Notes

### Environment Variables
The dev server script shows:
```
[embed-env] GEMINI key present: true
[embed-env] coach proxy flag: 0
```

This means:
- ✅ Your Gemini API key is loaded
- ℹ️ Coach proxy is disabled (will use direct Gemini client call)
- ✅ The app will call Gemini directly with our NEW prompt

### Which Code Path is Used

With `coach proxy flag: 0`, the app will:
1. **Skip** the Netlify function (`/api/gemini/home-coach`)
2. **Use** the client-side `generateCoachSuggestion` function
3. **This is the function we just updated!**

So you should see the new prompt working locally.

## 📝 Testing Checklist

1. **Open** http://localhost:3001/
2. **Open DevTools** Console (F12)
3. **Navigate** to Home Screen
4. **Check console** for prompt logs
5. **Verify** "warm, encouraging personal trainer" appears
6. **Check UI** for new message style
7. **Confirm** no "Hey Akash" or "body's buzzing"

## 🐛 If You See Old Messages Locally

### Possible Causes:
1. **Hot reload didn't pick up changes**
   - Stop the dev server (Ctrl+C)
   - Run `npm run dev` again

2. **Browser cache**
   - Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
   - Or use Incognito window

3. **Code didn't update**
   - Check: `grep "warm, encouraging" src/coach/useHomeCoach.ts`
   - Should return the new prompt text

## ✅ If It Works Locally

If you see the NEW coaching messages locally, then:
1. ✅ The client-side code is correct
2. ✅ The prompt is working with Gemini
3. ✅ Safe to deploy to Netlify

Then proceed with:
```bash
git add -A
git commit -m "Fix: Update coaching prompts to warm, human tone"
git push
```

## ❌ If It Still Shows Old Messages

Stop and let me know! We'll need to debug further before deploying.

## 🛑 When Done Testing

To stop the dev server:
1. Go back to the terminal
2. Press **Ctrl+C**

Or I can stop it for you.
