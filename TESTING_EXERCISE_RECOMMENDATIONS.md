# Testing Exercise Recommendation System

Quick guide to test the Gemini-powered exercise recommendation engine.

## Quick Start

### Option 1: Demo Screen (Recommended)

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Open demo page:**
   Navigate to: `http://localhost:5173/exercise-recommendation-demo.html`

3. **Test scenarios:**
   - Click any test scenario card on the left
   - Watch Gemini analyze EMG data in real-time
   - Review recommendation card on the right
   - Check confidence scores, load adjustments, alternatives

### Option 2: Integration Testing

Test in the main app workflow:

```bash
npm run dev
# Navigate to main app
# Complete a set to trigger recommendation
```

## Test Scenarios

### 1. Strong Performance - Continue
**EMG Data:**
- Peak RMS: 85% MVC
- Rate of Rise: 420ms
- Symmetry: 94%
- RMS Drop: 12%

**Context:**
- Readiness: 78
- Exercise: Back Squat
- Weight: 100kg
- Sets: 2

**Expected:** Should recommend continuing with same or increased weight

---

### 2. Moderate - Need More Load
**EMG Data:**
- Peak RMS: 68% MVC
- Rate of Rise: 380ms
- Symmetry: 91%

**Context:**
- Readiness: 72
- Exercise: Back Squat
- Weight: 90kg
- Sets: 1

**Expected:** Should suggest load increase (activation too low)

---

### 3. Fatigued - Switch to Accessory
**EMG Data:**
- Peak RMS: 72% MVC
- Rate of Rise: 520ms (slow)
- Symmetry: 86%
- RMS Drop: 32% (high fatigue)

**Context:**
- Readiness: 48 (low)
- Exercise: Front Squat
- Weight: 85kg
- Sets: 4

**Expected:** Switch to lower-fatigue accessory work (leg extension, wall sit)

---

### 4. Asymmetry Detected
**EMG Data:**
- Peak RMS: 76% MVC
- Rate of Rise: 450ms
- Symmetry: 78% (poor)

**Context:**
- Readiness: 68
- Exercise: Back Squat
- Weight: 95kg
- Sets: 2

**Expected:** Recommend unilateral work (split squat, step-up)

---

### 5. Fresh & Strong - Push Harder
**EMG Data:**
- Peak RMS: 88% MVC
- Rate of Rise: 390ms (fast)
- Symmetry: 95%
- RMS Drop: 5% (minimal fatigue)

**Context:**
- Readiness: 85 (high)
- Exercise: Leg Press
- Weight: 180kg
- Sets: 1

**Expected:** Encourage load increase or continue aggressive progression

---

### 6. User Prefers Split Squats
**EMG Data:**
- Peak RMS: 74% MVC
- Rate of Rise: 440ms
- Symmetry: 89%

**Context:**
- Readiness: 70
- Exercise: Back Squat
- Sets: 3
- Historical Labels:
  - Split Squat: "felt_strongest"
  - Leg Press: "effective"
  - Back Squat: "moderate"

**Expected:** Should favor split squat based on user preference

---

## What to Check

### ✅ Recommendation Quality
- [ ] Exercise choice makes sense given context
- [ ] Rationale is clear and data-driven
- [ ] Load adjustment logic is sound
- [ ] Alternatives are contextually appropriate

### ✅ Prescription Details
- [ ] Sets/reps are in strength range (3-6 reps target)
- [ ] Tempo follows eccentric-pause-concentric-pause format
- [ ] Rest periods match intensity (180s for main, 90s for accessory)
- [ ] Notes provide actionable execution cues

### ✅ Safety Features
- [ ] Fatigue guardrails are specific and measurable
- [ ] Retest timing is reasonable (300s typical)
- [ ] Load adjustments are conservative when fatigued
- [ ] Alternatives include lower-risk options

### ✅ User Experience
- [ ] Loading state shows skeleton
- [ ] Error state displays fallback message
- [ ] "Local Mode" badge appears when fallback active
- [ ] Confidence score color-codes appropriately
- [ ] Card animations are smooth

### ✅ Fallback System
- [ ] Works offline (no Gemini API)
- [ ] Provides reasonable recommendations
- [ ] Confidence score is 0.6 (lower than AI)
- [ ] Uses rule-based logic correctly

## Manual API Testing

Test the service directly:

```typescript
import { fetchExerciseRecommendation } from './src/services/exerciseRecommendation';

const emgData = {
  peakRmsPctMvc: 82,
  rateOfRiseMs: 450,
  symmetryPct: 92,
};

const userContext = {
  readinessScore: 75,
  currentExercise: 'back_squat',
  setsCompleted: 3,
};

const abortController = new AbortController();

const rec = await fetchExerciseRecommendation(
  emgData,
  userContext,
  { signal: abortController.signal }
);

console.log('Recommendation:', rec);
```

## Debugging

### Check Gemini API Response

Open browser DevTools → Network tab:

1. Filter for `generateContent` requests
2. Check request payload (EMG data + context)
3. Review response JSON
4. Verify schema matches `ExerciseRecommendation` type

### Console Logs

The service logs all recommendations:

```
[Symmetric][ExerciseRecommendation] {
  input: { emgData, userContext },
  output: { next_exercise, prescription, ... }
}
```

### Fallback Testing

Force fallback by:
1. Disabling network (DevTools → Network → Offline)
2. Invalid API key
3. Timeout (abort signal after 100ms)

Verify fallback logic activates and recommendation is still provided.

## Edge Cases

Test these scenarios:

### Missing Optional Fields
```typescript
const minimalData = {
  emgData: {
    peakRmsPctMvc: 80,
    rateOfRiseMs: 400,
    symmetryPct: 90,
    // No rmsDropPct or rorDropPct
  },
  userContext: {
    readinessScore: 70,
    currentExercise: 'back_squat',
    setsCompleted: 2,
    // No currentWeightKg, historicalLabels, hoursSinceLastSession
  }
};
```

**Expected:** Should still provide valid recommendation

### Extreme Values
```typescript
const extremeData = {
  emgData: {
    peakRmsPctMvc: 120, // Over 100%
    rateOfRiseMs: 800,  // Very slow
    symmetryPct: 45,    // Terrible asymmetry
  },
  userContext: {
    readinessScore: 20,  // Extremely fatigued
    currentExercise: 'back_squat',
    setsCompleted: 8,    // High volume
  }
};
```

**Expected:** Should recommend stopping or very light recovery work

### Fresh Session
```typescript
const freshData = {
  emgData: {
    peakRmsPctMvc: 92,
    rateOfRiseMs: 350,
    symmetryPct: 97,
  },
  userContext: {
    readinessScore: 95,
    currentExercise: 'warm_up',
    setsCompleted: 0,
  }
};
```

**Expected:** Should recommend starting with main lift

## Performance Testing

### Latency
- Typical Gemini API response: 1-3 seconds
- Fallback response: <10ms
- Abort signal should cancel within 100ms

### Parallel Requests
Test multiple simultaneous recommendations:

```typescript
const requests = [
  fetchRecommendation(data1, context1, { signal: signal1 }),
  fetchRecommendation(data2, context2, { signal: signal2 }),
  fetchRecommendation(data3, context3, { signal: signal3 }),
];

const results = await Promise.all(requests);
```

**Expected:** All complete successfully, no race conditions

## Integration Checklist

Before deploying:

- [ ] Demo screen loads without errors
- [ ] All 6 test scenarios run successfully
- [ ] Fallback activates when offline
- [ ] Confidence scores display correctly
- [ ] Load adjustment icons render (⬆️ ➡️ ⬇️)
- [ ] Alternatives section shows 2 exercises
- [ ] "Start Exercise" button works
- [ ] "View Alternatives" button works
- [ ] Skeleton loader appears during fetch
- [ ] Error state handles API failures
- [ ] Documentation is clear and accurate

## Known Issues

None at this time.

## Reporting Bugs

If you find issues:

1. Note the EMG data and user context
2. Check browser console for errors
3. Verify Gemini API key is configured
4. Test with fallback (offline mode)
5. Report with full reproduction steps

---

**Status:** ✅ Ready for testing
**Last Updated:** 2025-10-20
