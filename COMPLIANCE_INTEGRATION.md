# Compliance Engine Integration Guide

This guide shows how to wire up the compliance engine in your application.

## Overview

The compliance engine has been fully implemented with:
- ✅ `src/lib/compliance.ts` - Pure scoring library
- ✅ `src/lib/compliance.test.ts` - 34 passing unit tests
- ✅ `src/components/ComplianceToast.tsx` - Toast notifications
- ✅ `src/components/coach/SetSummaryCard.tsx` - Updated with "Listened" badge
- ✅ `src/components/coach/ClosureCard.tsx` - Session summary card

## Integration Steps

### 1. Add State to Exercise/Session Store

Add these fields to your exercise or session state type:

```typescript
type ExerciseState = {
  currentLoadKg: number;
  cumulativeAdjustPct: number;     // default 0 for the session
  lastAdjustmentPct?: number;      // what we asked
  lastOutcome?: 'hit'|'early'|'late'|'under';
  lastLockedInKg?: number;
  lastCompliance?: { listened: boolean; score: number };
  // ... existing fields
};
```

### 2. Call Compliance on Set Completion

In your set completion handler (where you process a completed set after a coach ask):

```typescript
import { scoreCompliance, type CoachAsk, type SetSnapshot } from '@/lib/compliance';

// In your set completion handler
const handleSetComplete = (currentSet: CompletedSet, previousSet: CompletedSet) => {
  // Build asks based on what coach recommended
  const asks: CoachAsk[] = [];

  if (state.lastAdjustmentPct !== undefined) {
    asks.push({ kind: 'weight', deltaPct: state.lastAdjustmentPct });
  }

  // Optional: add rest ask if you track it
  if (recommendedRestSec) {
    asks.push({ kind: 'rest', seconds: recommendedRestSec });
  }

  // Build snapshots
  const beforeSet: SetSnapshot = {
    loadKg: previousSet.loadKg,
    reps: previousSet.reps,
    rir: previousSet.rir,
    implementIsFixedDumbbell: isUsingDumbbells, // true if fixed dumbbells
  };

  const afterSet: SetSnapshot = {
    loadKg: currentSet.loadKg,
    reps: currentSet.reps,
    rir: currentSet.rir,
    restSec: currentSet.restSec, // if tracked
    rmsDropPct: emgData?.rmsDropPct, // if available
    rorDropPct: emgData?.rorDropPct, // if available
    implementIsFixedDumbbell: isUsingDumbbells,
  };

  // Score compliance
  const compliance = scoreCompliance(asks, beforeSet, afterSet);

  // Update state
  setState(s => ({
    ...s,
    lastCompliance: {
      listened: compliance.listened,
      score: compliance.score,
    },
  }));

  // Determine outcome
  const outcome: 'hit'|'early'|'late'|'under' = (() => {
    if (currentSet.reps >= 5 && currentSet.reps <= 6 && (currentSet.rir ?? 3) <= 2) {
      return 'hit';
    } else if (currentSet.reps < 5) {
      return 'under';
    } else if (currentSet.reps > 8) {
      return 'late';
    } else {
      return 'early';
    }
  })();

  // Lock in weight if listened or target hit
  if (compliance.listened || compliance.facets.target === 100) {
    setState(s => ({
      ...s,
      lastLockedInKg: currentSet.loadKg,
      lastOutcome: outcome,
    }));
  }

  // Show toast
  showComplianceToast(
    compliance.listened ? 'success' : 'neutral',
    {
      exercise: exerciseName,
      changePct: state.lastAdjustmentPct ?? 0,
      reps: currentSet.reps,
      rir: currentSet.rir,
      outcome,
      lockedInKg: compliance.listened ? currentSet.loadKg : undefined,
    }
  );

  // Log reasons for debugging
  console.log('[Compliance]', compliance.reasons);
};
```

### 3. Add Toast to Your UI

In your main component (e.g., TrainingScreen or App.tsx):

```typescript
import { ComplianceToast, useComplianceToast } from '@/components/ComplianceToast';

function YourComponent() {
  const { toast, showToast, dismissToast } = useComplianceToast();

  // Pass showToast to your set completion handler
  const handleSetComplete = () => {
    // ... compliance scoring ...
    showToast(mode, slots);
  };

  return (
    <>
      {/* Your existing UI */}

      {/* Toast overlay */}
      {toast && (
        <ComplianceToast
          mode={toast.mode}
          slots={toast.slots}
          onDismiss={dismissToast}
        />
      )}
    </>
  );
}
```

### 4. Add Badge to SetSummaryCard

When rendering SetSummaryCard, pass the `listened` prop:

```typescript
import { SetSummaryCard } from '@/components/coach/SetSummaryCard';

<SetSummaryCard
  summary={setSummary}
  onContinue={handleContinue}
  onAdjustWeight={handleAdjustWeight}
  onEndSession={handleEndSession}
  listened={state.lastCompliance?.listened}
/>
```

### 5. Add ClosureCard (Optional)

Show ClosureCard when a weight ask occurred and set is complete:

```typescript
import { ClosureCard } from '@/components/coach/ClosureCard';

{state.lastAdjustmentPct !== undefined && state.lastOutcome && (
  <ClosureCard
    changePct={state.lastAdjustmentPct}
    outcome={state.lastOutcome}
    lockedInKg={state.lastLockedInKg}
    exercise={exerciseName}
  />
)}
```

## API Reference

### scoreCompliance

```typescript
function scoreCompliance(
  asks: CoachAsk[],
  before: SetSnapshot,
  after: SetSnapshot
): ComplianceResult
```

**Returns:**
- `listened: boolean` - True if user followed coach (score ≥70 or self-adjusted correctly)
- `score: number` - Overall compliance score 0-100
- `reasons: string[]` - Human-readable explanations
- `facets: Record<'weight'|'target'|'emg'|'rest', number>` - Individual scores (0-100 or -1 if N/A)

### ComplianceToast

```typescript
<ComplianceToast
  mode="success" | "neutral"
  slots={{
    exercise?: string,
    changePct: number,
    reps: number,
    rir?: number,
    outcome: 'hit'|'early'|'late'|'under',
    lockedInKg?: number
  }}
  onDismiss={() => void}
  autoDismissMs={5000}
/>
```

## Testing

All tests pass:

```bash
npx vitest run src/lib/compliance.test.ts
# ✓ 34 tests passing
```

Tests cover:
- Weight adherence (barbell vs dumbbell tolerance)
- Target window (reps/RIR boundaries)
- EMG corroboration (bonus scoring)
- Rest adherence (±20% tolerance)
- Reweighting when facets are N/A
- Self-adjust success (target hit despite weight miss)
- Edge cases (zero change, small loads, empty asks)

## Accessibility

- ✅ Toast uses `role="status"` and `aria-live="polite"` for screen readers
- ✅ Badge has `aria-label="Followed coach adjustment"`
- ✅ All interactive elements have proper focus states
- ✅ Dismissible with keyboard (Escape key support via button)

## Next Steps

1. Wire up the compliance scoring in your set completion handler
2. Add the toast notification to your main training screen
3. Update any existing SetSummaryCard usages to include the `listened` prop
4. Optionally add ClosureCard for end-of-session summaries
5. Test with real workout data to ensure proper scoring

## Example Flow

1. Coach asks: "+2.5% weight"
2. User completes set: 102.5kg, 5 reps @ RIR 1
3. Compliance engine scores: 100 (weight ✓, target ✓)
4. Toast shows: "Nice! Applied +2.5%, hit 5 reps @ RIR 1 — locked in at 102.5kg."
5. SetSummaryCard displays "Listened ✓" badge
6. Weight 102.5kg is locked for next session

## Troubleshooting

**Q: Score is too low even though I followed the ask**
- Check if `implementIsFixedDumbbell` is set correctly
- Verify RIR is being captured (missing RIR defaults to 3)
- Check tolerance thresholds in `compliance.ts`

**Q: Badge not showing**
- Ensure `listened` prop is passed to SetSummaryCard
- Verify compliance scoring is being called after set completion
- Check state is being updated with `lastCompliance`

**Q: Toast not appearing**
- Ensure ComplianceToast is rendered in component tree
- Verify `showToast` is being called with correct parameters
- Check z-index (toast uses z-50)

## Support

For questions or issues, check the test file `compliance.test.ts` for examples of expected behavior.
