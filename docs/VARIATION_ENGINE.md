# Variation Engine: Dynamic, Non-Repetitive Coaching Feedback

## Overview

The **Variation Engine** ensures coaching feedback never feels repetitive by:

1. **Rotating Scientific Explanations** - Different angles (mechanical tension, motor recruitment, metabolic fatigue, etc.)
2. **Context-Aware Feedback** - References previous sets and adjustments
3. **Personalized Encouragement** - Progress-based notes
4. **Large Response Pools** - 8-12+ phrasings for each scenario

## Problem It Solves

### Before (Repetitive)
```
Set 1: "Great set! You hit 5 reps right in the productive zone for strength."
Set 2: "Great set! You hit 5 reps right in the productive zone for strength."
Set 3: "Great set! You hit 5 reps right in the productive zone for strength."
```

### After (Varied)
```
Set 1: "Great set! You hit 5 reps right in the productive zone for strength."
Set 2: "Solid work—5 reps is the sweet spot for building max strength."
Set 3: "Beautiful set. 5 reps in the goldilocks zone builds real strength."
```

##Architecture

### Core Module: [src/lib/coach/variationEngine.ts](../src/lib/coach/variationEngine.ts)

```typescript
// Scientific angle rotation
selectScientificAngle(state, preferredAngles?)
  → { angle: ScientificAngle, explanation: string }

// Context-aware feedback
generateContextualPhrase(currentReps, context)
  → ContextualPhrase | null

// Personalized encouragement
generatePersonalizedEncouragement(context)
  → string | null

// Response pool selection
selectVariedResponse(pool, state, replacements?)
  → string
```

### Integration: [src/lib/coach/liveCoaching.ts](../src/lib/coach/liveCoaching.ts)

New functions:
- `generateVariedSetSummary()` - Uses variation engine for set summaries
- `buildEnhancedSetSummaryPrompt()` - Includes context for Gemini API
- `ENHANCED_GEMINI_SYSTEM_PROMPT` - Instructs Gemini to vary responses

### Enhanced REST Coach: [src/lib/coach/geminiClient.ts](../src/lib/coach/geminiClient.ts)

Updated `SYSTEM_PROMPT` with:
- Variation guidelines
- Scientific angle rotation instructions
- Context-awareness directives
- Personalization examples

## Scientific Angles

The system rotates through 9 different scientific explanations:

| Angle | Focus | Example |
|-------|-------|---------|
| **mechanical_tension** | Muscle fiber tension | "Heavy loads create maximum mechanical tension on muscle fibers—the primary driver of strength." |
| **motor_unit_recruitment** | Type IIx fiber activation | "You're recruiting high-threshold motor units that have the most growth potential." |
| **metabolic_fatigue** | Lactate minimization | "Short sets avoid excessive lactate buildup, keeping fatigue low and strength quality high." |
| **neural_adaptation** | CNS efficiency | "Your nervous system is learning to fire muscle fibers more efficiently—that's neural strength." |
| **recovery_efficiency** | Fatigue management | "Stopping at 6 reps leaves gas in the tank, so you recover faster for tomorrow's session." |
| **muscle_damage** | Microtrauma minimization | "Low reps mean less eccentric damage per set, so you can train more frequently." |
| **myofibrillar_synthesis** | Contractile protein growth | "This rep range optimizes myofibrillar protein synthesis—the foundation of dense, strong muscle." |
| **force_production** | Power output | "Heavy reps train your body to generate peak force quickly—essential for explosiveness." |
| **form_quality** | Movement pattern safety | "Stopping early preserves perfect form—sloppy reps build bad patterns." |

### How It Works

```typescript
// System tracks recently used angles
const state = {
  last_used_angles: ['mechanical_tension', 'motor_unit_recruitment'],
  // ...
};

// Next call avoids recent angles
const { angle, explanation } = selectScientificAngle(state);
// Returns: { angle: 'metabolic_fatigue', explanation: "..." }

// Angle added to history, rotates to next fresh angle
```

## Context-Aware Feedback

Compares current set to previous sets:

### Improvement Scenarios

**User Corrected Light Weight:**
```typescript
// Set 1: 2 reps (too light)
// Set 2: 5 reps (perfect)
→ "Great adjustment from your last set—this is the ideal intensity now."
```

**User Corrected Heavy Weight:**
```typescript
// Set 1: 10 reps (too heavy)
// Set 2: 5 reps (perfect)
→ "Perfect correction! This load is dialed in for strength."
```

**Consistency (Multiple Perfect Sets):**
```typescript
// Set 1: 5 reps (perfect)
// Set 2: 5 reps (perfect)
→ "You're really dialing it in—keep this up and strength gains are inevitable."
```

### Correction Needed

**Still Too Light:**
```typescript
// Set 1: 2 reps (too light)
// Set 2: 2 reps (too light)
→ "Two sets under the strength zone—consider dropping weight to hit 4-5 quality reps."
```

**Still Too Heavy:**
```typescript
// Set 1: 10 reps (too heavy)
// Set 2: 10 reps (too heavy)
→ "This is the second set beyond ideal range—let's prioritize quality over quantity next time."
```

## Personalized Encouragement

Progress-based notes appear occasionally:

### Beginner Progress
```typescript
context = {
  user_training_age: 'beginner',
  set_number: 3,
  recent_trend: 'consistent'
}
→ "You're really getting the hang of this—keep building that foundation!"
```

### Intermediate/Advanced Improvement
```typescript
context = {
  user_training_age: 'advanced',
  recent_trend: 'improving'
}
→ "Your technique is tightening up—this progress is going to compound fast."
```

### Sustained Quality
```typescript
context = {
  total_sets_today: 5,
  recent_trend: 'consistent'
}
→ "This kind of consistency is what separates people who get strong from people who spin their wheels."
```

### Late Session Quality (Advanced)
```typescript
context = {
  user_training_age: 'advanced',
  total_sets_today: 6
}
→ "Quality this deep into the session? That's pro-level work."
```

## Response Pools

### Perfect Range (3-6 Reps) - 12 Variations

```typescript
PERFECT_RANGE_RESPONSES = [
  "Great set! You hit {reps} reps right in the productive zone for strength.",
  "Excellent execution—{reps} reps is exactly where we want you.",
  "Perfect! {reps} quality reps in the strength zone.",
  "Solid work—{reps} reps is the sweet spot for building max strength.",
  "You nailed it. {reps} reps with heavy load = optimal strength stimulus.",
  "That's what we're looking for—{reps} reps of quality work.",
  "Beautiful set. {reps} reps in the goldilocks zone builds real strength.",
  "Textbook strength training—{reps} reps at this intensity is perfect.",
  "{reps} reps? That's the money range. Keep this up.",
  "Strong set. {reps} reps means you're hitting the right intensity.",
  "Exactly right—{reps} reps with good form is where gains happen.",
  "You're locked in. {reps} reps is precisely the target for strength work.",
];
```

### Too Few Reps (<3) - 8 Variations

```typescript
TOO_FEW_REPS_RESPONSES = [
  "Only {reps} reps—you've got more in the tank.",
  "Set ended early at {reps} reps. Strength gains come from 3+ quality reps.",
  "Just {reps} reps? That's too light for strength building.",
  "{reps} reps won't cut it for strength—we need at least 3-4 to hit motor unit recruitment.",
  // ... 4 more
];
```

### Slightly Over (7-8 Reps) - 7 Variations

### Way Over (9+ Reps) - 8 Variations

### Next-Set Guidance - 3 Pools

- **perfect_repeat**: 6 variations
- **too_light_add_weight**: 5 variations
- **too_heavy_reduce**: 6 variations

## Usage Examples

### Example 1: Basic Usage (No Context)

```typescript
import { generateVariedSetSummary, resetVariationState } from '@/lib/coach/liveCoaching';

// Start new session
resetVariationState();

// Set 1: 5 reps
const summary1 = generateVariedSetSummary(5, {
  target_rep_range: [3, 6],
  exercise_name: 'Barbell Squat',
  set_number: 1,
  user_training_age: 'intermediate',
});

console.log(summary1.feedback);
// → "Great set! You hit 5 reps right in the productive zone for strength."

console.log(summary1.scientific_insight);
// → "Heavy loads create maximum mechanical tension on muscle fibers..."

// Set 2: 5 reps (same performance, different feedback)
const summary2 = generateVariedSetSummary(5, {
  target_rep_range: [3, 6],
  exercise_name: 'Barbell Squat',
  set_number: 2,
  user_training_age: 'intermediate',
});

console.log(summary2.feedback);
// → "Solid work—5 reps is the sweet spot for building max strength." // DIFFERENT!

console.log(summary2.scientific_insight);
// → "You're recruiting high-threshold motor units..." // DIFFERENT ANGLE!
```

### Example 2: Context-Aware Feedback

```typescript
// Set 1: Too light
const summary1 = generateVariedSetSummary(2, {
  target_rep_range: [3, 6],
  exercise_name: 'Bench Press',
  set_number: 1,
  user_training_age: 'beginner',
});
// → "Only 2 reps—you've got more in the tank."

// Set 2: Corrected to perfect range
const summary2 = generateVariedSetSummary(5, {
  target_rep_range: [3, 6],
  exercise_name: 'Bench Press',
  set_number: 2,
  user_training_age: 'beginner',
  previous_set_reps: 2,
  previous_set_feedback: 'too_light',
});

console.log(summary2.contextual_feedback);
// → "Great adjustment from your last set—this is the ideal intensity now."
```

### Example 3: Personalized Encouragement

```typescript
const summary = generateVariedSetSummary(5, {
  target_rep_range: [3, 6],
  exercise_name: 'Deadlift',
  set_number: 4,
  user_training_age: 'beginner',
  previous_set_feedback: 'perfect',
  total_sets_today: 4,
  recent_trend: 'consistent',
});

console.log(summary.personalized_note);
// → "You're really getting the hang of this—keep building that foundation!"
```

### Example 4: With Gemini API

```typescript
import { buildEnhancedSetSummaryPrompt, ENHANCED_GEMINI_SYSTEM_PROMPT } from '@/lib/coach/liveCoaching';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

const context = {
  target_rep_range: [3, 6],
  exercise_name: 'Squat',
  set_number: 2,
  user_training_age: 'intermediate',
  previous_set_reps: 5,
  previous_set_feedback: 'perfect',
};

const prompt = buildEnhancedSetSummaryPrompt(6, context);

const result = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  systemInstruction: ENHANCED_GEMINI_SYSTEM_PROMPT,
});

const response = result.response.text();
// Gemini returns varied, context-aware feedback following variation guidelines
```

## State Management

### Global State (Per Session)

```typescript
let globalVariationState: VariationState = {
  last_used_angles: ['mechanical_tension', 'motor_unit_recruitment'],
  last_used_phrases: ["Great set! You hit 5 reps...", "Solid work—5 reps..."],
  feedback_history: [
    { set_number: 1, previous_set_reps: undefined, ... },
    { set_number: 2, previous_set_reps: 5, ... }
  ],
  session_cue_count: 2,
};
```

### Reset Between Sessions

```typescript
import { resetVariationState } from '@/lib/coach/liveCoaching';

// Call at start of new workout
resetVariationState();
```

## Integration with Existing Systems

### REST Coach (Gemini Client)

**Before:**
```typescript
export const SYSTEM_PROMPT = `You are Symmetric Strength Coach...`;
```

**After:**
```typescript
export const SYSTEM_PROMPT = `You are Symmetric Strength Coach...

VARIATION GUIDELINES (CRITICAL):
1. **Never Repeat Yourself**: Use different phrasings each time...
2. **Rotate Scientific Reasons**: Explain from different angles...
3. **Context Awareness**: Reference previous sets...
4. **Personalization**: Add progress-based notes...
`;
```

### Live Coaching System

**Old Function:**
```typescript
generateSetSummary(totalReps, context, variationIndex)
// Uses hard-coded variations array
```

**New Function:**
```typescript
generateVariedSetSummary(totalReps, context)
// Uses variation engine with state tracking
```

## Testing Variation

```typescript
import { generateVariedSetSummary, resetVariationState } from '@/lib/coach/liveCoaching';

// Reset state
resetVariationState();

// Generate 5 summaries for same performance
const summaries = [];
for (let i = 1; i <= 5; i++) {
  const summary = generateVariedSetSummary(5, {
    target_rep_range: [3, 6],
    exercise_name: 'Squat',
    set_number: i,
    user_training_age: 'intermediate',
  });
  summaries.push(summary);
}

// Verify all feedback texts are different
const feedbackTexts = summaries.map(s => s.feedback);
const uniqueFeedback = new Set(feedbackTexts);
console.assert(uniqueFeedback.size === 5, "All feedback should be unique!");

// Verify scientific angles rotate
const angles = summaries.map(s => s.scientific_insight);
console.log("Scientific explanations:", angles);
// Should show different angles: mechanical_tension, motor_recruitment, etc.
```

## Best Practices

### 1. Reset State Per Session
```typescript
// At start of workout
resetVariationState();
```

### 2. Provide Context When Available
```typescript
// Track previous set results
let previousReps = 0;
let previousFeedback: 'perfect' | 'too_light' | 'too_heavy' | 'slightly_over';

const summary = generateVariedSetSummary(currentReps, {
  // ... other fields
  previous_set_reps: previousReps,
  previous_set_feedback: previousFeedback,
  total_sets_today: setNumber,
  recent_trend: 'consistent',
});

// Update for next set
previousReps = currentReps;
previousFeedback = determineFeedbackType(currentReps);
```

### 3. Use Enhanced Prompts for Gemini
```typescript
// For AI-generated feedback
const prompt = buildEnhancedSetSummaryPrompt(totalReps, context);
// Includes variation instructions and context

// Use enhanced system prompt
const systemPrompt = ENHANCED_GEMINI_SYSTEM_PROMPT;
```

### 4. Display All Feedback Fields
```typescript
const summary = generateVariedSetSummary(reps, context);

// Display to user:
console.log(summary.feedback); // Main feedback
console.log(summary.next_set_guidance); // Actionable advice
console.log(summary.scientific_insight); // Educational tip
if (summary.contextual_feedback) {
  console.log(summary.contextual_feedback); // Compares to previous set
}
if (summary.personalized_note) {
  console.log(summary.personalized_note); // Progress encouragement
}
```

## Performance Considerations

- **State Size**: Tracks last 5 angles, 8 phrases, 10 feedback contexts
- **Memory**: ~1-2 KB per session
- **Speed**: O(1) lookups, negligible overhead

## Future Enhancements

1. **Persistent State**: Save to localStorage between sessions
2. **User Preferences**: Let users choose tone (more/less technical)
3. **A/B Testing**: Compare repetitive vs varied feedback engagement
4. **Multilingual**: Variation pools in multiple languages
5. **Voice Variation**: Different personas (calm, direct, playful)

---

**Created**: 2025-10-16
**Module**: [src/lib/coach/variationEngine.ts](../src/lib/coach/variationEngine.ts)
**Integration**: [src/lib/coach/liveCoaching.ts](../src/lib/coach/liveCoaching.ts), [src/lib/coach/geminiClient.ts](../src/lib/coach/geminiClient.ts)
