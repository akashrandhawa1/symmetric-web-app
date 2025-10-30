# State-Aware Voice Coach Implementation Guide

This guide explains how to integrate the new state-aware coaching system into your application.

## ✅ What's Been Implemented

### Core System (9 new files)

1. **Type System** ([src/coach/policy/types.ts](src/coach/policy/types.ts))
   - `AppSurface`: 10 app states (home, warmup, working_set, top_set, etc.)
   - `ExperienceBand`: novice, intermediate, advanced
   - `CoachObjective`: 6 coaching objectives
   - `Topic`: 9 coaching topics with restrictions
   - `CoachSnapshot`: Complete context for routing
   - `Policy`: Rules for each surface
   - `LLMReply`: Structured response format

2. **Policy Matrix** ([src/coach/policy/table.ts](src/coach/policy/table.ts))
   - Base policies for all 10 surfaces
   - Experience-based overrides (word budgets, topic restrictions)
   - Merge function for combining base + overrides

3. **Router & Guardrails** ([src/coach/policy/routeCoachReply.ts](src/coach/policy/routeCoachReply.ts))
   - Silence enforcement for quiet surfaces
   - Safety overrides (pain flag)
   - Topic validation (allowed/banned)
   - Word budget enforcement
   - Fallback cues for errors

4. **Prompt Builder** ([src/coach/prompt/build.ts](src/coach/prompt/build.ts))
   - System prompt with policy constraints
   - User payload with complete context
   - JSON-structured output format

5. **LLM Caller** ([src/coach/prompt/callLLM.ts](src/coach/prompt/callLLM.ts))
   - Direct Gemini API integration
   - Function endpoint fallbacks
   - JSON response parsing

6. **Heuristics** ([src/coach/heuristics/requiresChange.ts](src/coach/heuristics/requiresChange.ts))
   - `computeRequiresChange()`: Triggers coaching interventions
   - `classifyIntent()`: Categorizes user utterances

7. **Adapter** ([src/coach/policy/adapter.ts](src/coach/policy/adapter.ts))
   - Converts existing `CoachContext` to new `CoachSnapshot`
   - Provides sensible defaults
   - Maps legacy fields to new structure

8. **Integration Helpers** ([src/coach/policy/integration.ts](src/coach/policy/integration.ts))
   - `generateStateAwareCoachResponse()`: Main entry point
   - `shouldCoachStaySilent()`: Pre-flight check
   - `getCurrentPolicy()`: Get active policy

9. **Examples** ([src/coach/policy/examples.ts](src/coach/policy/examples.ts))
   - 10 common integration patterns
   - Screen navigation
   - Set completion
   - Experience detection
   - Safety handling

### Updated Files

1. **CoachContextBus** ([src/coach/CoachContextBus.ts](src/coach/CoachContextBus.ts))
   - Added `appSurface?: AppSurface`
   - Added `experienceBand?: ExperienceBand`
   - Added `readinessTarget?: number`
   - Added `requiresChange?: boolean`
   - Added `symmetry?: { left_pct, right_pct }`
   - Added `timeLeftMin?: number`
   - Extended `lastSet` with `weight_lb`, `tempo`, `depth`, `bar_speed`

### Tests

- **15 Unit Tests** ([src/coach/policy/__tests__/routeCoachReply.test.ts](src/coach/policy/__tests__/routeCoachReply.test.ts))
  - ✅ All passing
  - Silence behavior (4 tests)
  - Safety overrides (1 test)
  - Topic restrictions (3 tests)
  - Word budget enforcement (3 tests)
  - Fallback behavior (2 tests)
  - Integration scenarios (2 tests)

## 🚀 Quick Start Integration

### Step 1: Update Context on Screen Navigation

```typescript
import { CoachContextBus } from './coach/CoachContextBus';

// In your router/screen component
function navigateToScreen(screen: string) {
  let appSurface: AppSurface = 'home';

  switch (screen) {
    case 'home': appSurface = 'home'; break;
    case 'warmup': appSurface = 'warmup'; break;
    case 'workout': appSurface = 'working_set'; break;
    case 'rest': appSurface = 'rest_overlay'; break;
    // ... etc
  }

  CoachContextBus.publishContext({ appSurface });
}
```

### Step 2: Update Context After Each Set

```typescript
import { CoachContextBus } from './coach/CoachContextBus';
import { contextToSnapshot } from './coach/policy/adapter';
import { computeRequiresChange } from './coach/heuristics/requiresChange';

function onSetComplete(setData: SetData) {
  // Update context with set performance
  CoachContextBus.publishContext({
    lastSet: {
      exercise: setData.exercise,
      weight_lb: setData.weight,
      reps: setData.reps,
      tempo: '2010',
      depth: setData.depth, // 'above' | 'parallel' | 'below'
      bar_speed: setData.barSpeed, // 'slow' | 'stable' | 'fast'
    },
  });

  // Compute if coaching is needed
  const ctx = CoachContextBus.getSnapshot();
  const snapshot = contextToSnapshot(ctx, '');
  const requiresChange = computeRequiresChange(snapshot);

  CoachContextBus.publishContext({ requiresChange });
}
```

### Step 3: Replace Voice Coach Handler

```typescript
import { generateStateAwareCoachResponse } from './coach/policy/integration';
import { CoachContextBus } from './coach/CoachContextBus';

async function handleUserVoiceInput(utterance: string) {
  const ctx = CoachContextBus.getSnapshot();
  const result = await generateStateAwareCoachResponse(ctx, utterance);

  if (result.speak && result.text) {
    // Use your existing TTS
    speak(result.text);
  } else {
    console.log('Coach is silent - no change needed');
  }
}
```

### Step 4: Set Experience Band (One-Time)

```typescript
import { CoachContextBus } from './coach/CoachContextBus';

// On app launch or profile load
function setUserExperience(user: User) {
  let experienceBand: ExperienceBand = 'intermediate';

  if (user.totalSessions < 12) {
    experienceBand = 'novice';
  } else if (user.totalSessions > 100) {
    experienceBand = 'advanced';
  }

  CoachContextBus.publishContext({ experienceBand });
}
```

## 📋 Integration Checklist

### Minimal Integration (Required)

- [ ] Set `appSurface` when navigating screens
- [ ] Update `lastSet` after each set completion
- [ ] Call `generateStateAwareCoachResponse()` in voice handler
- [ ] Set `experienceBand` on app launch

### Recommended Integration

- [ ] Compute `requiresChange` after each set
- [ ] Update `symmetry` from force sensors
- [ ] Set `readinessTarget` at session start
- [ ] Handle `pain` flag from user input
- [ ] Disable mic on quiet surfaces (use `shouldCoachStaySilent()`)

### Optional Enhancements

- [ ] Detect top sets dynamically (high intensity)
- [ ] Add prosody to TTS (pace, energy from `result.raw.prosody`)
- [ ] Track `timeLeftMin` for session pacing
- [ ] Log `result.raw` for debugging

## 🎯 Behavioral Changes

### Before (Free-Form Coach)

- Speaks on every interaction
- Long, varied responses
- No topic restrictions
- No state awareness

### After (State-Aware Coach)

- **Silent by default** on Home/Rest/Recovery
- **Concise responses** (14-22 words based on experience)
- **Topic-restricted** (only discusses allowed topics for current surface)
- **Objective-driven** (responses align with current phase)

## 🔧 Customization

### Adjust Word Budgets

Edit [src/coach/policy/table.ts:64](src/coach/policy/table.ts#L64):

```typescript
export const EXPERIENCE_OVERRIDES = {
  novice: { wordBudget: 24 },      // More verbose
  intermediate: { wordBudget: 18 }, // Default
  advanced: { wordBudget: 12 },    // Very terse
};
```

### Add New Topics

1. Add to [src/coach/policy/types.ts:28](src/coach/policy/types.ts#L28)
2. Update policy `allowed` lists in [src/coach/policy/table.ts:23](src/coach/policy/table.ts#L23)
3. Update system prompt in [src/coach/prompt/build.ts:37](src/coach/prompt/build.ts#L37)

### Modify Policies

Edit [src/coach/policy/table.ts:23](src/coach/policy/table.ts#L23):

```typescript
export const BASE_POLICY: Record<AppSurface, Policy> = {
  working_set: {
    objective: 'execute_reps',
    allowed: ['load', 'reps', 'tempo', 'depth', 'symmetry'],
    wordBudget: 18,
  },
  // ... other surfaces
};
```

### Tune Heuristics

Edit [src/coach/heuristics/requiresChange.ts:27](src/coach/heuristics/requiresChange.ts#L27):

```typescript
// Adjust thresholds
const imbalance = Math.abs(left_pct - right_pct);
if (imbalance > 15) { // Change from 12 to 15
  return true;
}
```

## 🧪 Testing

### Run Tests

```bash
npm test src/coach/policy/__tests__/routeCoachReply.test.ts
```

### Watch Mode

```bash
npx vitest src/coach/policy/__tests__/routeCoachReply.test.ts
```

### Manual Testing

```typescript
// In browser console
import { generateStateAwareCoachResponse } from './coach/policy/integration';
import { CoachContextBus } from './coach/CoachContextBus';

// Set up test context
CoachContextBus.publishContext({
  appSurface: 'working_set',
  experienceBand: 'intermediate',
  readiness: 60,
  readinessTarget: 50,
  requiresChange: true,
});

// Test response
const result = await generateStateAwareCoachResponse(
  CoachContextBus.getSnapshot(),
  'How many reps should I do?'
);
console.log(result);
```

## 📚 Reference

- [README.md](src/coach/policy/README.md) - Detailed documentation
- [examples.ts](src/coach/policy/examples.ts) - 10 integration patterns
- [types.ts](src/coach/policy/types.ts) - Type definitions with JSDoc
- [Tests](src/coach/policy/__tests__/routeCoachReply.test.ts) - Usage examples

## 🚨 Safety

The system includes multiple safety layers:

1. **Pain flag override**: Bypasses all policies, immediate stop signal
2. **Topic restrictions**: Prevents inappropriate advice for current phase
3. **Fallback cues**: Always-valid responses when LLM fails
4. **Silence on error**: Stays silent rather than giving bad advice

```typescript
// Example: Pain handling
CoachContextBus.publishContext({
  userFlags: { pain: true },
});
// Next response: "Stop the set. We don't push through pain..."
```

## 🎓 Next Steps

1. **Start with minimal integration** (4 required steps above)
2. **Test on one screen** (e.g., working_set)
3. **Add recommended features** incrementally
4. **Tune policies and heuristics** based on user feedback
5. **Monitor `result.raw`** to understand LLM behavior

## 💬 Support

For questions or issues:
- Check [examples.ts](src/coach/policy/examples.ts) for common patterns
- Review [tests](src/coach/policy/__tests__/routeCoachReply.test.ts) for expected behavior
- See [README.md](src/coach/policy/README.md) for API details

---

**Implementation Status**: ✅ Complete and tested (15/15 tests passing)
