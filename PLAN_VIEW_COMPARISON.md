# Plan View Components - Feature Comparison

## Available Implementations

You now have **three** production-ready plan view components to choose from:

### 1. PlanViewTwoColumn (Original - Desktop Focus)
**File:** `src/components/plan/PlanViewTwoColumn.tsx`

**Layout:**
- Two-column grid on desktop (`lg:grid-cols-[1fr,240px]`)
- Left: Exercise cards
- Right: Predicted path panel (sticky)
- Mobile: Stacks vertically (cards → path)

**Best For:**
- Desktop-first applications
- When path panel needs to be always visible
- Traditional two-column layouts

**Tradeoffs:**
- Takes more horizontal space
- Path panel separate from cards
- More vertical scrolling on mobile

---

### 2. PlanViewInlineSpine (Left Spine)
**File:** `src/components/plan/PlanViewInlineSpine.tsx`

**Layout:**
- Single column with left gutter (`pl-10`)
- Vertical spine on left side
- Nodes align to card centers
- Labels show on right of spine
- Works on all screen sizes

**Best For:**
- Consistent mobile/desktop experience
- Visual timeline feel
- When you want spine integrated with cards

**Tradeoffs:**
- Left gutter takes space from cards
- All labels visible (can be busy)
- Spine always shows (no mobile hide)

**Key Features:**
- SVG spine with animated line
- Nodes: START → ... → FINAL
- Full readiness labels per node
- Delta labels (−N from previous)

---

### 3. PlanViewWithRightSpine (Right Spine - Current)
**File:** `src/components/plan/PlanViewWithRightSpine.tsx`

**Layout:**
- Single column with right gutter (`md:pr-40`, desktop only)
- Vertical spine on right side
- Nodes align to card centers
- Compact progress bars + labels
- Mobile: Spine hidden, cards use inline chips

**Best For:**
- Desktop enhancement with mobile fallback
- Clean card layout (no left gutter)
- When you want visual timeline on desktop only

**Tradeoffs:**
- Desktop-only feature (hidden on mobile)
- Right gutter reduces card width on desktop
- Less detailed than inline spine labels

**Key Features:**
- SVG spine with animated line
- Mini progress bars (color-coded by severity)
- Compact labels (R = 65, −8 R)
- Hidden on mobile (`hidden md:block`)
- ResizeObserver for dynamic positioning

---

## Feature Matrix

| Feature | TwoColumn | InlineSpine | RightSpine |
|---------|-----------|-------------|------------|
| **Mobile Support** | ✅ Stacks | ✅ Full | ✅ Fallback |
| **Desktop Layout** | Two-column | Left spine | Right spine |
| **Spine Animation** | ❌ | ✅ | ✅ |
| **Progress Bars** | ❌ | ✅ Small | ✅ Mini bars |
| **Readiness Labels** | Separate panel | ✅ Full | ✅ Compact |
| **Card Gutter** | None | Left (pl-10) | Right (md:pr-40) |
| **Responsive Realign** | ❌ | ✅ | ✅ |
| **Always Visible Path** | ✅ (panel) | ✅ (inline) | Desktop only |

---

## Visual Comparison

### Two-Column Layout
```
┌─────────────────────────────────────────────┐
│ Header: Today's Plan        R 65 → 51       │
├────────────────────────┬────────────────────┤
│ MAIN                   │ Predicted Path     │
│ Exercise Name   Push   │                    │
│ 2×3-5 • 20X1 • 150s    │ Total drop: −14 R  │
│ −8 R [========  ]      │                    │
│                        │ ○ R = 65 START     │
│ ACCESSORY              │ │                  │
│ Exercise Name   Solid  │ ○ R = 57           │
│ 2×6/side • 31X0 • 90s  │ │ −8 from previous │
│ −6 R [======    ]      │ │                  │
│                        │ ● R = 51 FINAL     │
│                        │   −6 from previous │
└────────────────────────┴────────────────────┘
```

### Inline Spine (Left)
```
┌──────────────────────────────────────────────┐
│ Header: Today's Plan         R 65 → 51       │
├──────────────────────────────────────────────┤
│          MAIN                                │
│ ○ R=65   Exercise Name            Push       │
│ START    2×3-5 • 20X1 • 150s                 │
│ │        −8 R [========  ]                   │
│ │                                            │
│ ○ R=57   ACCESSORY                           │
│ −8       Exercise Name            Solid      │
│ │        2×6/side • 31X0 • 90s               │
│ │        −6 R [======    ]                   │
│ │                                            │
│ ● R=51                                       │
│ FINAL                                        │
│ −6                                           │
└──────────────────────────────────────────────┘
```

### Right Spine (Current)
```
┌──────────────────────────────────────────────┐
│ Header: Today's Plan         R 65 → 51       │
├──────────────────────────────────────────────┤
│ MAIN                              R=65 ○     │
│ Exercise Name            Push     START│     │
│ 2×3-5 • 20X1 • 150s                   │     │
│ −8 R [========  ]                     │     │
│                                       │     │
│ ACCESSORY                         R=57○     │
│ Exercise Name            Solid     −8 │[▓▓] │
│ 2×6/side • 31X0 • 90s                 │−8 R │
│ −6 R [======    ]                     │     │
│                                       │     │
│                                   R=51●     │
│                                  FINAL−6 R  │
└──────────────────────────────────────────────┘
```

---

## Usage Examples

### Switch to Two-Column
```typescript
import PlanViewTwoColumn from '../components/plan/PlanViewTwoColumn';

<PlanViewTwoColumn {...convertWorkoutPlanToPlanProps(workoutPlan)} />
```

### Switch to Left Inline Spine
```typescript
import PlanViewInlineSpine from '../components/plan/PlanViewInlineSpine';

<PlanViewInlineSpine {...convertWorkoutPlanToPlanProps(workoutPlan)} />
```

### Switch to Right Spine (Current)
```typescript
import PlanViewWithRightSpine from '../components/plan/PlanViewWithRightSpine';

<PlanViewWithRightSpine {...convertWorkoutPlanToPlanProps(workoutPlan)} />
```

---

## Recommendation Guide

### Choose **TwoColumn** if:
- Desktop is primary platform
- You want traditional layout
- Path panel should be always visible
- You don't need timeline visualization

### Choose **InlineSpine** if:
- Mobile and desktop are equally important
- You want consistent experience across devices
- Timeline feel is important
- You want maximum readiness detail

### Choose **RightSpine** if:
- Desktop enhancement is desired
- Mobile users get simpler view (inline chips)
- Clean card layout is priority
- Visual timeline only needed on desktop

---

## Performance Notes

All three implementations:
- ✅ Use framer-motion for smooth animations
- ✅ Support ResizeObserver for dynamic layouts
- ✅ Properly handle card expansion ("Why" sections)
- ✅ Are accessible (aria-hidden on decorative elements)
- ✅ Build successfully with no errors
- ✅ Use same type system (`PlanProps`)

---

## Current Configuration

**HomeScreen** is currently using: **PlanViewWithRightSpine**

To change, simply update the import in `src/screens/HomeScreen.tsx`:

```typescript
// Line 8:
import PlanViewWithRightSpine from '../components/plan/PlanViewWithRightSpine';

// Line 967:
<PlanViewWithRightSpine {...convertWorkoutPlanToPlanProps(workoutPlan)} />
```

All three are production-ready! Choose based on your UX priorities. 🎯
