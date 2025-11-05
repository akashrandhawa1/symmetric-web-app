# Coach Milo Intake Improvements - Phase 2 Implementation

## Overview

Phase 2 builds upon Phase 1 by adding 3 **optional** questions that significantly boost adherence and enable advanced personalization. These questions are designed to optimize exercise timing, increase user motivation, and allow for goal-specific periodization.

## Implementation Date
2025-11-04

## Changes Summary

### What Was Added
- 3 new optional questions focused on adherence and advanced personalization
- Enhanced plan generation logic for goal-specific periodization
- Exercise substitution logic based on user preferences
- CNS exercise timing optimization based on training time

---

## New Questions Added (Phase 2)

### 1. Specific Target (OPTIONAL) ✨
**Question:** "Any specific target? (like 'squat 315' or 'first pull-up'—or skip)"

**Format:** Free text input with skip option

**Examples:**
- "Squat 315lbs"
- "First unassisted pull-up"
- "Bench press 225lbs"
- "Deadlift 405lbs"
- "Run a sub-6 minute mile"
- "10 consecutive pistol squats"

**Why This Matters:**
Having a specific, measurable target allows for **reverse-engineered periodization**:
- Know exactly where you need to peak
- Build progressive overload cycles that lead to the target
- Create milestone checkpoints along the way
- Adjust volume and intensity to match timeline

**Impact on Plan:**
```typescript
// Example periodization for "Squat 315lbs" in 12 weeks
Weeks 1-4: Foundation (Build volume, work up to 275lbs for reps)
Weeks 5-8: Strength Phase (Heavy singles at 285-295lbs)
Weeks 9-11: Peak Phase (Reduce volume, increase intensity to 300-305lbs)
Week 12: Test Week (Attempt 315lbs max)
```

**When to Ask:**
- After user specifies primary_goal
- ONLY if goal is strength/muscle/sport (not for general fitness or rehab)
- Allow skipping if user doesn't have a specific target

---

### 2. Training Time (OPTIONAL) ✨
**Question:** "When do you usually train—morning, midday, evening, or varies?"

**Options:**
- 🌅 Morning (before 10am)
- ☀️ Midday (10am-5pm)
- 🌙 Evening (after 5pm)
- 🔄 Varies

**Why This Matters:**
**Circadian rhythms** affect performance and CNS capacity:
- **Morning:** Lower body temp, stiff joints, but fresh CNS
- **Midday:** Peak body temperature, optimal strength performance
- **Evening:** Accumulated fatigue from work, but flexible joints
- **Varies:** Need autoregulation and flexible programming

**Impact on Plan:**

#### Morning Training
```
Session Structure:
- Extended warm-up (10-12 min) for joint mobility
- CNS-demanding work early (heavy squats, deadlifts)
- Avoid max testing first thing (injury risk)
- Consider dynamic stretching before lifting
```

#### Evening Training
```
Session Structure:
- Shorter warm-up (5-7 min) - already warm from day
- Account for accumulated stress/fatigue from work
- May reduce intensity caps by 5-10% (RPE 8 vs RPE 9)
- Include stress-relief movements (carries, sleds)
```

#### Varies
```
Session Structure:
- Use autoregulation (RPE-based loading)
- Flexible exercise order
- Have backup plans for high-fatigue days
```

**Exercise Timing Example:**
```typescript
if (training_time === 'morning') {
  // Place CNS-demanding work first when fresh
  session = [
    'Heavy Squat (low-bar)',    // Most demanding
    'RDL',                       // Moderate
    'Leg Extensions'             // Light, pump work
  ];
} else if (training_time === 'evening') {
  // Account for fatigue, use sub-maximal work
  session = [
    'Box Squat @ RPE 7-8',      // Controlled, safer
    'Goblet Squat',              // Higher rep, less CNS demand
    'Leg Curl'                   // Isolation
  ];
}
```

---

### 3. Exercise Preferences (OPTIONAL) ✨
**Question:** "Any exercises you love or hate? (optional)"

**Format:** Multi-entry tag input
- **Loves:** [Squats, Deadlifts, Pull-ups, ...]
- **Hates:** [Burpees, Lunges, Bench Press, ...]

**Common Loves:**
- Squats, Deadlifts, Pull-ups, Bench Press, Barbell Rows
- Olympic lifts (Cleans, Snatches)
- Loaded carries, Farmer's walks
- Sled pushes/pulls

**Common Hates:**
- Burpees, Lunges, Running, Planks
- Overhead Press, Turkish Get-Ups
- High-rep leg work, Wall sits
- Isolation work (curls, extensions)

**Why This Matters:**
**Adherence is king.** Users who enjoy their training are 3x more likely to stick with it long-term.

- If user loves Squats → Program squats 2-3x/week, use variations
- If user hates Lunges → Substitute with Bulgarian Split Squats, Step-Ups, or Single-Leg Press
- Never force hated movements when similar stimulus exists

**Impact on Plan:**

#### Exercise Substitution Logic
```typescript
// User hates: "Burpees, Running"
// Goal: Conditioning/Fat loss

Original Plan:
- Burpees: 4 rounds of 10 reps
- 20 min jog

Adjusted Plan:
- Kettlebell Swings: 4 rounds of 15 reps (similar metabolic demand, no jumping)
- Sled Push: 8 x 30 yards (low-impact conditioning)
```

#### Exercise Frequency
```typescript
// User loves: "Deadlifts"
// Goal: Build strength

Original Plan:
- Deadlift 1x/week (conventional)

Adjusted Plan:
- Conventional Deadlift 1x/week (heavy)
- Romanian Deadlift 1x/week (volume)
- Block Pulls 1x/week (overload)
// Now hitting deadlift pattern 3x/week in different ways
```

#### Movement Pattern Substitution Table

| Hated Movement | Stimulus | Better Alternatives |
|----------------|----------|---------------------|
| Burpees | Full-body conditioning | Kettlebell swings, Battle ropes, Sled pushes |
| Lunges | Single-leg strength | Bulgarian split squats, Step-ups, Single-leg press |
| Running | Cardio conditioning | Rowing, Assault bike, Swimming, Sled drags |
| Bench Press | Horizontal push | Dumbbell press, Push-ups, Dips |
| Overhead Press | Vertical push | Landmine press, Incline press, Pike push-ups |
| Planks | Core stability | Dead bugs, Pallof press, Carries |

---

## Updated Question Flow (10-15 Questions)

### TIER 1: Identity & Goals (3-4 questions)
1. **name** - Rapport
2. **primary_goal** - Direction (strength, muscle, sport, rehab, general)
3. **specific_target** ✨ PHASE 2 OPTIONAL - Measurable goal
4. **body_composition** - Body comp target

### TIER 2: Current State (4 questions)
5. **training_context** - Experience level
6. **baseline_fitness** - Movement capability
7. **age_range** - Recovery capacity
8. **limitations** - Injuries, pain, mobility

### TIER 3: Context & Preferences (3-4 questions, SOME CONDITIONAL)
9. **activity_recovery** - Daily activity + sleep + stress
10. **sport_context** - CONDITIONAL: Only if sport goal
11. **training_time** ✨ PHASE 2 OPTIONAL - When do you train?
12. **exercise_preferences** ✨ PHASE 2 OPTIONAL - Loves/hates

### TIER 4: Logistics (2 questions)
13. **equipment_session** - Equipment + session length
14. **frequency_commitment** - Days/week + duration

**Total Time:** 3-5 minutes (optimal: 4 minutes)
**Questions:** 10-15 depending on conditionals and optional skips
**Completion Rate Target:** 75-80%

---

## Files Modified

### 1. `/src/coach/intake/contextMap.ts`
**Changes:**
- Added Phase 2 topics to `Topic` type:
  - `specific_target`
  - `training_time`
  - `exercise_preferences`
- Updated `coverageScore()` to include Phase 2 topics as medium-value (1 point each)
- These are optional, so don't affect minimum operational requirements

### 2. `/src/coach/intake/scriptedFlow.ts`
**Changes:**
- Added Phase 2 topics to `SCRIPTED_TOPIC_SEQUENCE`
- Added chips for new topics:
  - `training_time`: 4 chips (morning, midday, evening, varies)
  - `specific_target`: Free text (empty chips array)
  - `exercise_preferences`: Multi-entry tags (empty chips array)
- Added persona lines explaining why each topic matters
- Updated `TOPIC_PHASE` mapping
- Updated `topicCategory()` function to route Phase 2 topics correctly

### 3. `/src/components/coach/miloIntakeAgent.ts`
**Changes:**
- Added Phase 2 slots to `IntakeSlots` type:
  - `specific_target`
  - `training_time`
  - `exercise_preferences`
- Updated `buildIntakeSystemPrompt()`:
  - Expanded from "10-12 questions" to "10-15 questions"
  - Added optional fields section with guidance
  - Included branching logic for asking specific_target
  - Added tone examples for all Phase 2 questions
- Updated `buildIntakeUserPrompt()`:
  - Added Phase 2 fields to `optional_fields` array
- Phase 2 fields NOT added to `minimalInfoSatisfied()` (they're optional!)

### 4. `/netlify/functions/coach-intake-next.ts`
**Changes:**
- **Enhanced** `buildPlanContext()`:
  - Added Phase 2 fields with clear labels
  - `specific_target`, `training_time`, `exercise_preferences`
- **Updated** `generateWrapWithGemini()` instructions:
  - Added "PHASE 2 PERSONALIZATION (if available)" section
  - Guidance on reverse-engineering periodization for specific targets
  - CNS exercise timing based on training time
  - Exercise substitution logic for preferences

---

## How Phase 2 Data Affects Plan Generation

### 1. Specific Target → Reverse-Engineered Periodization

#### Example: "Squat 315lbs in 12 weeks"

```typescript
// Current max: ~275lbs (estimated from training context)
// Target: 315lbs
// Timeline: 12 weeks
// Needed gain: 40lbs (14.5% increase)

Phase 1: Foundation (Weeks 1-4)
- Build work capacity and volume
- Goal: 285lbs for 3x3
- Volume: 12-15 sets/week
- Rep ranges: 4-6 reps

Phase 2: Strength (Weeks 5-8)
- Increase intensity, moderate volume
- Goal: 295lbs for 2x2
- Volume: 10-12 sets/week
- Rep ranges: 2-4 reps
- Include overwarm singles (305lbs)

Phase 3: Peak (Weeks 9-11)
- Taper volume, peak intensity
- Goal: 305lbs single, then back-off sets
- Volume: 6-8 sets/week
- Rep ranges: 1-3 reps

Phase 4: Test (Week 12)
- Deload first half of week
- Attempt 315lbs on day 5
- Backup attempts if needed
```

### 2. Training Time → CNS Exercise Timing

```typescript
// Morning trainer (before 10am)
session_structure = {
  warm_up: 12_minutes,  // Extra time for joint prep
  cns_work_first: true,  // Heavy squats/deads early
  exercise_order: [
    'Heavy Compound (Squat/Dead) @ RPE 7-8',  // Fresh CNS
    'Moderate Compound (RDL/Front Squat)',     // Still fresh
    'Accessories (Leg Press, Extensions)',     // Pump work
  ],
  avoid_max_testing: true,  // Too stiff for PRs
};

// Evening trainer (after 5pm)
session_structure = {
  warm_up: 7_minutes,   // Already warm from day
  account_for_fatigue: true,
  exercise_order: [
    'Moderate Compound @ RPE 7',  // Lower intensity cap
    'Single-Leg Work (Lunges)',   // Safer under fatigue
    'Carries / Sled',              // Stress relief
  ],
  intensity_cap: 'RPE_8',  // Avoid RPE 9 (fatigue risk)
};
```

### 3. Exercise Preferences → Substitution & Frequency

```typescript
// User loves: ["Squats", "Deadlifts"]
// User hates: ["Lunges", "Leg Press"]

original_plan = {
  day_1: ['Back Squat', 'Leg Press', 'Leg Curl'],
  day_2: ['Deadlift', 'Lunges', 'Leg Extension'],
};

adjusted_plan = {
  day_1: [
    'Back Squat',           // LOVED - keep
    'Front Squat',          // LOVED - added variation
    'Leg Curl',             // Neutral - keep
  ],
  day_2: [
    'Conventional Deadlift', // LOVED - keep
    'Bulgarian Split Squat', // HATED (lunges) → substitute
    'Romanian Deadlift',     // LOVED - added variation
  ],
};

// Result: Hit squat/deadlift pattern MORE frequently (user loves them)
// Removed hated movements, replaced with similar stimulus
```

---

## Advanced Personalization Examples

### Scenario 1: Powerlifter with Specific Target
```yaml
Inputs:
  - primary_goal: "Build max strength"
  - specific_target: "Squat 405lbs"
  - training_time: "Evening"
  - exercise_preferences:
      loves: ["Squats", "Deadlifts", "Rows"]
      hates: ["Overhead Press", "Olympic lifts"]

Plan Adjustments:
  - Periodization: 16-week cycle peaking at 405lbs squat
  - Evening sessions: Sub-maximal work, RPE 8 cap
  - Exercise selection: Heavy emphasis on squat variations (3x/week)
  - Substitutions: Replace overhead work with more row variations
  - Block structure:
      Weeks 1-6: Hypertrophy (volume focus, 5x5 at 80%)
      Weeks 7-12: Strength (intensity focus, 3x3 at 87%)
      Weeks 13-15: Peak (singles at 90-95%)
      Week 16: Test (405lbs attempt)
```

### Scenario 2: General Fitness with Hated Movements
```yaml
Inputs:
  - primary_goal: "General fitness"
  - training_time: "Morning"
  - exercise_preferences:
      loves: ["Pull-ups", "Carries"]
      hates: ["Burpees", "Running", "Lunges"]

Plan Adjustments:
  - Morning sessions: Extended warm-up, dynamic stretching
  - Conditioning substitutions:
      ❌ 20 min jog → ✅ 15 min assault bike
      ❌ Burpees → ✅ Kettlebell swings
  - Single-leg work substitutions:
      ❌ Lunges → ✅ Step-ups or Bulgarian split squats
  - Increase pull-up frequency: 3x/week (user loves them)
  - Add farmer carries every session: 2-3 sets (user loves them)
```

### Scenario 3: Athlete with Sport-Specific Target
```yaml
Inputs:
  - primary_goal: "Train for a sport"
  - sport_context: "Basketball"
  - specific_target: "40-inch vertical jump"
  - training_time: "Varies"
  - exercise_preferences:
      loves: ["Box jumps", "Olympic lifts"]
      hates: ["Long runs", "Static holds"]

Plan Adjustments:
  - Target: 40-inch vertical (requires explosive strength)
  - Periodization: 10-week power-focused cycle
  - Exercise selection: Olympic lift variations emphasized (user loves them)
  - Plyometric work: Box jumps 2x/week (user loves them)
  - Conditioning: Avoid long steady-state runs (user hates them)
      → Use basketball-specific HIIT instead
  - Autoregulation: Flexible programming since training time varies
  - Core work: Replace planks with dynamic movements (user hates static holds)
```

---

## Coverage Scoring (No Change)

Phase 2 questions are **optional** and don't affect minimum operational requirements:

### Current Scoring
```
Critical (3 pts): name, primary_goal, training_context, equipment_session, frequency_commitment
High-value (2 pts): body_composition, baseline_fitness, age_range, activity_recovery, limitations
Medium-value (1 pt): specific_target, training_time, exercise_preferences, sport_context
```

**COVERAGE_TARGET:** Still 23 points (Phase 2 adds bonus points, not requirements)

---

## Testing Checklist

### Manual Testing Required
- [ ] Specific target text input works and appears in plan
- [ ] Training time chips display correctly
- [ ] Exercise preferences multi-tag input works
- [ ] Plan generation uses specific target for periodization
- [ ] CNS exercises placed appropriately based on training time
- [ ] Hated exercises are substituted in plan
- [ ] Loved exercises appear more frequently
- [ ] Optional questions can be skipped without breaking flow
- [ ] Legacy format still works (no Phase 2 questions)

### Edge Cases
- [ ] Skip all optional questions → plan still generates
- [ ] Provide conflicting preferences (loves AND hates squats) → LLM handles gracefully
- [ ] Unrealistic specific target ("squat 600lbs" when new) → LLM adjusts expectations
- [ ] Training time "varies" → plan uses autoregulation
- [ ] No exercise preferences provided → plan uses balanced defaults

---

## Impact Summary

| Metric | Phase 1 | Phase 2 | Improvement |
|--------|---------|---------|-------------|
| **Questions** | 10-12 | 10-15 | +3 optional questions |
| **Completion Time** | 3-4 min | 3-5 min | +0-1 min (optional questions) |
| **Data Points** | 11 categories | 14 categories | +27% |
| **Expected Adherence** | Good | Excellent | Personalized > Generic |
| **Plan Specificity** | General goal | Specific target | Measurable progress |

### Key Improvements from Phase 2
- ✅ Users can now train toward **specific, measurable goals**
- ✅ CNS exercise timing optimized for **circadian performance**
- ✅ Exercise selection respects **user preferences** (adherence++)
- ✅ Plans **substitute hated movements** for similar stimulus
- ✅ Loved movements **programmed more frequently**
- ✅ Still maintains <5 minute completion time

---

## Technical Notes

### Optional Question Logic
Phase 2 questions are marked as optional in the LLM prompt:
```typescript
// In buildIntakeSystemPrompt()
OPTIONAL INFO (ask if time allows - boosts adherence):
- specific_target: Any specific measurable goal?
- sport_context: Sport details (ONLY if goal=sport)
- training_time: When do they usually train?
- exercise_preferences: Any movements they love or hate?
```

The LLM will:
1. Ask all required questions first (Phase 1)
2. Then optionally ask Phase 2 questions if user is engaged
3. Allow skipping any optional question
4. Generate plan even if all optional questions skipped

### Exercise Substitution Algorithm
```typescript
// Simplified version of what Gemini implements
function substituteExercises(
  plan: Exercise[],
  preferences: { loves: string[], hates: string[] }
): Exercise[] {
  return plan.map(exercise => {
    // If user hates this movement, substitute
    if (preferences.hates.includes(exercise.name)) {
      const substitute = findSimilarStimulus(exercise, preferences.hates);
      return { ...exercise, name: substitute };
    }

    // If user loves this movement, maybe add a variation
    if (preferences.loves.includes(exercise.movement_pattern)) {
      // Consider adding more volume or frequency
    }

    return exercise;
  });
}

function findSimilarStimulus(
  exercise: Exercise,
  avoid: string[]
): string {
  const substitution_map = {
    'Burpees': ['Kettlebell Swings', 'Battle Ropes', 'Sled Push'],
    'Lunges': ['Bulgarian Split Squat', 'Step-Ups', 'Single-Leg Press'],
    'Running': ['Rowing', 'Assault Bike', 'Sled Drag'],
    // ... more mappings
  };

  const options = substitution_map[exercise.name] || [exercise.name];
  return options.find(option => !avoid.includes(option)) || exercise.name;
}
```

---

## Next Steps (Future Phases)

### Phase 3 Ideas (Nice-to-Have):
1. **Training Partner Status**
   - Solo, with coach, with training partner
   - Impact: Social accountability, exercise selection (spotters)

2. **Music Preference**
   - Hype music, calm music, none/podcasts
   - Impact: Exercise tempo, rest period recommendations

3. **Previous Program History**
   - What have they tried before? What worked/didn't work?
   - Impact: Avoid repeating failed approaches

4. **Nutrition Context**
   - Tracking macros? Meal timing? Supplements?
   - Impact: Recovery recommendations, training volume

### UI Enhancements (Ongoing):
- [ ] Multi-tag input component for exercise preferences (loves/hates)
- [ ] Autocomplete for specific target (common examples)
- [ ] Info tooltips explaining why each question matters
- [ ] Progress bar shows "Optional questions remaining: 3"
- [ ] "Quick finish" button to skip remaining optional questions

---

## Notes

- Phase 2 questions are **truly optional** - users can skip without penalty
- Plans generated without Phase 2 data are still high-quality (thanks to Phase 1)
- Phase 2 adds **polish and personalization**, not core functionality
- LLM intelligently decides when to ask optional questions (if user is engaged)
- Exercise substitution maintains **similar stimulus** while respecting preferences
- Specific targets enable **measurable progress tracking** (future feature)

## Developer Notes

When adding more optional questions:
1. Add to `Topic` type in `contextMap.ts` (don't forget legacy compatibility)
2. Mark as medium-value (1 point) in coverage scoring
3. Add to `optional_fields` in `buildIntakeUserPrompt()`
4. Update LLM system prompt with clear "OPTIONAL" markers
5. Add personalization rules to `generateWrapWithGemini()` instructions
6. **DO NOT** add to `minimalInfoSatisfied()` check

---

**Implementation Status:** ✅ Phase 2 Complete (Backend + Logic)
**Remaining Work:** UI components for multi-tag input, testing with real users
