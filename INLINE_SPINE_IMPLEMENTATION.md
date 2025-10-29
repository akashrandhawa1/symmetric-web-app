# Inline Spine Plan View - Implementation Summary

## Overview

Replaced the two-column layout with a vertical "spine" that runs alongside plan cards, aligning nodes to each block. The spine shows the readiness path (START → ... → FINAL) with labels indicating readiness values and per-step deltas.

## Architecture

### Components Created

1. **`src/components/plan/BlockRow.tsx`**
   - Refactored plan card as a forwardRef component
   - Allows parent to measure card center Y position
   - Compact mobile-friendly design
   - Includes EffortBadge, DropChip, and CTA buttons
   - Supports "idle", "in_progress", and "logged" states

2. **`src/components/plan/PlanSpineOverlay.tsx`**
   - SVG overlay that draws vertical spine alongside cards
   - Uses ResizeObserver to track card positions
   - Automatically repositions on resize/state changes
   - Animated spine line (pathLength 0→1)
   - Animated nodes and labels with staggered delays
   - Shows:
     - R = {value} START/FINAL labels
     - −N from previous (delta calculations)
   - Color-coded dots:
     - Start: gray (`rgb(161,161,170)`)
     - Intermediate: light gray (`rgb(212,212,216)`)
     - Final: emerald (`rgb(52,211,153)`)

3. **`src/components/plan/PlanViewInlineSpine.tsx`**
   - Main component that composes BlockRow + PlanSpineOverlay
   - Creates refs for container and all blocks
   - Passes refs to overlay for position measurement
   - Single-column layout with `pl-10` gutter
   - Compact header showing start → final readiness

4. **`src/components/plan/PlanInlineSkeleton.tsx`**
   - Loading skeleton matching inline spine layout
   - Vertical spine placeholder
   - Pulsing card placeholders

5. **`src/screens/PlanInlineDemo.tsx`**
   - Demo screen with mock data
   - Shows 2-block workout plan
   - Demonstrates all features visually

## Technical Details

### Positioning Algorithm

```typescript
// Calculate card center Y relative to container
const compute = () => {
  const cRect = container.getBoundingClientRect();
  const pts = blockRefs.map(ref => {
    const el = ref.current;
    if (!el) return { x: gutter, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: gutter, y: (r.top + r.bottom) / 2 - cRect.top };
  });
  setPoints(pts);
  setHeight(container.clientHeight);
};
```

### Responsive Updates

- **ResizeObserver**: Watches container + all cards
- **Window resize**: Recomputes on viewport change
- **Dependency array**: Recomputes when blocks change

### Animation

- **Spine line**: `pathLength` 0→1 over 0.35s
- **Nodes**: Scale 0→1, staggered by 0.08s
- **Labels**: Fade in, staggered by 0.08s + 0.1s offset

## Integration

### HomeScreen Updated

```typescript
// Before
import PlanViewTwoColumn, { PlanSkeleton } from '../components/plan/PlanViewTwoColumn';

// After
import PlanViewInlineSpine from '../components/plan/PlanViewInlineSpine';
import { PlanInlineSkeleton } from '../components/plan/PlanInlineSkeleton';

// Usage
{isWorkoutLoading && <PlanInlineSkeleton />}
{!isWorkoutLoading && workoutPlan && (
  <PlanViewInlineSpine {...convertWorkoutPlanToPlanProps(workoutPlan)} />
)}
```

### Exports Added

```typescript
// src/screens.tsx
export { default as PlanInlineDemo } from './screens/PlanInlineDemo';
```

## Design Principles

### Mobile-First
- Single column layout
- Compact spacing (`space-y-2`, `p-2.5`)
- Small fonts (`text-[10px]`, `text-xs`)
- No horizontal scroll

### No Side Panel
- Spine runs inline with cards
- Scrolls naturally with content
- No modal/overlay required

### Accessibility
- SVG overlay is `aria-hidden`
- Semantic info in header/cards
- All buttons are `type="button"`
- Proper ARIA labels on interactive elements

### Clean Information
- No EMG thresholds shown
- No sensor data displayed
- Athlete-friendly labels only
- Clear readiness path visualization

## Acceptance Criteria ✅

- [x] Cards render in single column with visible vertical spine
- [x] Dots align vertically to each card's center
- [x] Labels show R = {value} (START/FINAL)
- [x] Delta labels show −N from previous (except START)
- [x] Spine animates in (line pathLength 0→1, nodes/labels fade)
- [x] Repositions correctly on card expand/collapse
- [x] Repositions correctly on window resize
- [x] No modal/side panel remains
- [x] Path is inline and scrolls with list
- [x] No EMG/sensor thresholds appear

## Files Modified

### Created
- `src/components/plan/BlockRow.tsx` (120 lines)
- `src/components/plan/PlanSpineOverlay.tsx` (105 lines)
- `src/components/plan/PlanViewInlineSpine.tsx` (39 lines)
- `src/components/plan/PlanInlineSkeleton.tsx` (14 lines)
- `src/screens/PlanInlineDemo.tsx` (51 lines)
- `INLINE_SPINE_IMPLEMENTATION.md` (this file)

### Modified
- `src/screens/HomeScreen.tsx` (updated imports and component usage)
- `src/screens.tsx` (added PlanInlineDemo export)

## Types Used

```typescript
export type EffortLevel = "Cruise" | "Solid" | "Push";

export type PlanBlock = {
  label: "Main" | "Accessory" | "Primer" | "Finisher";
  name: string;
  sets: number;
  reps: string;
  tempo?: string;
  rest_s?: number;
  load: "increase" | "hold" | "decrease" | "n/a";
  effort: EffortLevel;
  predictedDrop: number;
  why?: string;
  ctaState?: "idle" | "in_progress" | "logged";
};

export type PlanProps = {
  startReadiness: number;
  finalReadiness: number;
  path: number[];
  blocks: PlanBlock[];
  confidence?: number;
};
```

## Next Steps

To view the demo:
1. Navigate to the PlanInlineDemo screen
2. Observe the vertical spine aligning with card centers
3. Resize window to verify repositioning
4. Click "Why" to expand cards and verify spine updates

The inline spine view is now the default in HomeScreen when workout plans are loaded.
