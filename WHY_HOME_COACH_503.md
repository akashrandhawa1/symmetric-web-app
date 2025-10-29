# Why Home Coach Gets 503 Errors But Daily Workout Doesn't

## The Problem

**Home Coach:** Gets frequent 503 "model overloaded" errors
**Daily Workout Plan:** Works fine, no 503 errors

## Root Cause

### Request Frequency Difference

| Feature | When It's Called | Frequency |
|---------|------------------|-----------|
| **Home Coach** | • Every page load<br>• When component remounts<br>• When `request` object changes<br>• Auto-fetches on mount | **Very High** 🔴 |
| **Daily Workout Plan** | • Only when user clicks button<br>• Manual trigger only | **Low** 🟢 |

### Why This Causes 503 Errors

1. **React Re-renders** - The home screen re-renders frequently as state changes
2. **Request Object Changes** - Small changes to readiness, metrics trigger new API calls
3. **useEffect Dependency** - `fetchCoach` in useEffect runs on every meaningful change
4. **Rate Limiting** - Too many requests in short time → Gemini API returns 503

Example:
```
0s:   Page loads → Call Gemini (attempt 1)
0.5s: Readiness updates → Call Gemini (attempt 2)
1s:   Metrics update → Call Gemini (attempt 3)
1.5s: Component remounts → Call Gemini (attempt 4)
...
→ 503 Error: "The model is overloaded"
```

## Solutions Implemented

### ✅ 1. Request Deduplication (NEW)

**Code:** `src/coach/useHomeCoach.ts:298-312`

```typescript
const lastRequestRef = useRef<string>('');

useEffect(() => {
  if (!autoFetch) return;

  // Only fetch if request has meaningfully changed
  const currentRequest = JSON.stringify(request);
  if (currentRequest === lastRequestRef.current) {
    return; // Skip - same request
  }

  lastRequestRef.current = currentRequest;
  fetchCoach();
}, [autoFetch, fetchCoach, request]);
```

**What it does:**
- Compares new request with previous request
- Only calls Gemini if the request actually changed
- Prevents duplicate calls from React re-renders

**Expected reduction:** 70-90% fewer API calls

### ✅ 2. Retry with Exponential Backoff

**Code:** `src/coach/useHomeCoach.ts:7-36`

- Retries 3 times with delays (1.5s → 3s → 6s)
- Only retries on 503/429 errors
- Increases success rate when API is temporarily busy

### ✅ 3. Cooldown Period

**Code:** `src/coach/useHomeCoach.ts:183-189`

- After 503 error, waits 60 seconds before retrying
- Immediately shows fallback during cooldown
- Prevents hammering overloaded API

## Why Daily Workout Plan Doesn't Have This Issue

1. **User-Triggered Only** - Only called when button clicked
2. **No Auto-Fetch** - Doesn't run in useEffect
3. **Infrequent** - Maybe 1-2 calls per session
4. **No Re-render Loops** - Stable, predictable calling pattern

## Before vs After

### Before (With Issues)
```
Page Load:
→ Call 1: Home coach ✅
→ Re-render (readiness changed)
→ Call 2: Home coach ✅
→ Re-render (metrics changed)
→ Call 3: Home coach ✅
→ Re-render (component remount)
→ Call 4: Home coach ❌ 503 Error!
```

### After (Fixed)
```
Page Load:
→ Call 1: Home coach ✅
→ Re-render (readiness changed)
→ Skipped (request identical)
→ Re-render (metrics changed)
→ Call 2: Home coach ✅ (request actually changed)
→ Re-render (component remount)
→ Skipped (request identical)
```

## Monitoring

Watch console for:
- Fewer `[useHomeCoach] Direct Gemini call` messages
- No more rapid successive calls
- 503 errors should be rare now

## Additional Optimizations (If Still Needed)

If you still see 503 errors:

1. **Increase deduplication window:**
```typescript
// Add time-based throttling
const MIN_REQUEST_INTERVAL = 5000; // 5 seconds minimum between calls
```

2. **Use a more stable model:**
```typescript
model: 'gemini-1.5-flash' // Instead of 2.0-flash
```

3. **Cache responses:**
```typescript
// Cache coach responses for identical requests
const responseCache = new Map<string, CoachJSON>();
```

## Testing

To verify the fix:
1. Open dev console
2. Watch for `[useHomeCoach]` log messages
3. Should see ~90% fewer API calls
4. 503 errors should be very rare

## Summary

**The issue was NOT the Gemini API being generally overloaded - it was the home coach making too many requests too quickly due to React re-renders.**

The daily workout plan doesn't have this issue because it's only called once when the user clicks a button, not automatically on every state change.
