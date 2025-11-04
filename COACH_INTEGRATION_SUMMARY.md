# Voice Coach Integration - Complete! ✅

## What Was Added

I've successfully enabled the voice coach on **two key screens**:

### 1. ✅ Pre-Training Screen (After Readiness Check)
**Location:** `src/screens/PreTrainingScreen.tsx`

**What you'll see:**
- New **"🎙️ Talk to Coach"** button above "Start Workout"
- Purple-styled button with hover effects
- Tapping opens the full-screen voice coach modal

**Coach Context:**
- Surface: `pre_session`
- Reads your current readiness score
- Can help you plan your session
- Topics: plan, readiness_budget

**Example conversations:**
- "Should I train today?"
- "What should I focus on?"
- "How hard should I push?"

---

### 2. ✅ Rest Screen (Between Sets)
**Location:** `src/screens/RestScreen.tsx`

**What you'll see:**
- New **"🎙️ Talk to Coach"** button at the top
- Purple-styled button matching the pre-training screen
- Appears during rest periods between sets

**Coach Context:**
- Surface: `rest_overlay`
- Can check your readiness budget
- Helps decide next steps
- Topics: readiness_budget, plan, load

**Example conversations:**
- "Should I add weight?"
- "How many more sets?"
- "Am I good to continue?"

---

## Visual Preview

### Pre-Training Screen
```
┌─────────────────────────────┐
│   ← Back                    │
│                             │
│   [Readiness Arc: 85]       │
│   Ready to Train            │
│                             │
│   ┌───────────────────┐     │
│   │ Today's Plan      │     │
│   │ [Plan details]    │     │
│   └───────────────────┘     │
│                             │
│ ┌─────────────────────────┐ │
│ │  🎙️ Talk to Coach      │ │ ← NEW!
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │  Start Workout          │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### Rest Screen
```
┌─────────────────────────────┐
│   Rest Period               │
│   Back Squat • Set 2        │
│                             │
│       1:30                  │
│   [Timer countdown]         │
│                             │
│ ┌─────────────────────────┐ │
│ │  🎙️ Talk to Coach      │ │ ← NEW!
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │  Log Set                │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │  Skip Rest              │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

## How the State-Aware Coach Works

### Pre-Training (pre_session surface)
**Policy:**
- Objective: `decide_next_block`
- Allowed topics: `plan`, `readiness_budget`
- Word budget: 18 words
- Silent by default: ❌ (can speak when asked)

**Example Response:**
> User: "Should I train today?"  
> Coach: "Readiness is 85. Perfect window for work. Start squats and finish near 50."

---

### Rest Period (rest_overlay surface)
**Policy:**
- Objective: `protect_budget`
- Allowed topics: `readiness_budget`, `plan`, `load`
- Word budget: 16 words
- **Silent by default: ✅** (only speaks if `requiresChange=true`)

**Example Response:**
> User: "Should I add weight?"  
> Coach: "Readiness is 52. Close to target. One more hard set, then backoff."

---

## Technical Details

### Changes Made
1. **PreTrainingScreen.tsx**
   - Added `GeminiLiveCoach` import
   - Added `CoachContextBus` import
   - Added `showCoach` state
   - Added "Talk to Coach" button
   - Auto-sets `appSurface: 'pre_session'`
   - Publishes readiness score to context

2. **RestScreen.tsx**
   - Added `GeminiLiveCoach` import
   - Added `CoachContextBus` import
   - Added `showCoach` state
   - Added "Talk to Coach" button at top
   - Auto-sets `appSurface: 'rest_overlay'`

### Context Updates
Both screens now automatically update the coaching context when shown:

**Pre-Training:**
```typescript
CoachContextBus.publishContext({
  appSurface: 'pre_session',
  readiness: score ?? 75,
  readinessTarget: 50,
});
```

**Rest:**
```typescript
CoachContextBus.publishContext({
  appSurface: 'rest_overlay',
  sessionPhase: 'rest',
});
```

---

## Testing the Integration

### 1. Test Pre-Training Coach
1. Complete a readiness check
2. You'll see the "🎙️ Talk to Coach" button
3. Tap it to open the voice coach
4. Try asking: "Should I train today?"
5. Coach will respond based on your readiness score

### 2. Test Rest Coach
1. Complete a set
2. During rest period, tap "🎙️ Talk to Coach"
3. Try asking: "Should I add weight?"
4. Coach will respond based on your current fatigue

---

## What's Next?

The coach is now available on these screens! For full state-aware coaching integration:

### Optional Enhancements
1. **Add to more screens:**
   - Home screen
   - During active sets (working_set surface)
   - Cooldown screen

2. **Update set data:**
   - Publish `lastSet` data after each set
   - Include `weight_lb`, `reps`, `bar_speed`, `depth`
   - Enables more specific coaching

3. **Set experience band:**
   - Add user profile setting for novice/intermediate/advanced
   - Adjusts coach verbosity automatically

See [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) for complete integration details.

---

## Support

If you have questions:
- Check [VOICE_COACH_SUMMARY.md](VOICE_COACH_SUMMARY.md) for examples
- See [src/coach/policy/examples.ts](src/coach/policy/examples.ts) for usage patterns
- Review [src/coach/policy/demo-responses.ts](src/coach/policy/demo-responses.ts) for response examples

**Status:** ✅ Coach is now available on Pre-Training and Rest screens!
