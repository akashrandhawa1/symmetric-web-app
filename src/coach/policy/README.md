# State-Aware Voice Coach

A policy-driven, objective-based coaching system that adapts responses based on app state, user experience, and workout context.

## Overview

The state-aware coach provides:

- **Silent by default** on Home/Rest/Recovery unless `requiresChange=true`
- **Concise responses** (≤ word budget): HOOK + WHY + ACTION
- **Topic restrictions** based on app surface and experience level
- **Objective-driven** decision-making aligned with current phase
- **Quad-focused** strength coaching only

## Architecture

```
CoachContext (existing)
    ↓
adapter.ts → CoachSnapshot
    ↓
routeCoachReply.ts → Policy + Guardrails
    ↓
LLMReply → Formatted text
```

## Quick Start

### Basic Usage

```typescript
import { generateStateAwareCoachResponse } from './coach/policy/integration';
import { CoachContextBus } from './coach/CoachContextBus';

// Get current context
const ctx = CoachContextBus.getSnapshot();

// Generate response
const result = await generateStateAwareCoachResponse(ctx, "How many reps should I do?");

if (result.speak) {
  // Use TTS to speak the response
  speak(result.text);
} else {
  // Coach stays silent
  console.log('Coach is silent - no change needed');
}
```

### Integration with useVoiceCoach

```typescript
import { generateStateAwareCoachResponse } from './coach/policy/integration';
import { CoachContextBus } from './coach/CoachContextBus';

// In your voice coach handler
async function handleUserTurn(utterance: string) {
  const ctx = CoachContextBus.getSnapshot();
  const result = await generateStateAwareCoachResponse(ctx, utterance);

  if (result.speak) {
    // Deliver via TTS
    deliverAssistantResponse(result.text);
  }
}
```

## Key Concepts

### App Surfaces

Different app states have different coaching policies:

| Surface | Objective | Allowed Topics | Silent by Default |
|---------|-----------|----------------|-------------------|
| `home` | decide_next_block | plan, readiness_budget | ✅ Yes |
| `warmup` | fix_single_fault | tempo, depth, stance, symmetry | No |
| `working_set` | execute_reps | load, reps, tempo, depth, symmetry | No |
| `top_set` | push_or_hold | load, reps, depth, tempo, readiness_budget | No |
| `rest_overlay` | protect_budget | readiness_budget, plan, load | ✅ Yes |
| `cooldown` | wrap_and_transition | plan, readiness_budget | No |

### Experience Bands

User experience level adjusts verbosity and topic complexity:

- **Novice**: 22 words, focus on basics (tempo, depth, stance, reps, plan)
- **Intermediate**: 18 words, balanced topics (default)
- **Advanced**: 14 words, terse cues (load, reps, tempo, readiness_budget)

### Coaching Objectives

Each surface has an objective that drives response strategy:

- `decide_next_block` - Help choose what to do next
- `execute_reps` - Guide through current set
- `push_or_hold` - Decide to increase or maintain intensity
- `fix_single_fault` - Address one specific form issue
- `protect_budget` - Prevent overtraining
- `wrap_and_transition` - End phase and move forward

## Configuration

### Setting App Surface

Update context with current surface:

```typescript
CoachContextBus.publishContext({
  appSurface: 'working_set', // or any AppSurface
});
```

### Setting Experience Band

```typescript
CoachContextBus.publishContext({
  experienceBand: 'intermediate', // or 'novice' | 'advanced'
});
```

### Updating Set Data

After each set, publish complete performance data:

```typescript
CoachContextBus.publishContext({
  lastSet: {
    exercise: 'Back Squat',
    weight_lb: 225,
    reps: 5,
    tempo: '2010',
    depth: 'parallel',
    bar_speed: 'stable',
  },
});
```

### Computing requiresChange

Use the heuristics module:

```typescript
import { computeRequiresChange } from './coach/heuristics/requiresChange';
import { contextToSnapshot } from './coach/policy/adapter';

const ctx = CoachContextBus.getSnapshot();
const snapshot = contextToSnapshot(ctx, '');
const needsCoaching = computeRequiresChange(snapshot);

CoachContextBus.publishContext({
  requiresChange: needsCoaching,
});
```

## Testing

Run the test suite:

```bash
npm test src/coach/policy/__tests__/routeCoachReply.test.ts
```

Or watch mode:

```bash
npx vitest src/coach/policy/__tests__/routeCoachReply.test.ts
```

## File Structure

```
src/coach/
├── policy/
│   ├── types.ts              # Core type definitions
│   ├── table.ts              # Policy matrix + experience overrides
│   ├── routeCoachReply.ts    # Router with guardrails
│   ├── adapter.ts            # CoachContext → CoachSnapshot
│   ├── integration.ts        # High-level integration helpers
│   └── __tests__/
│       └── routeCoachReply.test.ts
├── prompt/
│   ├── build.ts              # System prompt + user payload builders
│   └── callLLM.ts            # LLM client wrapper
└── heuristics/
    └── requiresChange.ts     # Logic for triggering coaching
```

## Customization

### Adding New Topics

Edit [types.ts:28](src/coach/policy/types.ts#L28):

```typescript
export type Topic =
  | 'load'
  | 'reps'
  // ... existing topics
  | 'new_topic';  // Add your topic
```

### Modifying Policies

Edit [table.ts:23](src/coach/policy/table.ts#L23):

```typescript
export const BASE_POLICY: Record<AppSurface, Policy> = {
  working_set: {
    objective: 'execute_reps',
    allowed: ['load', 'reps', 'tempo', 'depth', 'symmetry', 'new_topic'],
    wordBudget: 18,
  },
  // ... other surfaces
};
```

### Adjusting Word Budgets

Edit experience overrides in [table.ts:64](src/coach/policy/table.ts#L64):

```typescript
export const EXPERIENCE_OVERRIDES = {
  novice: { wordBudget: 24 }, // Increase for novices
  advanced: { wordBudget: 12 }, // Decrease for advanced
};
```

## Safety

The system includes built-in safety overrides:

- **Pain flag**: Immediate stop signal, bypasses all policies
- **Topic restrictions**: Prevents inappropriate advice for current phase
- **Fallback cues**: Always-valid responses when LLM fails

```typescript
// Pain flag triggers immediate safety response
CoachContextBus.publishContext({
  userFlags: { pain: true },
});
// Next response will be: "Stop the set. We don't push through pain..."
```

## Debugging

Access raw LLM responses:

```typescript
const result = await generateStateAwareCoachResponse(ctx, "What next?");
console.log('Speak:', result.speak);
console.log('Text:', result.text);
console.log('Raw LLM:', result.raw); // { hook, why, action, action_type, prosody }
```

Check current policy:

```typescript
import { getCurrentPolicy } from './coach/policy/integration';

const policy = await getCurrentPolicy(ctx);
console.log('Objective:', policy.objective);
console.log('Allowed topics:', policy.allowed);
console.log('Word budget:', policy.wordBudget);
```

## Next Steps

1. **Set app surfaces** in your router/screens
2. **Update set data** after each set with full performance metrics
3. **Compute requiresChange** after each set using heuristics
4. **Call generateStateAwareCoachResponse** in voice coach handlers
5. **Add prosody support** to TTS for pace and energy (optional)
