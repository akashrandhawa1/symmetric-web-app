# Live Coaching System - Quick Start Guide

## 🎯 What's New

A **real-time, rep-by-rep coaching system** that guides users through strength training sets with:

- ✅ Live drop-down cues as you perform each rep
- ✅ Zone-based guidance (3-6 rep range for optimal strength)
- ✅ End-of-set summary with scientific reasoning
- ✅ Visual feedback with color-coded rep zones
- ✅ Clear strength/recovery impact explanations

## 🚀 Quick Demo

**Start the dev server:**
```bash
npm run dev
```

**Visit the demo:**
```
http://localhost:3000/live-coaching-demo.html
```

**Try two modes:**
1. **Auto-Play**: Watch the system automatically simulate reps (1 rep every 2s)
2. **Manual**: Tap "Rep Complete" to manually progress through reps

## 📂 New Files Created

### Core Logic
- **[src/lib/coach/liveCoaching.ts](src/lib/coach/liveCoaching.ts)** (350+ LOC)
  - Rep zone detection (`getRepZone()`)
  - Live cue generation (`getLiveCue()`)
  - Set summary generation (`generateSetSummary()`)
  - Gemini API integration helpers

### UI Components
- **[src/components/coach/LiveCoachingCue.tsx](src/components/coach/LiveCoachingCue.tsx)** (150+ LOC)
  - Animated drop-down cues with Framer Motion
  - Auto-hide after 3s (warnings stay visible)
  - Color-coded by zone

- **[src/components/coach/SetSummaryCard.tsx](src/components/coach/SetSummaryCard.tsx)** (200+ LOC)
  - End-of-set performance breakdown
  - Visual rep range bar chart
  - Action buttons + science tips

### Demo & Testing
- **[src/screens/LiveCoachingDemo.tsx](src/screens/LiveCoachingDemo.tsx)** (250+ LOC)
  - Interactive demo with auto-play mode
  - Full flow: Setup → Executing → Summary

- **[live-coaching-demo.html](live-coaching-demo.html)** - Standalone demo page
- **[src/demo-entry.tsx](src/demo-entry.tsx)** - Demo entry point

### Documentation
- **[docs/LIVE_COACHING_SYSTEM.md](docs/LIVE_COACHING_SYSTEM.md)** - Complete system overview
- **[docs/MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md)** - Migration from old system
- **This file** - Quick start guide

## 🔄 Old System Status

The legacy coaching system in **[src/lib/coach/voice.ts](src/lib/coach/voice.ts)** has been marked as **DEPRECATED**.

**Migration plan:**
1. ✅ **Phase 1 (Current)**: Both systems coexist
2. **Phase 2**: A/B test both systems with users
3. **Phase 3**: Migrate all users to new live coaching
4. **Phase 4**: Remove old system completely

See [docs/MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md) for details.

## 🎨 Rep Zones Explained

| Zone | Reps | Color | Message | Purpose |
|------|------|-------|---------|---------|
| **Warmup** | 0-2 | 🔵 Blue | "You're building up—let's keep going." | Building momentum |
| **Goldilocks** | 3-6 | ✨ Green | "Nice! You're in the strength zone." | **Optimal for strength** |
| **Approaching Limit** | 7-8 | ⚠️ Yellow | "Heads up—approaching fatigue threshold." | Warning |
| **Unproductive** | 9+ | 🛑 Red | "Beyond ideal range. Quality over quantity." | Stop signal |

## 🧬 Scientific Foundation

**Why 3-6 reps for strength?**

1. **High Mechanical Tension**: Heavy loads = max tension on muscle fibers
2. **Optimal Motor Unit Recruitment**: Recruits high-threshold motor units (type IIx)
3. **Minimal Metabolic Fatigue**: Short sets avoid excessive lactate
4. **Neural Adaptations**: Teaches nervous system to produce max force
5. **Recovery-Friendly**: Less systemic fatigue than high-rep sets

**Why avoid 8+ reps at heavy loads?**
- Fatigue accumulates faster than strength stimulus
- Shifts from mechanical tension to metabolic stress
- Longer recovery time required
- Higher risk of form breakdown

## 💻 Integration Example

```typescript
import { LiveCoachingCue, RepCounter } from '@/components/coach/LiveCoachingCue';
import { SetSummaryCard } from '@/components/coach/SetSummaryCard';
import { generateSetSummary, getRepZone } from '@/lib/coach/liveCoaching';

function WorkoutScreen() {
  const [currentRep, setCurrentRep] = useState(0);
  const [phase, setPhase] = useState<'executing' | 'summary'>('executing');

  const context = {
    current_rep: currentRep,
    target_rep_range: [3, 6],
    exercise_name: 'Barbell Squat',
    set_number: 1,
    user_training_age: 'intermediate',
  };

  if (phase === 'executing') {
    return (
      <>
        <LiveCoachingCue context={context} />
        <RepCounter
          currentRep={currentRep}
          targetRange={[3, 6]}
          zone={getRepZone(currentRep)}
        />
        <button onClick={() => setCurrentRep(prev => prev + 1)}>
          Rep Complete
        </button>
      </>
    );
  }

  const summary = generateSetSummary(currentRep, context);
  return <SetSummaryCard summary={summary} onContinue={startNextSet} />;
}
```

## 🎯 Key Features

### Real-Time Cues
- Drop down from top of screen as each rep completes
- Zone-specific messaging (warmup, goldilocks, approaching, unproductive)
- Auto-hide after 3s (except warnings)
- Color-coded icons and borders

### Rep Counter
- Large, easy-to-read rep number
- Color changes based on zone
- Shows target range (e.g., "Target: 3-6 reps")
- "⭐ In Strength Zone" indicator when in goldilocks range

### Set Summary
- Performance breakdown (perfect range, too few, slightly over, way over)
- Visual rep range bar chart
- Specific feedback: "How You Did" + "Next Set Guidance"
- Scientific insights explaining the "why"
- Action buttons: Continue / Adjust Weight / End Session

## 📊 Customization

**Different training goals:**
```typescript
// Max strength
const strengthContext = { target_rep_range: [1, 5] };

// Hypertrophy (muscle growth)
const hypertrophyContext = { target_rep_range: [6, 12] };

// Endurance
const enduranceContext = { target_rep_range: [12, 20] };
```

**Adjust cue timing:**
```typescript
// In LiveCoachingCue.tsx, change auto-hide duration:
setTimeout(() => setShowCue(false), 5000); // 5 seconds instead of 3
```

## 🛠️ Tech Stack

- **React** - UI components
- **TypeScript** - Type safety
- **Framer Motion** - Smooth animations
- **Tailwind CSS** - Styling
- **Gemini API** (optional) - AI-powered cue generation

## ✅ Testing Checklist

- [x] Auto-play mode works (reps every 2s)
- [x] Manual mode works (tap button)
- [x] Live cues appear for each rep
- [x] Cues change based on rep zone
- [x] End-of-set summary displays correctly
- [x] Action buttons functional
- [x] Visual rep chart accurate
- [x] Color coding works (blue → green → yellow → red)
- [x] Responsive on mobile/desktop

## 🔗 Resources

- **Full Documentation**: [docs/LIVE_COACHING_SYSTEM.md](docs/LIVE_COACHING_SYSTEM.md)
- **Migration Guide**: [docs/MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md)
- **Demo Screen**: [src/screens/LiveCoachingDemo.tsx](src/screens/LiveCoachingDemo.tsx)
- **Core Logic**: [src/lib/coach/liveCoaching.ts](src/lib/coach/liveCoaching.ts)

## 📝 Next Steps

1. **Test the demo**: Visit http://localhost:3000/live-coaching-demo.html
2. **Review the code**: Check out the files listed above
3. **Plan integration**: See [docs/MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md)
4. **Gather feedback**: Share demo with users/team
5. **A/B test**: Compare old vs new coaching systems

---

**Status**: ✅ Complete and Ready for Testing
**Created**: 2025-10-16
**Dependencies**: React, Framer Motion, Tailwind CSS, Gemini API (optional)
