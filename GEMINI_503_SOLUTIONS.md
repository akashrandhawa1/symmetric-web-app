# Fixing Gemini 503 "Model Overloaded" Errors

## What Causes This Error?

The `503: The model is overloaded` error happens when Google's Gemini API servers are handling too many requests. This is common with:
- Free tier API usage
- `gemini-2.5-flash-lite` model (popular/overloaded)
- Peak usage times

## Solutions Implemented

### ✅ Solution 1: Automatic Retry with Exponential Backoff (IMPLEMENTED)

**What it does:**
- Automatically retries failed requests 3 times
- Waits 1.5s → 3s → 6s between retries
- Only retries on 503/429 errors (overload/rate limit)
- Fails fast on other errors

**Code Location:** `src/coach/useHomeCoach.ts`

**How it works:**
```typescript
// Retries up to 3 times with increasing delays
await retryWithBackoff(() => generateCoachSuggestion(request), 3, 1500);
```

**Benefits:**
- ✅ Automatic recovery from temporary overloads
- ✅ No user intervention needed
- ✅ Still falls back to mock coach if all retries fail

### ✅ Solution 2: Cooldown Period (IMPLEMENTED)

**What it does:**
- After a 503 error, waits 60 seconds before trying again
- Immediately shows fallback coach during cooldown
- Prevents hammering the API when it's down

**Code Location:** `src/coach/useHomeCoach.ts` (lines 166-173, 183-189)

**Benefits:**
- ✅ Reduces unnecessary API calls
- ✅ Better user experience (instant fallback)
- ✅ Helps Gemini API recover

## Additional Solutions (Not Yet Implemented)

### Option 3: Use a Different Model

**Change model to one with more capacity:**

```typescript
// In src/services.ts, find GEMINI_MODELS and change:
const GEMINI_MODELS = {
    primary: 'gemini-1.5-flash',  // More stable than 2.5-flash-lite
    fallback: 'gemini-1.5-pro'
};
```

**Trade-offs:**
- ✅ More stable, fewer 503 errors
- ❌ Slightly slower responses
- ❌ May use more quota

### Option 4: Increase maxOutputTokens

The current limit is low (may cause issues):

```typescript
// In src/services.ts around line 2061
maxOutputTokens: 2000,  // Increase from 1000
```

**Benefits:**
- ✅ Allows longer, more detailed responses
- ❌ Uses more quota per request

### Option 5: Add Request Debouncing

Prevent rapid consecutive requests:

```typescript
// Add delay between requests
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds
let lastRequestTime = 0;

const rateLimitedRequest = async () => {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise(r => setTimeout(r, MIN_REQUEST_INTERVAL - elapsed));
  }
  lastRequestTime = Date.now();
  return actualRequest();
};
```

## Current Behavior

With the implemented solutions:

1. **First attempt** → Gemini API call
2. **503 error** → Wait 1.5s, retry
3. **Still 503** → Wait 3s, retry
4. **Still 503** → Wait 6s, retry
5. **All retries fail** → Show fallback coach + 60s cooldown
6. **During cooldown** → Immediately show fallback coach
7. **After cooldown** → Try Gemini again

## Monitoring

Watch console logs for:
- `[useHomeCoach] Gemini overloaded (attempt X/3), retrying in Xms...` - Retry happening
- `[useHomeCoach] Direct Gemini call overloaded (503) after retries` - All retries failed
- `[useHomeCoach] Gemini is recovering. Showing fallback for now.` - Cooldown active

## Testing

To test the retry logic:
1. Load the app during peak hours
2. Watch console for retry messages
3. Should see 3 retry attempts before fallback
4. Fallback coach should appear immediately after final retry

## Recommendations

1. **Keep current implementation** - Retry + cooldown works well
2. **If still seeing frequent 503s**, try Option 3 (change model)
3. **Monitor your API quota** at https://aistudio.google.com/app/apikey
4. **Consider upgrading to paid tier** for production use
