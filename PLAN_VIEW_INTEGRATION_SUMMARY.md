# Plan View Integration - Summary

**Date:** 2025-10-20
**Issue:** Workout plan showing too much technical detail (EMG thresholds, %MVC, policy rules)
**Solution:** Replaced with athlete-friendly `PlanViewTwoColumn` component

---

## 🎯 Problem

When clicking "Show me today's workout", users saw:

```
❌ BAD (Before):
Policy (learned today)
EMG guardrails
- Target %MVC ≥ 80
- Max RoR collapse ≤ 25%
- Symmetry ≥ 90%

Criteria: target %MVC ≥ 78; stop if RoR collapse > 30% vs rep1
Evidence (%MVC_peak, RoR_0_150, symmetry_pct, readiness): ...
Telemetry focus: %MVC_peak, RoR_0_150, symmetry_pct, fatigue_index
```

**This is the engineer view** - way too technical!

---

## ✅ Solution

Now users see:

```
✅ GOOD (After):
Today's Plan           Readiness 66 → 51

MAIN                                    Predicted Path
Heel-Elevated Front Squat  Push        Total drop: −15 R
2×3–5 • 20X1 • Rest 150s • Hold
[━━━━━━━━░░] −8 R                      ○ R = 66  START
▼ Why                                   │
                                        ○ R = 58  −8
ACCESSORY                               │
Split Squat            Solid            ● R = 51  −7  FINAL
2×6/side • 31X0 • Rest 90s • Hold
[━━━━━━░░░░] −7 R
▼ Why
```

**Athlete-friendly** - only useful training info!

---

## 📦 Files Changed

### Created (1 file)

**`src/lib/plan/convertWorkoutPlan.ts`** (130 lines)
- Converts `WorkoutPlan` (technical) → `PlanProps` (athlete-friendly)
- Hides: EMG thresholds, %MVC, policy rules, telemetry
- Shows: Exercise, effort, load, predicted drop
- Functions:
  - `convertWorkoutPlanToPlanProps(plan)` - Main converter
  - `inferEffortLevel()` - Determine Cruise/Solid/Push
  - `estimateReadinessDrop()` - Calculate predicted drop

### Modified (1 file)

**`src/screens/HomeScreen.tsx`** (+3 lines imports, -77 lines display code)

**Added imports:**
```typescript
import PlanViewTwoColumn from '../components/plan/PlanViewTwoColumn';
import { convertWorkoutPlanToPlanProps } from '../lib/plan/convertWorkoutPlan';
```

**Replaced display:**
```typescript
// Before: 77 lines of technical details
{workoutPlan && (
  <div className="space-y-3">
    {/* Policy, EMG guardrails, criteria, evidence, telemetry... */}
  </div>
)}

// After: 1 line clean component
{workoutPlan && (
  <PlanViewTwoColumn {...convertWorkoutPlanToPlanProps(workoutPlan)} />
)}
```

---

## 🔧 How the Converter Works

### Input: `WorkoutPlan` (from Gemini API)
```typescript
{
  policy: {
    readiness_bands: { heavy: 70, productive: 60, conservative: 48 },
    emg_quality_rules: { target_mvc_peak: 80, max_ror_collapse_pct: 25, min_symmetry_pct: 90 },
    rationale: "Fallback policy...",
    confidence: 0.4
  },
  plan_meta: {
    readiness: 65,
    recovery_window: "PM 90–180m",
    notes: "Default session..."
  },
  blocks: [
    {
      label: "Main Exposure",
      type: "main",
      exercise: { id: "heel_elevated_front_squat", name: "Heel-Elevated Front Squat" },
      prescription: { sets: 2, reps: "3–5", tempo: "20X1", rest_s: 150, load_adjustment: "hold" },
      criteria: { target_mvc_pct_min: 78, stop_if: ["RoR collapse > 30%", "..."] },
      evidence: { metrics: ["%MVC_peak", "RoR_0_150"], rationale: "Maintains quad bias..." }
    }
  ]
}
```

### Output: `PlanProps` (for display)
```typescript
{
  startReadiness: 65,
  finalReadiness: 51,
  path: [65, 58, 51],
  blocks: [
    {
      label: "Main",
      name: "Heel-Elevated Front Squat",
      sets: 2,
      reps: "3–5",
      tempo: "20X1",
      rest_s: 150,
      load: "hold",
      effort: "Push",              // Inferred from type + readiness
      predictedDrop: 8,             // Estimated from sets/type/load
      why: "Maintains quad bias..." // From evidence.rationale
    }
  ]
}
```

---

## 🎨 Visual Comparison

### Before (Technical View)
```
┌───────────────────────────────────────────┐
│ Policy (learned today)           conf 40% │
│ Fallback policy...                        │
│                                           │
│ Readiness 65 · Recovery PM 90–180m        │
│                                           │
│ Readiness bands    EMG guardrails         │
│ Heavy ≥ 70         Target %MVC ≥ 80       │
│ Productive ≥ 60    Max RoR ≤ 25%          │
│ Conservative ≥ 48  Symmetry ≥ 90%         │
├───────────────────────────────────────────┤
│ main                                      │
│ Main Exposure                    2 x 3–5  │
│ Heel-Elevated Front Squat                 │
│                                           │
│ Tempo: 20X1 · Rest 150s · Load: hold      │
│ Criteria: target %MVC ≥ 78; stop if...   │
│ Evidence (%MVC_peak, RoR_0_150): ...     │
│ Assumptions: Heel wedge available         │
├───────────────────────────────────────────┤
│ Alternatives                              │
│ For Main Exposure                         │
│ • Smith Front Squat — If bar path...     │
├───────────────────────────────────────────┤
│ Telemetry focus: %MVC_peak, RoR_0_150... │
└───────────────────────────────────────────┘
```

### After (Athlete View)
```
┌──────────────────────────────────┬──────────────┐
│ Today's Plan    Readiness 66 → 51│              │
├──────────────────────────────────┤ Predicted    │
│ MAIN                             │ Path         │
│ Heel-Elevated Front Squat   Push │              │
│ 2×3–5 • 20X1 • Rest 150s • Hold  │ Total drop:  │
│ [━━━━━━━━░░] −8 R                │ −15 R        │
│ ▼ Why                            │              │
│                                  │ ○ R = 66     │
│ ACCESSORY                        │ │   START    │
│ Split Squat             Solid    │ ○ R = 58     │
│ 2×6/side • 31X0 • Rest 90s       │ │   −8       │
│ [━━━━━━░░░░] −7 R                │ ● R = 51     │
│ ▼ Why                            │     −7 FINAL │
└──────────────────────────────────┴──────────────┘
```

---

## 🧮 Effort Level Logic

```typescript
function inferEffortLevel(type: string, readiness: number): EffortLevel {
  // Main lifts + high readiness = Push
  if (type === "main" && readiness >= 65) return "Push";

  // Main lifts + lower readiness = Solid
  if (type === "main") return "Solid";

  // Accessories = Solid
  if (type === "accessory") return "Solid";

  // Primers/Finishers = Cruise
  return "Cruise";
}
```

**Color coding:**
- Cruise: Emerald (easy warm-up/cool-down)
- Solid: Amber (moderate work)
- Push: Rose (hard sets) with 🔥 flame icon

---

## 📊 Readiness Drop Estimation

```typescript
function estimateReadinessDrop(sets: number, type: string, load: string): number {
  let baseDrop = sets * 3;              // 3 points per set
  if (type === "main") baseDrop += 2;   // Main lifts = +2
  if (load === "increase") baseDrop += 2; // Load increase = +2
  return Math.min(15, baseDrop);        // Cap at 15
}
```

**Examples:**
- 2 sets main, hold load: 2×3 + 2 = **8 points**
- 2 sets accessory, hold: 2×3 = **6 points**
- 3 sets main, increase: 3×3 + 2 + 2 = **13 points**

---

## ✅ What's Hidden Now

**No longer shown to athletes:**
- ❌ Policy confidence scores
- ❌ Readiness bands (Heavy/Productive/Conservative thresholds)
- ❌ EMG guardrails (target %MVC, RoR collapse %, symmetry %)
- ❌ Stop criteria with technical thresholds
- ❌ Evidence metrics (%MVC_peak, RoR_0_150, symmetry_pct, fatigue_index)
- ❌ Policy rules applied
- ❌ Telemetry focus arrays
- ❌ Signal quality expectations
- ❌ Equipment assumptions

**Now shown to athletes:**
- ✅ Exercise name
- ✅ Sets × Reps
- ✅ Tempo (e.g., "20X1")
- ✅ Rest periods (seconds)
- ✅ Load adjustment (Hold/Increase/Decrease with =/↑/↓)
- ✅ Effort level (Cruise/Solid/Push with color + icon)
- ✅ Predicted readiness drop (−N R with animated bar)
- ✅ Rationale ("Why" - collapsible)
- ✅ Readiness path (Start → Intermediate → Final)

---

## 🧪 Testing

1. **Start app:**
   ```bash
   npm run dev
   ```

2. **Navigate to home screen** with readiness test completed

3. **Click "Show me today's workout"**

4. **Verify:**
   - ✅ No EMG thresholds visible
   - ✅ No %MVC or RoR collapse percentages
   - ✅ No policy confidence scores
   - ✅ Clean two-column layout
   - ✅ Effort badges show (Cruise/Solid/Push)
   - ✅ Readiness drop bars animate
   - ✅ Predicted path on right shows steps
   - ✅ "Why" buttons expand rationale
   - ✅ Mobile responsive (columns stack)

---

## 📝 Future Enhancements

### Add Predicted Path from Gemini
Currently using estimated drops. Update when Gemini provides actual prediction:

```typescript
// In convertWorkoutPlan.ts
export function convertWorkoutPlanToPlanProps(plan: WorkoutPlan): PlanProps {
  // Use Gemini's predicted path if available
  const path = plan.predicted_path ?? calculateEstimatedPath(plan);

  return {
    startReadiness: plan.plan_meta.readiness,
    finalReadiness: path[path.length - 1],
    path,
    blocks: plan.blocks.map(b => ({
      // Use actual predicted drop from Gemini
      predictedDrop: b.predicted_drop ?? estimateReadinessDrop(...),
      // ...
    }))
  };
}
```

### Add Alternatives Panel
Show alternative exercises in a collapsible section below plan.

### Add "Accept Plan" / "Regenerate" Buttons
Allow user to regenerate if they don't like the plan.

---

## 🎯 Summary

**Problem:** Technical details (EMG thresholds, %MVC, policy rules) overwhelming athletes

**Solution:** Clean `PlanViewTwoColumn` component showing only useful training info

**Files:**
- Created: `src/lib/plan/convertWorkoutPlan.ts`
- Modified: `src/screens/HomeScreen.tsx`

**Result:** Athlete-friendly plan display with effort levels, readiness drops, and predicted path

---

**Status:** ✅ Complete
**Impact:** Significantly improved UX - athletes see only what they need to train effectively
**Code Reduction:** −74 lines of complex display logic replaced with 1 clean component call
