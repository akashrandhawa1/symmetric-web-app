# Exercise Recommendation System

AI-powered exercise recommendation engine that analyzes EMG data and user context to provide personalized quad strength training suggestions.

## Overview

The system uses Gemini API (`gemini-2.0-flash-001`) to act as an expert strength coach, interpreting surface EMG metrics and workout context to recommend:

- **Next Exercise**: Specific exercise with rationale based on current state
- **Complete Prescription**: Sets, reps, tempo, rest periods, and execution notes
- **Load Adjustments**: Whether to increase, decrease, or maintain weight
- **Alternatives**: Backup exercises with specific use cases
- **Fatigue Guardrails**: Safety thresholds to prevent overtraining

## Architecture

### Files

```
src/
├── services/
│   └── exerciseRecommendation.ts    # Core API service
├── hooks/
│   └── useExerciseRecommendation.ts # React hook
├── components/
│   └── ExerciseRecommendationCard.tsx # UI component
└── screens/
    └── ExerciseRecommendationDemo.tsx # Testing interface
```

### Data Flow

```
EMG Sensors → EMGDataInput → fetchExerciseRecommendation() → Gemini API
                     ↓
              UserContext → System Prompt → JSON Schema → ExerciseRecommendation
                     ↓
              useExerciseRecommendation() → React State
                     ↓
        ExerciseRecommendationCard → User Interface
```

## Core Components

### 1. Service Layer (`exerciseRecommendation.ts`)

**Exports:**

```typescript
// Main API function
export async function fetchExerciseRecommendation(
  emgData: EMGDataInput,
  userContext: UserContext,
  { signal }: { signal: AbortSignal }
): Promise<ExerciseRecommendation>;

// Fallback when API unavailable
export function getFallbackRecommendation(
  emgData: EMGDataInput,
  userContext: UserContext
): ExerciseRecommendation;
```

**EMG Data Input:**
```typescript
type EMGDataInput = {
  peakRmsPctMvc: number;      // Peak RMS as % of MVC (0-100+)
  rateOfRiseMs: number;       // Activation speed in milliseconds
  symmetryPct: number;        // Left-right balance (0-100)
  rmsDropPct?: number;        // Fatigue indicator across set
  rorDropPct?: number;        // Rate-of-rise degradation
};
```

**User Context:**
```typescript
type UserContext = {
  readinessScore: number;                    // 0-100
  currentExercise: string;                   // e.g., 'back_squat'
  currentWeightKg?: number;                  // Current load
  setsCompleted: number;                     // Session volume
  historicalLabels?: Array<{                 // User preferences
    exercise: string;
    label: 'felt_strongest' | 'effective' | 'moderate' | 'ineffective';
  }>;
  hoursSinceLastSession?: number;
};
```

**Recommendation Output:**
```typescript
type ExerciseRecommendation = {
  next_exercise: {
    id: string;              // 'back_squat', 'split_squat', etc.
    name: string;            // 'Back Squat'
    intent: 'main' | 'accessory';
    rationale: string;       // Why this exercise now
  };
  prescription: {
    sets: number;            // e.g., 3
    reps: string;            // e.g., '3-6' or '5-8 per leg'
    tempo: string;           // e.g., '2-0-1-0' (eccentric-pause-concentric-pause)
    rest_s: number;          // Rest in seconds
    notes: string;           // Execution cues
  };
  adjustments: {
    load: 'increase' | 'hold' | 'decrease' | 'n/a';
    why: string;             // Load reasoning
  };
  alternatives: Array<{
    id: string;
    name: string;
    when_to_use: string;     // Conditional guidance
  }>;
  fatigue_guardrail: {
    stop_if: string;         // Safety threshold description
    retest_after_s: number;  // Recovery period
  };
  confidence: number;        // 0.0 - 1.0
  telemetry_keys: string[];  // Metrics used in decision
};
```

### 2. React Hook (`useExerciseRecommendation.ts`)

**Usage:**

```typescript
import { useExerciseRecommendation } from '@/hooks/useExerciseRecommendation';

function MyComponent() {
  const {
    recommendation,      // Current recommendation (null if not fetched)
    isLoading,          // True while fetching
    error,              // Error message if failed
    isFallback,         // True if using local fallback
    fetchRecommendation, // Function to fetch
    clear,              // Clear current recommendation
  } = useExerciseRecommendation();

  // After set completion
  const handleSetComplete = async () => {
    await fetchRecommendation(
      {
        peakRmsPctMvc: 82,
        rateOfRiseMs: 450,
        symmetryPct: 92,
      },
      {
        readinessScore: 75,
        currentExercise: 'back_squat',
        setsCompleted: 3,
      }
    );
  };

  return (
    <div>
      {isLoading && <p>Analyzing...</p>}
      {recommendation && <p>Next: {recommendation.next_exercise.name}</p>}
    </div>
  );
}
```

### 3. UI Component (`ExerciseRecommendationCard.tsx`)

**Usage:**

```typescript
import { ExerciseRecommendationCard } from '@/components/ExerciseRecommendationCard';

<ExerciseRecommendationCard
  recommendation={recommendation}
  onAccept={() => startExercise(recommendation.next_exercise.id)}
  onViewAlternatives={() => showAlternativesModal()}
  isLoading={false}
  isFallback={false}
/>
```

**Features:**
- Confidence score display with color coding (green >80%, yellow 60-80%, orange <60%)
- Load adjustment indicator (⬆️ increase, ➡️ hold, ⬇️ decrease)
- Prescription breakdown (sets, reps, tempo, rest)
- Safety guardrails prominently displayed
- Alternative exercises preview
- "Local Mode" badge when fallback is used

## Exercise Library

### Main Lifts (High Intensity)
- **Back Squat** - `back_squat`
- **Front Squat** - `front_squat` (quad emphasis)
- **Bulgarian Split Squat** - `split_squat` (unilateral, stability)
- **Leg Press** - `leg_press` (machine, bilateral)
- **Hack Squat** - `hack_squat` (machine, quad emphasis)

### Accessories (Moderate/Low Intensity)
- **Step-Up** - `step_up` (unilateral, functional)
- **Copenhagen Adductor** - `copenhagen` (stability, unilateral)
- **Wall Sit** - `wall_sit` (isometric, endurance)
- **Sissy Squat** - `sissy_squat` (quad isolation, advanced)
- **Leg Extension** - `leg_extension` (isolation, machine)
- **Walking Lunge** - `walking_lunge` (unilateral, dynamic)

## AI Coach Logic

The system prompt instructs Gemini to act as "Symmetric's Strength Coach" with these principles:

### Core Principles
1. **Goal**: Maximize quad strength efficiently (3-6 rep "goldilocks" zone)
2. **Data-First**: Interpret sEMG metrics, symmetry, readiness, fatigue
3. **Safety**: Never recommend unknown loads, use relative cues (RPE, tempo)
4. **Specificity**: Exact exercise + set recipe

### Interpretation Rules

**Activation Quality:**
- Prefer high normalized RMS (%MVC), robust rate-of-rise early in rep
- Maintain symmetry ≥90% (unless unilateral work)
- Minimize form drift (tracked via RoR decay, RMS drift)

**Fatigue Logic:**
- Readiness 65-85: Productive zone, continue
- Readiness 50-65: Proceed but bias toward lower-fatigue alternatives
- Readiness <50: Switch to recovery/accessories

**Progression:**
- %MVC <70% on main lift + not fatigued → More load or better leverage variant
- %MVC ≥85% with good RoR + symmetry → Continue or add back-off technique work

**Label Learning:**
- Prefer exercises historically labeled "felt_strongest" or "effective" when data quality is high

## Testing

### Demo Screen

Access the interactive demo at `/exercise-recommendation-demo.html` or run:

```bash
npm run dev
# Navigate to http://localhost:5173/exercise-recommendation-demo.html
```

**Test Scenarios:**
1. **Strong Performance** - High activation, should continue
2. **Need More Load** - Low activation, suggest increase
3. **Fatigued Switch** - Low readiness, switch to accessory
4. **Asymmetry Detected** - Poor symmetry, recommend unilateral
5. **Fresh & Strong** - High readiness, push harder
6. **User Preferences** - Historical labels influence choice

### Unit Testing

```bash
npm test src/hooks/useExerciseRecommendation.test.ts
```

## Integration Guide

### 1. After Set Completion

```typescript
import { useExerciseRecommendation } from '@/hooks/useExerciseRecommendation';
import { ExerciseRecommendationCard } from '@/components/ExerciseRecommendationCard';

function TrainingWorkflow() {
  const { recommendation, isLoading, fetchRecommendation } = useExerciseRecommendation();
  const [emgData, setEmGData] = useState<EMGDataInput | null>(null);

  const handleSetComplete = async (completedSet: CompletedSet) => {
    // Extract EMG metrics from completed set
    const emgData: EMGDataInput = {
      peakRmsPctMvc: completedSet.peakRmsPctMvc,
      rateOfRiseMs: completedSet.avgRateOfRise,
      symmetryPct: completedSet.symmetry,
      rmsDropPct: completedSet.rmsDecay,
    };

    // Gather user context
    const userContext: UserContext = {
      readinessScore: currentReadiness,
      currentExercise: currentExerciseId,
      currentWeightKg: currentWeight,
      setsCompleted: completedSets.length,
      historicalLabels: userPreferences.exerciseLabels,
    };

    // Fetch recommendation
    await fetchRecommendation(emgData, userContext);
  };

  return (
    <>
      {/* Show during set */}
      <SetInProgress onSetComplete={handleSetComplete} />

      {/* Show after set completion */}
      {recommendation && (
        <ExerciseRecommendationCard
          recommendation={recommendation}
          onAccept={() => {
            // Start recommended exercise
            startExercise(recommendation.next_exercise.id);
          }}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
```

### 2. Parallel with Other Feedback

```typescript
// Fetch recommendation alongside set summary
useEffect(() => {
  if (setJustCompleted) {
    Promise.all([
      fetchSetSummary(emgData),
      fetchRecommendation(emgData, userContext),
    ]).then(([summary, rec]) => {
      setSetSummary(summary);
      setRecommendation(rec);
    });
  }
}, [setJustCompleted]);
```

## Fallback Logic

When Gemini API is unavailable, the system uses rule-based fallback:

**Rules:**
1. If readiness ≥65 AND %MVC ≥70 AND symmetry ≥85 → Continue current exercise
2. If readiness <50 → Switch to accessory (leg extension)
3. If moderate readiness → Suggest Bulgarian split squat (lower system stress)

**Load Adjustments:**
- %MVC ≥85% → Increase load
- Otherwise → Hold

**Confidence:** Fallback recommendations have `confidence: 0.6`

## API Configuration

**Model:** `gemini-2.0-flash-001`
**Temperature:** `0.3` (consistent recommendations)
**Response Format:** `application/json` with strict schema validation
**Max Tokens:** `1000`
**Timeout:** Handled by `AbortSignal`

## Error Handling

```typescript
try {
  const rec = await fetchExerciseRecommendation(emgData, userContext, { signal });
} catch (error) {
  if (error.name === 'AbortError') {
    // Request cancelled
  } else {
    // API error - fallback used automatically by hook
    console.warn('Using fallback recommendation');
  }
}
```

## Performance Considerations

- **Caching**: Consider caching recommendations for identical EMG+context inputs
- **Abort Signals**: Always pass abort signal to cancel in-flight requests
- **Parallel Requests**: Fetch alongside other post-set analysis for faster UX
- **Fallback**: Zero-latency fallback ensures system always responds

## Future Enhancements

- [ ] Multi-session learning (track recommendation→outcome feedback loop)
- [ ] User exercise preferences dashboard
- [ ] Custom exercise library additions
- [ ] Voice-based recommendation delivery
- [ ] Integration with video form analysis
- [ ] Adaptive confidence thresholds based on user experience level

## Troubleshooting

**Q: Recommendations don't match EMG data?**
- Check that `peakRmsPctMvc` is normalized to MVC baseline
- Verify `symmetryPct` is 0-100, not a ratio
- Ensure `readinessScore` reflects current state

**Q: Always getting fallback recommendations?**
- Verify Gemini API key is configured
- Check network connectivity
- Review browser console for API errors

**Q: Confidence scores always low?**
- May indicate ambiguous data (mid-range metrics)
- Consider providing `historicalLabels` for better context
- Check if `currentWeightKg` is provided

## Related Documentation

- [Live Coaching System](./LIVE_COACHING_README.md)
- [Compliance Engine](./COMPLIANCE_ENGINE_SUMMARY.md)
- [EMG Processing Pipeline](./docs/emg-processing.md)

---

**Built with:** React + TypeScript + Gemini AI
**Status:** ✅ Production-ready (demo available)
