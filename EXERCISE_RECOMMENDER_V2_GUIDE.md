# Exercise Recommender V2 - Integration Guide

## Overview

This guide shows how to upgrade from the original `exerciseRecommendation.ts` service to the new V2 system with:

- ✅ **Zod validation** - Strict I/O contracts prevent LLM hallucinations
- ✅ **Deterministic fallbacks** - Rule-based recommendations when API fails
- ✅ **User labeling** - Collect feedback to improve recommendations over time
- ✅ **Metric-based logic** - Clear thresholds for load, fatigue, and progression decisions
- ✅ **Session history** - Use last 10-60 sets to inform recommendations

## New Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Training Flow                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   Set Completion       │
         │   - EMG data           │
         │   - Readiness          │
         │   - Fatigue index      │
         └──────────┬─────────────┘
                    │
                    ▼
         ┌────────────────────────┐
         │   SetLabelSheet        │
         │   "How did that feel?" │
         │   💪 😐 😮‍💨 ⚠️         │
         └──────────┬─────────────┘
                    │
                    ▼
         ┌────────────────────────┐
         │ buildSessionContext()  │
         │ - Recent 10-20 sets    │
         │ - Readiness            │
         │ - Equipment            │
         └──────────┬─────────────┘
                    │
                    ▼
         ┌────────────────────────┐
         │  recommendNext()       │
         │  1. Validate input     │
         │  2. Preselect candidate│
         │  3. Extract hints      │
         │  4. Call Gemini        │
         │  5. Validate output    │
         │  6. Fallback if needed │
         └──────────┬─────────────┘
                    │
                    ▼
         ┌────────────────────────┐
         │ ExerciseRecommendation │
         │ Card (UI)              │
         └────────────────────────┘
```

## Files Created

### Core System
- `src/lib/coach/exerciseTypes.ts` - Zod schemas and types
- `src/lib/coach/exerciseRecommender.ts` - Deterministic pipeline + LLM
- `src/components/coach/SetLabelSheet.tsx` - User feedback UI

### Integration Points
You need to wire these into your existing:
- `RestCoach` or `SetSummaryCard` - Show SetLabelSheet after set
- Training workflow - Call `recommendNext()` with session context
- Storage - Persist labels alongside set summaries

## Step-by-Step Integration

### Step 1: Add SetLabelSheet to RestCoach

**File:** `src/components/coach/RestCoach.tsx`

```typescript
import { SetLabelSheet, useSetLabelSheet, saveSetLabel } from './SetLabelSheet';
import type { SetLabel } from '../../lib/coach/exerciseTypes';

export default function RestCoach(props: RestCoachProps) {
  // Existing state...

  // Add label sheet
  const labelSheet = useSetLabelSheet((label: SetLabel) => {
    // Save label with set data
    saveSetLabel({
      setId: `set_${Date.now()}`,
      exerciseId: props.currentExercise,
      label,
      timestamp: Date.now(),
    });

    // Optionally: Include in set summary
    props.onSetLabelSubmit?.(label);
  });

  // Show sheet after set summary appears
  useEffect(() => {
    if (props.setJustCompleted && !labelSheet.label) {
      // Delay slightly for better UX
      setTimeout(() => labelSheet.open(), 800);
    }
  }, [props.setJustCompleted]);

  return (
    <>
      {/* Existing RestCoach UI */}

      {/* Add label sheet */}
      <SetLabelSheet
        open={labelSheet.isOpen}
        onClose={labelSheet.close}
        onSubmit={labelSheet.handleSubmit}
      />
    </>
  );
}
```

### Step 2: Build SessionContext from Your Data

**File:** `src/hooks/useExerciseRecommender.ts` (new file)

```typescript
import { useState, useCallback } from 'react';
import { recommendNext, buildSessionContext } from '../lib/coach/exerciseRecommender';
import type { Recommendation, SessionContext } from '../lib/coach/exerciseTypes';
import { getRecentLabels } from '../components/coach/SetLabelSheet';

export function useExerciseRecommender() {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendation = useCallback(async (params: {
    userId: string;
    completedSets: Array<{
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
    }>;
    currentReadiness: number;
    availableEquipment: Array<'barbell' | 'dumbbell' | 'machine' | 'bodyweight'>;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get recent labels from storage
      const recentLabels = getRecentLabels({ limit: 20 });
      const labelMap = new Map(
        recentLabels.map(l => [l.setId, l.label])
      );

      // Build session context
      const context: SessionContext = buildSessionContext({
        userId: params.userId,
        recentSets: params.completedSets.map((set, idx) => ({
          exerciseId: set.exerciseId,
          exerciseName: set.exerciseName,
          repCount: set.reps.length,
          rpe: set.rpe,
          emgPeakRms: set.emgPeakRms,
          emgRateOfRise: set.emgRateOfRise,
          symmetryPct: set.symmetryPct,
          mvcNormPct: set.mvcNormPct,
          signalQuality: set.signalQuality,
          fatigueIndex: set.fatigueIndex,
          readinessAfter: set.readinessAfter,
          userLabel: labelMap.get(`set_${idx}`),
        })),
        currentReadiness: params.currentReadiness,
        availableEquipment: params.availableEquipment,
      });

      // Get recommendation
      const rec = await recommendNext(context);
      setRecommendation(rec);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setRecommendation(null);
    setError(null);
  }, []);

  return {
    recommendation,
    isLoading,
    error,
    fetchRecommendation,
    clear,
  };
}
```

### Step 3: Show Recommendation in Training Flow

**File:** `src/screens.tsx` (or wherever TrainingScreen is)

```typescript
import { useExerciseRecommender } from '../hooks/useExerciseRecommender';
import { ExerciseRecommendationCard } from '../components/ExerciseRecommendationCard';

export const TrainingScreen: React.FC<TrainingScreenProps> = (props) => {
  const recommender = useExerciseRecommender();

  // After set completes
  const handleSetComplete = useCallback(async () => {
    // Your existing set completion logic...

    // Fetch recommendation
    await recommender.fetchRecommendation({
      userId: userProfile?.id ?? 'unknown',
      completedSets: completedSets.map(s => ({
        exerciseId: s.exerciseId,
        exerciseName: s.exerciseName,
        reps: s.reps,
        emgPeakRms: s.emgPeakRms,
        emgRateOfRise: s.avgRateOfRise,
        symmetryPct: s.symmetry,
        mvcNormPct: s.peakPctMvc,
        signalQuality: s.signalQuality ?? 'ok',
        fatigueIndex: s.fatigueIndex,
        readinessAfter: s.readinessAfter,
        rpe: s.rpe,
      })),
      currentReadiness: readinessScore,
      availableEquipment: ['barbell', 'dumbbell', 'machine', 'bodyweight'],
    });
  }, [completedSets, readinessScore]);

  return (
    <div>
      {/* Existing training UI */}

      {/* Show recommendation after set */}
      {recommender.recommendation && (
        <ExerciseRecommendationCard
          recommendation={recommender.recommendation}
          onAccept={() => {
            // Start recommended exercise
            startNextExercise(recommender.recommendation!.next_exercise.id);
            recommender.clear();
          }}
          onViewAlternatives={() => {
            // Show alternatives modal
            showAlternativesModal(recommender.recommendation!.alternatives);
          }}
          isLoading={recommender.isLoading}
        />
      )}
    </div>
  );
};
```

### Step 4: Store Labels with Set Summaries

**File:** Wherever you persist set summaries

```typescript
import type { SetLabel } from '../lib/coach/exerciseTypes';

interface CompletedSet {
  // Existing fields...
  userLabel?: SetLabel; // Add this
}

// When saving set
function saveCompletedSet(set: CompletedSet, label: SetLabel | null) {
  const setWithLabel = {
    ...set,
    userLabel: label,
  };

  // Save to your storage (localStorage, backend, etc.)
  saveToStorage(setWithLabel);
}
```

## Metric Thresholds Reference

From `exerciseTypes.ts`:

```typescript
THRESHOLDS = {
  MVC_LOW: 70,              // Below this → increase load
  MVC_OPTIMAL: 85,          // At/above → continue or push

  READINESS_PRODUCTIVE_MIN: 65,  // Above → continue main lifts
  READINESS_CAUTION: 50,         // Below → switch to accessories

  FATIGUE_MANAGEABLE: 0.5,       // Below → sustainable
  FATIGUE_HIGH: 0.6,             // Above → pivot to accessory

  SYMMETRY_GOOD: 90,             // Above → bilateral ok
  SYMMETRY_CAUTION: 85,          // Below → consider unilateral

  ROR_COLLAPSE_THRESHOLD: 30,    // % drop from first rep
};
```

## Decision Logic Summary

### Continue Main Lift When:
- Readiness ≥ 65
- %MVC ≥ 70
- Symmetry ≥ 85
- Fatigue Index < 0.5

### Increase Load When:
- %MVC < 70 (too easy)
- %MVC ≥ 85 + good RoR + symmetry ≥ 90 (ready for more)

### Pivot to Accessory When:
- Readiness < 50
- Fatigue Index ≥ 0.6
- Symmetry < 85

### Stop Guardrails:
- RoR collapse > 30% from first rep
- Readiness < 50
- Any pain flag from user label

## Testing the V2 System

### Unit Test Scenarios

```typescript
import { recommendNext, buildSessionContext } from './lib/coach/exerciseRecommender';

// Scenario 1: Fresh session, high readiness
const ctx1 = buildSessionContext({
  userId: 'test',
  recentSets: [],
  currentReadiness: 85,
  availableEquipment: ['barbell'],
});
const rec1 = await recommendNext(ctx1);
// Expected: Main lift (back squat), load: n/a

// Scenario 2: Fatigued, low readiness
const ctx2 = buildSessionContext({
  userId: 'test',
  recentSets: [{
    exerciseId: 'back_squat',
    exerciseName: 'Back Squat',
    repCount: 5,
    emgPeakRms: 850,
    emgRateOfRise: 520,
    symmetryPct: 88,
    mvcNormPct: 72,
    signalQuality: 'ok',
    fatigueIndex: 0.68,
    readinessAfter: 48,
  }],
  currentReadiness: 48,
  availableEquipment: ['machine', 'bodyweight'],
});
const rec2 = await recommendNext(ctx2);
// Expected: Accessory (leg extension), load: decrease

// Scenario 3: Asymmetry detected
const ctx3 = buildSessionContext({
  userId: 'test',
  recentSets: [{
    exerciseId: 'back_squat',
    exerciseName: 'Back Squat',
    repCount: 5,
    emgPeakRms: 900,
    emgRateOfRise: 440,
    symmetryPct: 78, // Poor
    mvcNormPct: 76,
    signalQuality: 'good',
    fatigueIndex: 0.4,
    readinessAfter: 68,
  }],
  currentReadiness: 68,
  availableEquipment: ['barbell', 'dumbbell'],
});
const rec3 = await recommendNext(ctx3);
// Expected: Unilateral work (split squat)
```

## Gemini Integration (TODO)

The current `exerciseRecommender.ts` has a placeholder for Gemini. To complete integration:

```typescript
// In exerciseRecommender.ts, replace:
async function callGeminiForRecommendation(...) {
  throw new Error('Gemini integration pending');
}

// With:
import { getGeminiClient, extractText } from '../../services';
import { Type } from '@google/genai';

async function callGeminiForRecommendation(
  ctx: SessionContext,
  candidate: string,
  hints: string[]
): Promise<unknown> {
  const client = getGeminiClient();
  const prompt = buildExpertPrompt(ctx, candidate, hints);

  const response = await client.models.generateContent({
    model: 'gemini-2.0-flash-001',
    contents: [
      { role: 'user', parts: [{ text: prompt }] }
    ],
    config: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          next_exercise: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              intent: { type: Type.STRING, enum: ['main', 'accessory'] },
              rationale: { type: Type.STRING },
            },
            required: ['id', 'name', 'intent', 'rationale'],
          },
          // ... rest of schema from RecommendationSchema
        },
      },
    },
  });

  const rawText = response.text ?? (await extractText(response));
  return JSON.parse(rawText);
}
```

## Migration Path

### Option A: Gradual Rollout
1. Keep existing `exerciseRecommendation.ts` active
2. Add V2 system alongside
3. A/B test with subset of users
4. Compare recommendation quality via user labels
5. Switch fully to V2 once validated

### Option B: Direct Replacement
1. Update all imports to new system
2. Add SetLabelSheet to training flow
3. Migrate existing EMG data structure to SessionContext
4. Test thoroughly with demo scenarios
5. Deploy

## Monitoring & Improvement

### Track These Metrics

```typescript
// Log recommendation events
logAnalyticsEvent('exercise_recommendation', {
  recommendation_id: rec.next_exercise.id,
  confidence: rec.confidence,
  load_adjustment: rec.adjustments.load,
  user_accepted: true/false,
  fallback_used: true/false,
});

// Log label events
logAnalyticsEvent('set_label_submitted', {
  exercise_id: setData.exerciseId,
  label: label,
  readiness: setData.readinessAfter,
  fatigue_index: setData.fatigueIndex,
});

// Track recommendation accuracy
logAnalyticsEvent('recommendation_outcome', {
  recommendation_id: rec.next_exercise.id,
  user_followed: true/false,
  next_set_label: nextLabel,
  next_set_mvc_pct: nextSetMvc,
});
```

### Target Metrics
- **Label agreement:** ≥85% of "felt_strong" labels should align with recommendations to continue/increase
- **Confidence calibration:** High confidence (>0.8) recommendations should have >90% user acceptance
- **Fallback rate:** <10% of recommendations should use fallback (indicates good API reliability)

## FAQ

**Q: What if user doesn't label sets?**
A: System still works! Labels are optional. Deterministic fallback uses only EMG metrics.

**Q: How many sets needed for good recommendations?**
A: 0 sets (cold start) works with conservative defaults. 3+ sets provide better context. 10+ sets enable personalization.

**Q: Can we customize thresholds per user?**
A: Yes! Wrap `THRESHOLDS` in a user profile lookup:
```typescript
const userThresholds = getUserThresholds(userId) ?? THRESHOLDS;
```

**Q: How to handle offline mode?**
A: Deterministic fallback runs entirely locally—no API calls needed.

---

**Status:** ✅ V2 System Complete, Ready for Integration
**Next Steps:** Wire SetLabelSheet → Test with real workouts → Enable Gemini → Monitor metrics
