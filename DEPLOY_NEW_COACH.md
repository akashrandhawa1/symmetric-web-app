# Deploy New Coach System

## The Issue

You're still seeing the old coaching messages like:
```
Hey Akash, you just crushed a workout! Your body's buzzing and ready to go.
Let's keep that momentum with a strength session...
```

This is because the **old Gemini prompt is still deployed** on Netlify.

## What I Updated

I've updated the system prompt in:
- `netlify/functions/home-coach.ts` (lines 69-118)
- `src/coach/mockGemini.ts` (mock fallback responses)

The new prompt uses:
✅ Warm, human tone ("Your readiness is at..." instead of "Readiness 82—")
✅ Clear explanations ("which means you're fresh and ready to build strength")
✅ No em dashes, jargon, or technical language
✅ Specific actions with context

## How to Fix

You need to **redeploy to Netlify** to get the new prompt:

### Option 1: Git Deploy (Recommended)
```bash
# Commit the changes
git add netlify/functions/home-coach.ts src/coach/mockGemini.ts
git commit -m "Update coach system with new warm, human tone"
git push

# Netlify will auto-deploy if connected to your repo
```

### Option 2: Manual Deploy
```bash
# Build locally
npm run build

# Deploy via Netlify CLI
netlify deploy --prod --dir=dist
```

### Option 3: Netlify Dashboard
1. Go to your Netlify site dashboard
2. Click "Deploys" tab
3. Click "Trigger deploy" → "Deploy site"
4. Wait for build to complete

## Verify It's Working

After deploying, check your home screen. You should see messages like:

**High Readiness:**
```
Your readiness is at 85, which means you're fresh and ready to build strength.
This is a great time to add a focused block before you drift toward 50.
```

**Mid Readiness:**
```
Your readiness is at 67, which is solid for training. You can add a clean
strength block now and wrap up as you approach 50.
```

**Low Readiness:**
```
Your readiness is at 42, which means your body needs rest right now. Sleep
and nutrition will set you up for a strong session tomorrow.
```

## If You Still See Old Messages

1. **Clear your browser cache** (the old Gemini response might be cached)
2. **Check Netlify deploy logs** to ensure the function deployed
3. **Verify environment variables** are set (GEMINI_API_KEY)
4. **Check the function logs** in Netlify dashboard for any errors

## Files Changed

- `netlify/functions/home-coach.ts` - New system prompt
- `src/coach/mockGemini.ts` - Updated mock responses to match new tone
- `netlify/functions/coach-text.ts` - NEW endpoint for post-workout feedback (ready to use)
- `src/utils/getCoachText.ts` - NEW utility function
- `src/components/CoachNote.tsx` - NEW component for rendering coach text

The home-coach endpoint will start using the new prompt as soon as you deploy!
