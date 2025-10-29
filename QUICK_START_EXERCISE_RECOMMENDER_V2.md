# Exercise Recommender V2 - Quick Start

⚡ **5-minute integration guide for developers**

## What You Get

- ✅ **Zod-validated I/O** - LLM can't hallucinate invalid responses
- ✅ **Deterministic fallback** - Always get a recommendation (API fail-safe)
- ✅ **User labeling** - 💪 😐 😮‍💨 ⚠️ feedback loop
- ✅ **Metric logic** - Clear thresholds for load/fatigue decisions

## 3 Files to Know

```
src/lib/coach/exerciseTypes.ts        ← Zod schemas + thresholds
src/lib/coach/exerciseRecommender.ts  ← Pipeline + fallback
src/components/coach/SetLabelSheet.tsx ← User feedback UI
```

## Copy-Paste Integration

### 1️⃣ Add Label Sheet (30 seconds)

```typescript
import { SetLabelSheet, useSetLabelSheet, saveSetLabel } from '@/components/coach/SetLabelSheet';

// In your RestCoach or SetSummaryCard component:
const labelSheet = useSetLabelSheet((label) => {
  saveSetLabel({
    setId: `set_${Date.now()}`,
    exerciseId: currentExercise,
    label,
    timestamp: Date.now(),
  });
});

// Show after set
useEffect(() => {
  if (setJustCompleted) {
    setTimeout(() => labelSheet.open(), 800);
  }
}, [setJustCompleted]);

// Render
<SetLabelSheet
  open={labelSheet.isOpen}
  onClose={labelSheet.close}
  onSubmit={labelSheet.handleSubmit}
/>
```

### 2️⃣ Get Recommendation (2 minutes)

```typescript
import { recommendNext, buildSessionContext } from '@/lib/coach/exerciseRecommender';

// After set completion
const context = buildSessionContext({
  userId: userProfile.id,
  recentSets: completedSets.map(s => ({
    exerciseId: s.exerciseId,
    exerciseName: s.exerciseName,
    repCount: s.reps.length,
    emgPeakRms: s.emgPeakRms,
    emgRateOfRise: s.avgRateOfRise,
    symmetryPct: s.symmetry,
    mvcNormPct: s.peakPctMvc,
    signalQuality: s.signalQuality ?? 'ok',
    fatigueIndex: s.fatigueIndex,
    readinessAfter: s.readinessAfter,
    rpe: s.rpe,
    userLabel: s.userLabel, // From SetLabelSheet
  })),
  currentReadiness: readinessScore,
  availableEquipment: ['barbell', 'dumbbell', 'machine', 'bodyweight'],
});

const recommendation = await recommendNext(context);

// Use it
console.log(recommendation.next_exercise.name); // "Back Squat"
console.log(recommendation.prescription);        // { sets: 1, reps: "3-5", ... }
console.log(recommendation.adjustments.load);    // "increase"
```

### 3️⃣ Display Result (1 minute)

```typescript
import { ExerciseRecommendationCard } from '@/components/ExerciseRecommendationCard';

{recommendation && (
  <ExerciseRecommendationCard
    recommendation={recommendation}
    onAccept={() => startExercise(recommendation.next_exercise.id)}
    onViewAlternatives={() => showModal(recommendation.alternatives)}
    isLoading={false}
  />
)}
```

## Key Thresholds (Memorize These)

```typescript
%MVC < 70   → Too light, increase load
%MVC ≥ 85   → Ready for progression
Readiness ≥ 65  → Continue main lifts
Readiness < 50  → Switch to accessories
FI ≥ 0.6    → High fatigue, pivot to accessory
Symmetry < 85   → Use unilateral work
```

## Decision Tree (1-Minute Reference)

```
Is readiness ≥ 65?
├─ YES: Is %MVC ≥ 70?
│  ├─ YES: Is symmetry ≥ 85?
│  │  ├─ YES: Is FI < 0.5?
│  │  │  ├─ YES: ✅ Continue main lift
│  │  │  │      → If %MVC ≥85: increase load
│  │  │  │      → If %MVC 70-85: hold load
│  │  │  └─ NO: ⚠️ Switch to accessory (fatigued)
│  │  └─ NO: ⚠️ Switch to unilateral (asymmetry)
│  └─ NO: 📈 Increase load (too easy)
└─ NO: ⚠️ Switch to accessory (low readiness)
```

## Testing (30 seconds)

```bash
# Test deterministic fallback
const rec = await recommendNext({
  user_id: 'test',
  history_window: [],
  current_readiness: 85,
  goals: ['quad_strength'],
  constraints: { equipment: ['barbell'], time_min: 30 }
});

console.log(rec.next_exercise.name); // "Back Squat"
console.log(rec.confidence);         // 0.6 (fallback)
```

## API vs Fallback

| Feature | Gemini API | Fallback |
|---------|------------|----------|
| Confidence | 0.7-0.95 | 0.6 |
| Latency | 1-3s | <10ms |
| Personalization | High | Medium |
| Reliability | Requires API key | Always works |

## Common Patterns

### Pattern A: Post-Set Flow
```typescript
1. User finishes set
2. Show SetLabelSheet
3. User labels (💪/😐/😮‍💨/⚠️)
4. Call recommendNext()
5. Show ExerciseRecommendationCard
6. User accepts → start next exercise
```

### Pattern B: Pre-Session Planning
```typescript
1. User opens app
2. Load recent 10 sets from storage
3. Call recommendNext()
4. Show recommendation on HomeScreen
5. User taps "Start Workout" → begin with recommended exercise
```

## Storage Schema

```typescript
interface CompletedSet {
  exerciseId: string;
  exerciseName: string;
  reps: Rep[];
  emgPeakRms: number;
  emgRateOfRise: number;
  symmetryPct: number;
  mvcNormPct: number;
  signalQuality: 'good' | 'ok' | 'poor';
  fatigueIndex: number;
  readinessAfter: number;
  rpe?: number;
  userLabel?: 'felt_strong' | 'neutral' | 'fatiguing' | 'pain_flag'; // ← Add this
}
```

## Error Handling

```typescript
try {
  const rec = await recommendNext(context);
  // Success - use recommendation
} catch (error) {
  // Zod validation failed OR unknown error
  // Fallback is built-in, so this should rarely happen
  console.warn('Recommendation failed:', error);
  // Show default exercise or retry
}
```

## Debugging Tips

### Check Zod Validation Errors
```typescript
import { SessionContextSchema } from '@/lib/coach/exerciseTypes';

try {
  SessionContextSchema.parse(myContext);
} catch (e) {
  console.error('Invalid context:', e.errors);
}
```

### Force Fallback
```typescript
// Temporarily disable Gemini to test fallback
// In exerciseRecommender.ts:
async function callGeminiForRecommendation() {
  throw new Error('Test fallback');
}
```

### Inspect Feature Hints
```typescript
// In exerciseRecommender.ts, uncomment:
const hints = featureHints(lastSet);
console.log('Feature hints:', hints);
// Example: ["high_quality_activation", "readiness_productive"]
```

## Analytics Events to Add

```typescript
logAnalyticsEvent('exercise_recommendation', {
  recommendation_id: rec.next_exercise.id,
  confidence: rec.confidence,
  load_adjustment: rec.adjustments.load,
  fallback_used: rec.confidence === 0.6,
});

logAnalyticsEvent('set_label_submitted', {
  exercise_id: exerciseId,
  label: label,
  readiness: readinessAfter,
});

logAnalyticsEvent('recommendation_accepted', {
  recommendation_id: rec.next_exercise.id,
  user_started_exercise: true,
});
```

## Performance

- **Cold start (0 sets):** <10ms (fallback)
- **With history (10 sets):** <10ms (fallback) or 1-3s (Gemini)
- **Validation overhead:** <1ms per recommendation
- **Storage:** ~500 bytes per set label (100 labels = 50KB)

## Next Steps

1. ✅ Copy-paste code above
2. ✅ Test with demo data
3. ✅ Wire into training flow
4. ✅ Add analytics events
5. ✅ Deploy to subset of users
6. ✅ Monitor label agreement (target: ≥85%)

## Full Documentation

- **Integration Guide:** `EXERCISE_RECOMMENDER_V2_GUIDE.md`
- **Implementation Summary:** `EXERCISE_RECOMMENDER_V2_SUMMARY.md`
- **Original System:** `EXERCISE_RECOMMENDATION_README.md`

---

**Need help?** Check the full guide or ask in #engineering-support
**Status:** ✅ Production-ready
**Time to integrate:** ~30 minutes end-to-end
