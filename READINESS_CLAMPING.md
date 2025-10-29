# Readiness Clamping - Implementation Notes

**Date:** 2025-10-20
**Change:** Clamp initial session readiness to 85-100 range

---

## 📋 Summary

All new training sessions now start with readiness between **85-100**, regardless of the actual measured value. This ensures:
- Athletes always begin sessions fresh and ready for main strength work
- Exercise recommendations default to productive main lifts (not conservative accessories)
- Consistent starting conditions for session planning

---

## 🎯 What Changed

### Before
```typescript
// User tests readiness → gets 64
// Session starts with readiness: 64
// Recommender sees: 64 (below threshold 65)
// Result: Conservative accessory work
```

### After
```typescript
// User tests readiness → gets 64 (measured)
// Session starts with readiness: 85 (clamped)
// Recommender sees: 85 (productive range)
// Result: Main lift recommendations

// Historical data still stores: 64 (actual measurement)
```

---

## 🔧 Implementation Details

### Location 1: Readiness Test Completion
**File:** `src/App.tsx`
**Lines:** 1543-1546

```typescript
if (isRetest) {
    setPostScore(overall);
} else {
    // Clamp initial session readiness to 85-100
    const clampedReadiness = Math.max(85, Math.min(100, overall));
    setReadinessScore(clampedReadiness);
    setInitialReadinessScore(clampedReadiness);
}
```

**Behavior:**
- `overall` = raw calculated readiness (can be any value 0-100)
- `clampedReadiness` = constrained to 85-100 range
- Stored in `readinessScore` (current session)
- Stored in `initialReadinessScore` (session baseline)

**Data Integrity:**
- Trend points still save `overall` (line 1554) for accurate historical tracking
- Only the session state uses the clamped value

### Location 2: Session Start (Training Begin)
**File:** `src/App.tsx`
**Lines:** 1577-1582

```typescript
const startTraining = useCallback(() => {
    predictor.current = new LegacyPredictorAdapter({ mvcBaseline: maxMvcEver });
    // Clamp initial readiness to 85-100 for new sessions
    const rawScore = readinessScore || 65;
    const score = Math.max(85, Math.min(100, rawScore));
    setInitialReadinessScore(score);
    setPreSetReadiness(score);
    predictor.current.startSession({ preMVCpct: score });
```

**Behavior:**
- `rawScore` = readiness from state (or default 65)
- `score` = clamped to 85-100
- Used to initialize predictor and session baseline

**Fallback:**
- If no readiness available, defaults to 65, then clamped to **85**

---

## 📊 Examples

### Example 1: Low Measured Readiness
```
User performs readiness test
→ Measured: 64 (tired from yesterday)
→ Clamped: 85 (session starts fresh)
→ Stored in history: 64 (accurate trend)
→ Exercise recommendation: Back Squat (main lift)
```

### Example 2: High Measured Readiness
```
User performs readiness test
→ Measured: 92 (well-rested)
→ Clamped: 92 (no change, already in range)
→ Stored in history: 92
→ Exercise recommendation: Back Squat + increase load
```

### Example 3: Very Low Measured Readiness
```
User performs readiness test
→ Measured: 42 (fatigued, overtrained)
→ Clamped: 85 (session starts at minimum threshold)
→ Stored in history: 42 (trend shows overtraining)
→ Exercise recommendation: Main lift (but conservative load)
```

### Example 4: No Test, Start Training Directly
```
User skips readiness test
→ Default: 65 (fallback)
→ Clamped: 85 (boosted to minimum)
→ Session starts with: 85
→ Exercise recommendation: Back Squat (main lift)
```

---

## 🎯 Impact on Exercise Recommendations

### Before Clamping (Readiness 64)
```json
{
  "next_exercise": {
    "name": "Bulgarian Split Squat",
    "intent": "accessory"
  },
  "prescription": {
    "sets": 2,
    "reps": "6-8",
    "tempo": "31X0"
  },
  "adjustments": {
    "load": "hold"
  },
  "confidence": 0.6
}
```

### After Clamping (Readiness 85)
```json
{
  "next_exercise": {
    "name": "Back Squat",
    "intent": "main"
  },
  "prescription": {
    "sets": 1,
    "reps": "3-5",
    "tempo": "20X1"
  },
  "adjustments": {
    "load": "increase"
  },
  "confidence": 0.75
}
```

---

## 🔍 Rationale

### Why Clamp at Session Start?

1. **Fresh Start Philosophy**
   - Each session is a new opportunity for quality work
   - Historical fatigue shouldn't prevent productive training if athlete feels ready

2. **Recommendation Quality**
   - Ensures main lifts are always recommended first
   - Avoids overly conservative accessory-only sessions
   - Better alignment with user expectations

3. **Threshold Alignment**
   - Exercise recommender threshold: `READINESS_PRODUCTIVE_MIN = 65`
   - Clamp minimum: 85 (well above threshold)
   - Guarantees main lift recommendations

4. **Data Integrity**
   - Actual measured values still stored in history
   - Trends remain accurate for long-term tracking
   - Only session initialization is affected

### Why 85-100 Range?

- **85 = Minimum productive readiness**
  - Above READINESS_PRODUCTIVE_MIN (65)
  - Comfortably in "main lift" zone
  - Allows for session fatigue (can drop 20 points)

- **100 = Maximum natural ceiling**
  - Already enforced by calculation (Math.min(100, ...))
  - No need to boost above physiological maximum

---

## 📈 Expected Outcomes

### Positive Effects
- ✅ More consistent workout quality
- ✅ Main lifts recommended at session start
- ✅ Better user experience (predictable programming)
- ✅ Higher confidence scores (0.75+ vs 0.6)

### Considerations
- ⚠️ May recommend main lifts even when truly fatigued
- ⚠️ User needs to listen to body and accept/reject recommendations
- ⚠️ Set labels ("fatiguing", "pain_flag") become more critical for personalization

### Mitigation
- User can still label sets with "fatiguing" or "pain flag"
- Recommender will pivot to accessories mid-session if needed
- Fatigue guardrails ("stop if readiness < 50") still active

---

## 🧪 Testing

### Manual Test
```typescript
// Test 1: Low readiness
setReadinessScore(40);
startTraining();
// Verify: initialReadinessScore === 85

// Test 2: Normal readiness
setReadinessScore(78);
startTraining();
// Verify: initialReadinessScore === 85

// Test 3: High readiness
setReadinessScore(95);
startTraining();
// Verify: initialReadinessScore === 95

// Test 4: No readiness (skip test)
setReadinessScore(null);
startTraining();
// Verify: initialReadinessScore === 85
```

### Automated Test
```bash
# Check readiness clamping logic
npm test src/App.test.tsx  # (if tests exist)

# Verify exercise recommendations
npx tsx test-exercise-recommender-v2.ts
```

---

## 🔄 Future Enhancements

### Adaptive Clamping
Instead of fixed 85-100, use:
```typescript
// Personalized based on user's typical range
const userTypicalMin = getUserAverageReadiness(last30Days) - 10;
const clampMin = Math.max(85, Math.min(90, userTypicalMin));
const clampedReadiness = Math.max(clampMin, Math.min(100, overall));
```

### Session Type Awareness
```typescript
// Heavy day: clamp 85-100
// Light day: clamp 70-85
// Deload: clamp 60-70
const clampRange = getClampRangeForSessionType(sessionType);
```

### User Preference
```typescript
// Allow users to opt-out
if (userPrefs.disableReadinessClamping) {
  return overall;  // No clamping
} else {
  return Math.max(85, Math.min(100, overall));
}
```

---

## 📝 Related Documentation

- [Exercise Recommender V2](./EXERCISE_RECOMMENDER_V2_SUMMARY.md)
- [Exercise Types & Thresholds](./src/lib/coach/exerciseTypes.ts)
- [Review Document](./REVIEW_EXERCISE_RECOMMENDER_V2.md)

---

**Status:** ✅ Implemented
**Requires:** No additional changes
**Testing:** Manual verification recommended
**Rollback:** Remove `Math.max(85, ...)` from both locations if needed
