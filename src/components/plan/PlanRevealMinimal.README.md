# Plan Reveal (Minimal)

A mobile-first, minimal plan reveal screen that mirrors Ladder/Fitbod simplicity.

## Features

✅ **Mobile-First Design**: Optimized for 375–430px width with safe-area insets
✅ **Fully Prop-Driven**: Zero hardcoded plan text in the component
✅ **Dark Premium Look**: Gradient background, translucent cards, high contrast
✅ **Subtle Spring Animations**: Fast, clean entrance animations (~200-300ms)
✅ **Accessible**: Semantic HTML, focus-visible styles, touch targets ≥44px
✅ **Phase Status Indicators**: Active, upcoming, and completed states
✅ **Constraint Pills**: Tappable pills with explanations
✅ **Readiness-Aware CTA**: Dynamic subtext based on current readiness
✅ **Equipment Mismatch Warning**: Alerts user when equipment doesn't match plan

## Usage

### Basic Example

\`\`\`tsx
import PlanRevealMinimal from './components/plan/PlanRevealMinimal';

<PlanRevealMinimal
  eyebrow="Ready for you"
  title="Lower-Body Strength Plan"
  why="Build explosive power for football, while protecting your knees."
  summary={{
    sport: "Football QB",
    sportEmoji: "🏈",
    weeks: 4,
    daysPerWeek: 3,
    sessionMinutes: 45,
    setting: "Bodyweight only"
  }}
  constraints={[
    {
      label: "Protect knees",
      explanation: "We'll limit squat depth and avoid excessive knee flexion.",
      severity: "warning"
    }
  ]}
  phases={[
    {
      title: "Foundation",
      weekRange: "Weeks 1–2",
      focus: "Build movement patterns and baseline strength.",
      outcome: "You'll feel confident in your squat mechanics.",
      status: "active"
    },
    {
      title: "Power Development",
      weekRange: "Weeks 3–4",
      focus: "Add explosive variations and plyometric progressions.",
      outcome: "You'll feel faster and more explosive.",
      status: "upcoming"
    }
  ]}
  cta={{
    label: "Start My Program",
    subtext: "Adapts to your readiness",
    currentReadiness: 85
  }}
  onStart={() => console.log("Starting program")}
/>
\`\`\`

## Component Props

### `PlanRevealMinimalProps`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `eyebrow` | `string` | No | Optional eyebrow text (e.g., "Ready for you") |
| `title` | `string` | Yes | Bold plan title (e.g., "Lower-body Strength Plan") |
| `why` | `string` | Yes | One sentence explaining motivation and constraints |
| `summary` | `PlanSummary` | Yes | Plan summary with weeks, days, duration, setting |
| `constraints` | `Constraint[]` | No | Optional array of safety constraints |
| `phases` | `Phase[]` | Yes | Array of training phases (typically 2-3) |
| `nextSession` | `NextSession` | No | Optional next session preview |
| `cta` | `CTAConfig` | Yes | CTA button label and subtext |
| `onStart` | `() => void` | Yes | Callback when user clicks Start button |
| `onHelpClick` | `() => void` | No | Optional callback for help link |

### `PlanSummary`

| Field | Type | Description |
|-------|------|-------------|
| `sport` | `string?` | Sport/activity name (e.g., "Football QB") |
| `sportEmoji` | `string?` | Emoji representing sport (e.g., "🏈") |
| `weeks` | `number` | Number of weeks in plan |
| `daysPerWeek` | `number` | Training days per week |
| `sessionMinutes` | `number` | Session duration in minutes |
| `setting` | `string` | Equipment setting (e.g., "Bodyweight only", "Full gym") |
| `hasEquipmentMismatch` | `boolean?` | Whether there's an equipment mismatch |
| `equipmentMismatchMessage` | `string?` | Message explaining mismatch |

### `Phase`

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Phase name (e.g., "Foundation") |
| `weekRange` | `string` | Week range (e.g., "Weeks 1–2") |
| `focus` | `string` | One sentence describing phase focus |
| `outcome` | `string?` | Optional outcome ("You'll feel...") |
| `status` | `'active' \| 'upcoming' \| 'completed'` | Current phase status |

### `Constraint`

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | Short constraint label (e.g., "Protect knees") |
| `explanation` | `string?` | Detailed explanation (shows on tap) |
| `severity` | `'warning' \| 'info'?` | Severity level (affects styling) |

### `CTAConfig`

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | Button text (e.g., "Start My Program") |
| `subtext` | `string` | Text below button |
| `currentReadiness` | `number?` | Optional readiness score (adapts subtext) |

## Accessing the Demo

Visit the demo at:

\`\`\`
http://localhost:3000/?demo=plan-minimal
\`\`\`

The demo includes two examples:
1. **Football QB**: Bodyweight plan with knee constraints
2. **Powerlifting**: Full gym access with 3 phases

Toggle between examples using the buttons in the top-right corner.

## Design Decisions

### What Was Removed (vs. earlier versions)
- ❌ Individual rows for "Goal focus", "Weeks", "Days/week", "Session length"
  - ✅ Replaced with one compact summary line
- ❌ "Block 1 / Block 2" numbering
  - ✅ Use phase titles with week ranges instead
- ❌ Long "What to expect" paragraphs
  - ✅ Compressed to one sentence or two short bullets
- ❌ Secondary/back actions
  - ✅ Keep only the primary CTA

### What Was Added
- ✅ Phase status indicators (active/upcoming/completed)
- ✅ Readiness-aware CTA subtext
- ✅ Tappable constraint pills with explanations
- ✅ Equipment mismatch warnings
- ✅ Progress dots (intake → plan → start)
- ✅ Optional help link at bottom
- ✅ Next session preview with exercise names

## File Structure

\`\`\`
src/components/plan/
├── PlanRevealMinimal.tsx              # Main component
├── PlanRevealMinimal.types.ts         # TypeScript types
├── PhaseCard.tsx                      # Phase card subcomponent
├── PlanSummaryLine.tsx                # Summary line subcomponent
├── ConstraintPill.tsx                 # Constraint pill subcomponent
└── PlanRevealMinimal.README.md        # This file

src/screens/
└── PlanRevealMinimalDemo.tsx          # Demo screen with examples
\`\`\`

## Animation Details

- **Container**: Staggered children with 0.08s delay between items
- **Items**: Fade + slide (8px) with spring physics (stiffness: 400, damping: 25)
- **CTA**: Gentle pop on mount with 0.4s delay
- **Duration**: ~200-300ms per item for smooth 60fps on mobile

## Accessibility

- ✅ Semantic HTML with proper heading hierarchy
- ✅ Focus-visible styles on all interactive elements
- ✅ Touch targets minimum 44px height
- ✅ ARIA labels on constraint buttons
- ✅ Backdrop for constraint popover (dismissible)

## Mobile Considerations

- Safe area insets respected (iOS notch, home indicator)
- Sticky CTA with backdrop blur
- 375–430px width optimization
- Touch-friendly spacing and tap targets
- Prevents CTA overlap with content (padding-bottom on scroll container)

## Integration Notes

To integrate this component into your app:

1. Import the component where you want to show the plan reveal
2. Map your plan data to the `PlanRevealMinimalProps` interface
3. Handle the `onStart` callback to navigate to the first workout
4. Optionally handle `onHelpClick` to open support/chat

Example mapping from your intake data:

\`\`\`tsx
const planProps: PlanRevealMinimalProps = {
  title: `${profile.goal_intent} Plan`,
  why: `Build ${profile.motivation} for ${profile.sport}, while protecting your ${profile.constraints}.`,
  summary: {
    sport: profile.sport_role,
    weeks: profile.timeline === '<2 weeks' ? 2 : 4,
    daysPerWeek: parseInt(profile.frequency),
    sessionMinutes: parseInt(profile.session_length),
    setting: profile.environment,
  },
  constraints: profile.constraints !== 'none' ? [
    {
      label: \`Protect \${profile.constraints}\`,
      explanation: "We'll adjust exercise selection and loading.",
      severity: 'warning'
    }
  ] : [],
  phases: profile.planSummary.blocks.map((block, index) => ({
    title: block.name,
    weekRange: \`Weeks \${block.weekStart}–\${block.weekEnd}\`,
    focus: block.objective,
    status: index === 0 ? 'active' : 'upcoming'
  })),
  cta: {
    label: "Start My Program",
    subtext: "Adapts to your readiness",
    currentReadiness: getCurrentReadiness()
  },
  onStart: () => navigateToFirstWorkout()
};
\`\`\`

## Future Enhancements

Potential improvements for future iterations:

- [ ] Share plan functionality (export/send link)
- [ ] Exercise preview thumbnails in next session
- [ ] Week-by-week calendar view toggle
- [ ] Favorite/bookmark plan
- [ ] Print/PDF export option
- [ ] Comparison view (old plan vs new plan)
- [ ] Customization options (swap exercises)
