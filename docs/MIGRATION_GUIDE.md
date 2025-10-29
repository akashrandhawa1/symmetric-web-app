# Migration Guide: Old Voice Coaching → Live Coaching System

## Overview

This guide explains the migration from the legacy decision-tree coaching system to the new real-time Live Coaching System.

## System Comparison

### Old System (`src/lib/coach/voice.ts`)
- **Type**: Decision-tree based, post-set feedback only
- **Timing**: Advice given AFTER set completion during rest
- **Feedback**: Text-based coaching messages with effort/rest recommendations
- **Limitations**:
  - No real-time guidance during set execution
  - Verbose, repetitive messaging
  - No visual feedback components
  - Limited scientific explanations

### New System (`src/lib/coach/liveCoaching.ts`)
- **Type**: Real-time rep-by-rep coaching with AI integration
- **Timing**: Live cues appear DURING set execution + end-of-set summary
- **Feedback**:
  - Animated drop-down cues (zone-based: warmup, goldilocks, approaching limit, unproductive)
  - Visual rep counter with color coding
  - Comprehensive end-of-set summary with scientific insights
- **Advantages**:
  - Real-time guidance helps users stop at optimal rep count (3-6 for strength)
  - Clear strength/recovery reasoning
  - Varied messaging to prevent repetition
  - Visual + text feedback
  - Educational with scientific tips

## Current Status

✅ **Phase 1: Coexistence** (Current)
- Both systems exist side-by-side
- Old system marked as `@deprecated` in [src/lib/coach/voice.ts](../src/lib/coach/voice.ts:1)
- New system fully implemented and documented

## File Status

### Deprecated Files
- `src/lib/coach/voice.ts` - **LEGACY** - Contains old decision-tree logic
  - Still functional but marked for deprecation
  - Header notice directs developers to new system

### New Files (Active)
- `src/lib/coach/liveCoaching.ts` - Core logic for live coaching
- `src/components/coach/LiveCoachingCue.tsx` - Animated cue component
- `src/components/coach/SetSummaryCard.tsx` - End-of-set summary UI
- `src/screens/LiveCoachingDemo.tsx` - Interactive demo

## Testing the New System

### Option 1: Standalone Demo
```bash
npm run dev
```

Then visit: **http://localhost:3000/live-coaching-demo.html**

This loads a standalone demo with two modes:
1. **Auto-Play**: Simulates reps automatically (1 rep every 2s, stops at rep 10)
2. **Manual Mode**: Tap "Rep Complete" button for each rep

### Option 2: Integrate into Main App

Add the live coaching screen to your main app navigation:

```typescript
// In App.tsx
import LiveCoachingDemo from './screens/LiveCoachingDemo';

// In your screen switch statement:
case "live-coaching-demo":
  return <LiveCoachingDemo />;
```

## Migration Steps (When Ready)

### Step 1: A/B Test Both Systems
```typescript
// Example feature flag implementation
const useNewCoaching = userProfile.features?.liveCoaching ?? false;

if (useNewCoaching) {
  // Use new LiveCoachingCue component during set
  return <LiveCoachingCue context={context} />;
} else {
  // Use old voice.ts system after set
  const advice = generatePersonalizedFeedback(setContext, userProfile);
  return <OldCoachingUI advice={advice} />;
}
```

### Step 2: Gradual Rollout
1. Enable new system for 10% of users
2. Monitor metrics:
   - User engagement with cues
   - Adherence to 3-6 rep range
   - User feedback/ratings
3. Increase rollout to 50%, then 100%

### Step 3: Remove Old System
Once all users migrated:
1. Remove `src/lib/coach/voice.ts`
2. Remove any remaining imports/references
3. Clean up old coaching UI components
4. Update tests to use new system only

## Integration Examples

### Basic Integration
```typescript
import { LiveCoachingCue, RepCounter } from '@/components/coach/LiveCoachingCue';
import { SetSummaryCard } from '@/components/coach/SetSummaryCard';
import { generateSetSummary, getRepZone } from '@/lib/coach/liveCoaching';

function TrainingScreen() {
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
      </>
    );
  }

  const summary = generateSetSummary(currentRep, context);
  return <SetSummaryCard summary={summary} onContinue={startNextSet} />;
}
```

### With Gemini API (Optional)
```typescript
import { buildLiveCuePrompt, LIVE_COACHING_SYSTEM_PROMPT } from '@/lib/coach/liveCoaching';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

async function fetchDynamicCue(context: LiveCoachingContext) {
  const prompt = buildLiveCuePrompt(context);
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction: LIVE_COACHING_SYSTEM_PROMPT,
  });

  return result.response.text();
}
```

## Key Differences for Developers

| Feature | Old System | New System |
|---------|-----------|------------|
| **Timing** | Post-set only | Real-time during set + post-set |
| **API** | `generatePersonalizedFeedback()` | `getLiveCue()` + `generateSetSummary()` |
| **Input** | Full set context after completion | Current rep number during execution |
| **Output** | `CoachOutput` with single message | `LiveCue` per rep + `SetSummary` at end |
| **UI Components** | Custom integration required | Pre-built components ready to use |
| **Rep Zones** | No concept of zones | 4 zones: warmup, goldilocks, approaching, unproductive |
| **Visual Feedback** | Text only | Animated cues + color-coded rep counter |

## Scientific Foundation

The new system is built on the principle that **3-6 reps is the optimal range for max strength gains**:

1. **High Mechanical Tension**: Heavy loads create maximum tension on muscle fibers
2. **Optimal Motor Unit Recruitment**: Recruits high-threshold motor units (type IIx fibers)
3. **Minimal Metabolic Fatigue**: Short sets avoid excessive lactate buildup
4. **Neural Adaptations**: Teaches nervous system to produce max force efficiently
5. **Recovery-Friendly**: Less systemic fatigue than high-rep sets

Going beyond 8 reps at heavy loads:
- Accumulates fatigue faster than strength stimulus
- Shifts from mechanical tension to metabolic stress
- Longer recovery time required
- Increased risk of form breakdown

## Resources

- [Live Coaching System Documentation](./LIVE_COACHING_SYSTEM.md) - Complete system overview
- [Demo Screen](../src/screens/LiveCoachingDemo.tsx) - Reference implementation
- [Test Locally](http://localhost:3000/live-coaching-demo.html) - Interactive demo

## Support

Questions about migration? Check:
1. [LIVE_COACHING_SYSTEM.md](./LIVE_COACHING_SYSTEM.md) - Full documentation
2. [LiveCoachingDemo.tsx](../src/screens/LiveCoachingDemo.tsx) - Example usage
3. Code comments in [liveCoaching.ts](../src/lib/coach/liveCoaching.ts)

---

**Last Updated**: 2025-10-16
**Status**: Phase 1 - Coexistence
