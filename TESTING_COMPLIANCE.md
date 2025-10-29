# How to Test the Compliance Engine

## Quick Start - Interactive Demo

I've created an **interactive demo screen** where you can test all compliance scenarios with one click!

### Option 1: Add Demo Screen to App (Easiest)

1. **Add 'complianceDemo' to Screen type** in `src/types.ts`:
   ```typescript
   export type Screen =
     | 'splash'
     | 'intro'
     // ... other screens
     | 'complianceDemo'  // ← Add this
     | 'ready';
   ```

2. **Import the demo screen** in `src/App.tsx`:
   ```typescript
   import {
     // ... other imports
     ComplianceDemoScreen,
   } from './screens';
   ```

3. **Add the case to renderScreen()** in `src/App.tsx`:
   ```typescript
   const renderScreen = (): JSX.Element => {
     switch (appState.screen) {
       // ... other cases
       case "complianceDemo":
         return <ComplianceDemoScreen onBack={() => updateAppScreen("ready")} />;
       // ... rest
     }
   };
   ```

4. **Add a test button somewhere** (e.g., in HomeScreen or a dev menu):
   ```typescript
   <button onClick={() => updateAppScreen('complianceDemo')}>
     Test Compliance Engine
   </button>
   ```

5. **Run the app** and click "Test Compliance Engine"!

### Option 2: Quick Console Test (No UI Changes)

Open your browser console and run:

```javascript
// Import the function
import { scoreCompliance } from './src/lib/compliance';

// Test scenario: Perfect compliance
const result = scoreCompliance(
  [{ kind: 'weight', deltaPct: 2.5 }],
  { loadKg: 100, reps: 6, rir: 2 },
  { loadKg: 102.5, reps: 5, rir: 1 }
);

console.log('Listened?', result.listened);  // true
console.log('Score:', result.score);        // 100
console.log('Reasons:', result.reasons);
```

## Interactive Demo Features

The demo screen includes **7 test scenarios**:

1. ✅ **Perfect Compliance** - Applied +2.5%, hit target
2. ✅ **Self-Adjust Success** - Kept weight but hit target (good instinct)
3. ❌ **Wrong Weight + Missed** - Went too heavy and failed
4. ⚠️ **Went Too Light** - Applied change but had reps left
5. 💪 **With EMG Data** - Perfect with physiological validation
6. 🏋️ **Dumbbell Tolerance** - Fixed dumbbell nearest size
7. ⏱️ **Weight + Rest** - Multiple asks at once

### What You'll See

For each scenario:
- **Overall score** (0-100) and listened/not listened status
- **Facet breakdown** (weight, target, EMG, rest)
- **Detailed reasons** explaining each facet
- **Toast notification** at the top (success or neutral with suggestions)
- **Before/After comparison** of the sets

### Screenshots

**When you click a scenario:**
- Large score card shows "✅ Listened" or "❌ Did Not Listen"
- Individual facet scores (Weight: 100, Target: 100, EMG: 100, Rest: N/A)
- Detailed breakdown with checkmarks/X marks
- Toast pops up at top with coaching message

## Testing in Real Training

To test during an actual workout:

### Step 1: Wire Up in Your Set Completion Handler

In `src/App.tsx`, find `handleEndSet` and add:

```typescript
import { scoreCompliance } from './lib/compliance';

const handleEndSet = useCallback((options) => {
  // ... existing code ...

  // After you compute the completed set:
  if (lastAdjustmentPct !== undefined) {
    const compliance = scoreCompliance(
      [{ kind: 'weight', deltaPct: lastAdjustmentPct }],
      {
        loadKg: previousLoad,
        reps: previousReps,
        rir: previousRir
      },
      {
        loadKg: sessionData.currentLoadKg,
        reps: sessionData.reps.length,
        rir: estimatedRIR
      }
    );

    console.log('🎯 Compliance:', compliance);
    console.log('   Listened:', compliance.listened);
    console.log('   Score:', compliance.score);
    console.log('   Reasons:', compliance.reasons);
  }
}, [/* deps */]);
```

### Step 2: Check Browser Console

During your workout, after each set:
1. Open browser DevTools (F12)
2. Look for "🎯 Compliance:" logs
3. See the real-time scoring!

## Manual Test Cases

Try these manually in the demo or real app:

### Test 1: Perfect Weight Change
```
Coach asks: +2.5%
Before: 100kg, 6 reps, RIR 2
After: 102.5kg, 5 reps, RIR 1
Expected: ✅ Listened (score: 100)
```

### Test 2: Self-Corrected
```
Coach asks: -5%
Before: 100kg, 3 reps, RIR 0 (too heavy)
After: 100kg, 5 reps, RIR 1 (kept same, hit target)
Expected: ✅ Listened (self-adjust success)
```

### Test 3: Ignored and Failed
```
Coach asks: +2.5%
Before: 100kg, 6 reps, RIR 2
After: 110kg, 3 reps, RIR 0 (went way too heavy)
Expected: ❌ Not Listened (score: <70)
```

### Test 4: Dumbbell Tolerance
```
Coach asks: +5%
Before: 20kg dumbbells, 6 reps, RIR 2
After: 22.5kg (nearest size), 5 reps, RIR 1
Expected: ✅ Listened (within tolerance)
```

## Expected Behavior

### Success Toast (listened=true)
```
"Nice! Applied +2.5%, hit 5 reps @ RIR 1 — locked in at 102.5kg."
```

### Neutral Toast (listened=false)
```
"Still fresh at rep 7 — try +2.5% or aim for 5-6 reps."
"Fatigue hit at rep 3 — try -2.5% next set for 5-6 reps."
```

### Badge on SetSummaryCard
When `listened={true}` is passed:
```html
<span>Listened ✓</span>
```

## Troubleshooting

### Demo screen won't show
- Make sure you added 'complianceDemo' to the Screen type
- Check that ComplianceDemoScreen is imported in App.tsx
- Verify the case is added to renderScreen()

### Toast not appearing in demo
- Toast should appear at top-center when you click a scenario
- Auto-dismisses after 8 seconds
- Click the × to dismiss manually

### Scores seem wrong
- Check the test file for expected behavior: `src/lib/compliance.test.ts`
- Verify RIR is provided (missing RIR defaults to 3)
- Check equipment type (dumbbell vs barbell affects tolerance)

## Next Steps

After testing the demo:

1. **Add to real workout flow** - Wire into `handleEndSet`
2. **Add toast to UI** - Import and render `ComplianceToast`
3. **Add badge** - Pass `listened` prop to `SetSummaryCard`
4. **Track state** - Store `lastCompliance` in exercise state
5. **Lock weights** - Use locked weight for next session

See `COMPLIANCE_INTEGRATION.md` for full integration guide.

## Quick Visual Test Checklist

- [ ] Demo screen loads and shows 7 scenarios
- [ ] Clicking a scenario shows results
- [ ] Toast appears at top with appropriate message
- [ ] Score card shows listened/not listened status
- [ ] Facet breakdown shows individual scores
- [ ] Reasons list explains each facet
- [ ] Success scenarios show green toast
- [ ] Miss scenarios show blue toast with suggestions
- [ ] Before/after comparison displays correctly

---

**Tip:** The demo is perfect for showing the feature to teammates or for quick regression testing after changes!
