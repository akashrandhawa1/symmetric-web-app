# PlanViewTwoColumn Component - Implementation Summary

**Date:** 2025-10-20
**Status:** ✅ Complete

---

## 📋 What Was Built

A reusable two-column plan view component that displays Gemini-generated workout plans with:
- **Left Column:** Exercise blocks with effort levels, load adjustments, and predicted readiness drops
- **Right Column:** Vertical readiness path stepper showing progression through session

**Athlete-friendly design** - No sensor thresholds, only intuitive training metrics.

---

## 📦 Files Created

### 1. **Types & Mapper** (`src/types/plan.ts`) - 87 lines

**Exports:**
```typescript
type EffortLevel = "Cruise" | "Solid" | "Push"
type PlanBlock = { ... }
type PlanProps = { ... }
type GeminiAthleteView = { ... }
function mapAthleteViewToProps(av: GeminiAthleteView): PlanProps
```

**Key Types:**
- `PlanBlock` - Single exercise with sets, reps, tempo, rest, load, effort, predicted drop
- `PlanProps` - Component props (startReadiness, finalReadiness, path, blocks)
- `GeminiAthleteView` - Expected Gemini JSON structure
- `mapAthleteViewToProps()` - Converter function

### 2. **Component** (`src/components/plan/PlanViewTwoColumn.tsx`) - 247 lines

**Sub-components:**
- `EffortBadge` - Colored badge (Cruise/Solid/Push) with flame icon
- `ReadinessDropBar` - Animated horizontal bar showing predicted drop (−N R)
- `MetaLine` - Sets×Reps • Tempo • Rest • Load
- `BlockRow` - Full exercise block with collapsible "Why" rationale
- `PredictedPathPanel` - Vertical stepper (Right column)
- `PlanViewTwoColumn` - Main component (exports default)

**Features:**
- Framer Motion animations on drop bars
- Collapsible rationale with ChevronDown icon
- Responsive grid layout (single column on mobile)
- Accessibility: ARIA labels, semantic HTML
- Color-coded effort levels:
  - Cruise: Emerald (easy)
  - Solid: Amber (moderate)
  - Push: Rose (hard) with flame icon

**Visual Design:**
- Dark theme with zinc/slate colors
- Rounded corners (rounded-2xl)
- Ring borders (ring-1 ring-zinc-800)
- Gradient backgrounds
- Smooth transitions

### 3. **Demo Screen** (`src/screens/PlanDemo.tsx`) - 166 lines

**Mock Data Scenarios:**
1. **Default:** 2-block session (Main + Accessory)
2. **Full Session:** 4-block (Primer + Main + Accessory + Finisher)
3. **Short Session:** Single main lift

**Features:**
- Header with description
- Component preview
- Developer notes section
- Collapsible additional scenarios
- Live examples with different readiness ranges

### 4. **Gemini Mapper** (`src/lib/plan/mapFromGemini.ts`) - 73 lines

**Functions:**
```typescript
planPropsFromGemini(json: unknown): PlanProps
hasAthleteView(json: unknown): boolean
tryPlanPropsFromGemini(json: unknown): PlanProps | null
```

**Usage:**
```typescript
const geminiResponse = await fetchGeminiPlan(...);
const planProps = planPropsFromGemini(geminiResponse);
return <PlanViewTwoColumn {...planProps} />;
```

**Error Handling:**
- Throws if `athlete_view` missing
- Type validation helpers
- Try/catch wrapper for safe parsing

### 5. **Demo Entry Point** (`src/plan-demo-entry.tsx`) - 22 lines

React StrictMode entry for standalone demo.

### 6. **Demo HTML** (`plan-demo.html`) - 42 lines

Standalone HTML file for `/plan-demo.html` route.

---

## 🎨 Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Today's Plan          Readiness 66 → 51                    │
├──────────────────────────────────┬──────────────────────────┤
│                                  │  Predicted Path          │
│  MAIN                            │  Total drop: −15 R       │
│  Heel-Elevated Front Squat  Push│                          │
│  2×3–5 • 20X1 • Rest 150s • =   │  ○ R = 66  START         │
│  [━━━━━━━━░░] −8 R              │  │                        │
│  ▼ Why                           │  ○ R = 58  −8            │
│                                  │  │                        │
│  ACCESSORY                       │  ● R = 51  −7  FINAL     │
│  Split Squat            Solid   │                          │
│  2×6/side • 31X0 • Rest 90s • = │                          │
│  [━━━━━━░░░░] −7 R              │                          │
│  ▼ Why                           │                          │
└──────────────────────────────────┴──────────────────────────┘
```

---

## 🔧 Integration Guide

### Step 1: Import Components

```typescript
import PlanViewTwoColumn from '@/components/plan/PlanViewTwoColumn';
import { planPropsFromGemini } from '@/lib/plan/mapFromGemini';
import type { PlanProps } from '@/types/plan';
```

### Step 2: Fetch Gemini Plan

```typescript
// Your Gemini API call (to be implemented)
const geminiResponse = await fetchSessionPlan({
  userId: 'user123',
  startReadiness: 66,
  goal: 'quad_strength',
  equipmentAvailable: ['barbell', 'dumbbell'],
});

// Expected Gemini response shape:
{
  "athlete_view": {
    "plan_meta": {
      "start_readiness": 66,
      "target_readiness": 50,
      "predicted_path": [66, 58, 51],
      "final_readiness": 51,
      "confidence": 0.82
    },
    "blocks": [
      {
        "label": "Main",
        "name": "Heel-Elevated Front Squat",
        "prescription": {
          "sets": 2,
          "reps": "3–5",
          "tempo": "20X1",
          "rest_s": 150,
          "load": "hold"
        },
        "effort": "Push",
        "predicted_drop": 8,
        "cues": ["Bar tight on delts", "Drive knees forward"],
        "why": "Quad bias with crisp reps; efficient path to target."
      }
    ],
    "alt_main": {
      "name": "Back Squat",
      "when_to_use": "If wrist mobility is limited today."
    }
  }
}
```

### Step 3: Convert and Render

```typescript
function SessionPlanScreen() {
  const [plan, setPlan] = useState<PlanProps | null>(null);
  const [loading, setLoading] = useState(false);

  const loadPlan = async () => {
    setLoading(true);
    try {
      const geminiResponse = await fetchSessionPlan(...);
      const planProps = planPropsFromGemini(geminiResponse);
      setPlan(planProps);
    } catch (error) {
      console.error('Failed to load plan:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, []);

  if (loading) return <div>Loading plan...</div>;
  if (!plan) return <div>No plan available</div>;

  return <PlanViewTwoColumn {...plan} />;
}
```

---

## 🧪 Testing

### Manual Testing

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to demo:**
   ```
   http://localhost:5173/plan-demo.html
   ```

3. **Verify:**
   - ✅ Left column shows 2 exercise blocks
   - ✅ Each block has effort badge (Push/Solid)
   - ✅ Readiness drop bars animate on load
   - ✅ Click "Why" buttons to expand rationale
   - ✅ Right column shows readiness path (66 → 58 → 51)
   - ✅ Total drop shows −15 R
   - ✅ Responsive layout on mobile (columns stack)

4. **Expand additional scenarios:**
   - Full session (4 blocks)
   - Short session (1 block)

### Automated Testing

```typescript
import { planPropsFromGemini } from '@/lib/plan/mapFromGemini';

test('converts Gemini athlete_view to PlanProps', () => {
  const geminiJson = {
    athlete_view: {
      plan_meta: {
        start_readiness: 70,
        final_readiness: 55,
        predicted_path: [70, 55],
      },
      blocks: [{
        label: "Main",
        name: "Back Squat",
        prescription: { sets: 3, reps: "5", tempo: "20X1", rest_s: 180, load: "increase" },
        effort: "Push",
        predicted_drop: 15,
      }]
    }
  };

  const props = planPropsFromGemini(geminiJson);

  expect(props.startReadiness).toBe(70);
  expect(props.finalReadiness).toBe(55);
  expect(props.blocks.length).toBe(1);
  expect(props.blocks[0].name).toBe("Back Squat");
});
```

---

## 📊 Effort Level Color Coding

| Effort | Color | Icon | Use Case |
|--------|-------|------|----------|
| **Cruise** | Emerald | None | Warm-up, primers, recovery work |
| **Solid** | Amber | 🔥 | Accessories, moderate intensity |
| **Push** | Rose | 🔥 | Main lifts, hard sets, strength work |

---

## 🎯 Readiness Drop Bar Logic

```typescript
// Visual width calculation
const w = Math.max(6, Math.min(100, (drop / maxDrop) * 100));

// Color thresholds
const color = drop >= 8 ? "bg-rose-400"      // High drop (hard work)
            : drop >= 5 ? "bg-amber-400"     // Moderate drop
            : "bg-emerald-400";              // Low drop (easy work)
```

**Examples:**
- Drop 3 pts → Emerald bar (6% width)
- Drop 7 pts → Amber bar (58% width)
- Drop 10 pts → Rose bar (83% width)

---

## 🔌 Gemini Integration Checklist

- [ ] Create Gemini API endpoint for session planning
- [ ] Define system prompt for plan generation
- [ ] Add Zod schema validation for `athlete_view`
- [ ] Implement `fetchSessionPlan()` function
- [ ] Wire into pre-session flow (after readiness test)
- [ ] Add loading states and error handling
- [ ] Store plan in session state
- [ ] Add "Regenerate Plan" option
- [ ] Track user acceptance/rejection analytics

---

## 📝 Related Files

### Modified:
- `src/screens.tsx` (+1 line) - Export PlanDemo

### Created:
- `src/types/plan.ts` (87 lines)
- `src/components/plan/PlanViewTwoColumn.tsx` (247 lines)
- `src/screens/PlanDemo.tsx` (166 lines)
- `src/lib/plan/mapFromGemini.ts` (73 lines)
- `src/plan-demo-entry.tsx` (22 lines)
- `plan-demo.html` (42 lines)

**Total:** ~640 lines of production code + documentation

---

## 🚀 Next Steps

1. **Implement Gemini API:**
   - Create `fetchSessionPlan()` in `services.ts`
   - Add Zod validation schema
   - Handle API errors with fallback plans

2. **Wire into App Flow:**
   - Show plan after readiness test
   - Add "Accept Plan" → Start Training
   - Add "Regenerate Plan" button

3. **Enhancements:**
   - Add alternative exercises panel
   - Allow manual block editing
   - Save/share plans
   - Track plan adherence

---

## ✅ Acceptance Criteria

- [x] Build starts with no TS errors
- [x] `/plan-demo.html` shows two-column layout
- [x] Left column has exercise blocks with effort badges
- [x] Readiness drop bars display correctly
- [x] Right column shows predicted path stepper
- [x] Total drop calculation is accurate
- [x] "Why" rationale is collapsible
- [x] Component accepts Gemini output via `planPropsFromGemini()`
- [x] No sensor thresholds in UI
- [x] Mobile responsive
- [x] Accessible (ARIA labels, semantic HTML)

---

**Status:** ✅ Production-ready
**Demo:** `/plan-demo.html`
**Ready for:** Gemini API integration
