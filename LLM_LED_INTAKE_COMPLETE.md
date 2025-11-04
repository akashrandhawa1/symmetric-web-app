# LLM-Led Intake Implementation - Complete! ✅

Coach Milo now has **full freedom** to ask any question during intake, with NO fixed enums or rigid slot lists.

---

## What Was Built

### 1. Open Schema (`src/coach/intake/openSchema.ts`)
- ✅ Flexible `NextAction` type with 3 modes: `ask`, `confirm`, `done`
- ✅ No fixed fields - Milo can ask about ANY topic
- ✅ Built-in prescription guards (PRESCRIPTION_REGEX)
- ✅ Support for different question types: text, number, choice, yesno, date

### 2. Question Hints (`src/coach/intake/hints.ts`)
- ✅ Tone guidance for Milo
- ✅ Topic suggestions (sport, schedule, constraints, equipment)
- ✅ SCC mindset reminders

### 3. Updated Netlify Function (`netlify/functions/coach-intake-next.ts`)
- ✅ Expects `{answers, last_user_text}` instead of rigid schema
- ✅ Returns full `NextAction` JSON
- ✅ Multi-layer prescription sanitizer
- ✅ Few-shot examples in system prompt
- ✅ JSON mode for Gemini (`responseMimeType: 'application/json'`)

### 4. New Client Component (`src/components/coach/CoachMiloOnboardingOpen.tsx`)
- ✅ Dynamic conversation rendering
- ✅ Stores answers under `field_id` or `free_{timestamp}`
- ✅ Renders choice chips when `expected_type === "choice"`
- ✅ Handles all 3 action types: ask, confirm, done
- ✅ Direct Gemini API + Netlify function fallback

---

## How It Works

### Conversation Flow

```
1. Component mounts
   ├─ Sets phase to "intake"
   └─ Calls requestNext() with empty answers

2. LLM returns NextAction
   ├─ action: "ask" → Show Milo's question + optional choice chips
   ├─ action: "confirm" → Show summary + continue asking
   └─ action: "done" → Switch to preview phase

3. User responds
   ├─ Store under field_id if provided
   ├─ Otherwise store under free_{timestamp}
   └─ Call requestNext() again with updated answers

4. Repeat until done
```

### Example Conversation

**Milo's Freedom in Action:**

```json
// Milo can ask about sport
{"action":"ask","ask":{
  "question":"What sport or activity are you training for?",
  "field_id":"sport",
  "expected_type":"text"
}}

// User: "basketball"

// Milo can ask about position
{"action":"ask","ask":{
  "question":"What position—guard, forward, or center?",
  "field_id":"position",
  "expected_type":"choice",
  "choices":["Guard","Forward","Center"]
}}

// User: "guard"

// Milo can ask about upcoming games
{"action":"ask","ask":{
  "question":"Any big games coming up in the next 2 weeks?",
  "field_id":"upcoming_event",
  "expected_type":"yesno",
  "choices":["Yes","No"]
}}

// User: "yes"

// Milo can recommend and confirm
{"action":"confirm","confirm":{
  "summary":"2 days/week is fine. We'll raise session density so recovery works for you.",
  "missing_keys":["time_per_session"]
}}

// Eventually...
{"action":"done","done":{
  "summary":"strength • dumbbells • 45m • intermediate • sport: basketball",
  "derived_context":{"sport":"basketball","position":"guard","has_upcoming_game":true}
}}
```

---

## Safety Guardrails

### Multi-Layer Prescription Prevention

**Layer 1: System Prompt**
```
Never prescribe exercises/sets/reps/loads/rest.
Never mention readiness/fatigue/symmetry here.
```

**Layer 2: Regex Guard**
```typescript
const PRESCRIPTION_REGEX = /\b(\d+\s*x\s*\d+|sets?|reps?|rest|@ *rpe|% *1rm|kg|lb)\b/i;
```

**Layer 3: Server Sanitizer**
```typescript
if (looksLikePrescription(text)) {
  text = JSON.stringify({
    action: 'ask',
    ask: { question: 'What\'s your main focus—strength, muscle, general, or rehab?' }
  });
}
```

**Layer 4: Client Validation**
```typescript
if (parsed.action === "ask" && looksLikePrescription(parsed.ask?.question || "")) {
  return null; // triggers fallback
}
```

---

## Usage

### Switch to New Component

In your app entry point, swap the import:

**Before:**
```typescript
import CoachMiloOnboarding from './components/coach/CoachMiloOnboarding';
```

**After:**
```typescript
import CoachMiloOnboarding from './components/coach/CoachMiloOnboardingOpen';
```

### Example Integration

```tsx
<CoachMiloOnboardingOpen
  onComplete={() => {
    // User finished intake, show plan preview
    setScreen('preview');
  }}
/>
```

---

## API Schema

### Request to `/coach-intake-next`

```json
{
  "answers": {
    "name": "Alex",
    "sport": "basketball",
    "position": "guard",
    "free_1234567890": "I want to jump higher"
  },
  "last_user_text": "I want to jump higher"
}
```

### Response from `/coach-intake-next`

**Ask:**
```json
{
  "action": "ask",
  "ask": {
    "question": "How many days per week can you train?",
    "field_id": "days_per_week",
    "expected_type": "choice",
    "choices": ["2", "3", "4", "5+"],
    "rationale": "need to establish weekly volume capacity"
  }
}
```

**Confirm:**
```json
{
  "action": "confirm",
  "confirm": {
    "summary": "3 days/week works. We'll balance heavy and plyometric sessions.",
    "missing_keys": ["time_per_session", "equipment_access"]
  }
}
```

**Done:**
```json
{
  "action": "done",
  "done": {
    "summary": "vertical jump • 3×/week • 45m • intermediate • guard",
    "derived_context": {
      "sport": "basketball",
      "position": "guard",
      "primary_goal": "vertical_jump",
      "training_style": "explosive_power"
    }
  }
}
```

---

## SCC Behavior (Without Prescriptions)

### Recommend → Accept → Compensate

**Milo can recommend:**
```json
{
  "action": "ask",
  "ask": {
    "question": "I recommend 3×/week—what can you commit to?",
    "field_id": "days_per_week",
    "expected_type": "choice",
    "choices": ["1", "2", "3", "4+"]
  }
}
```

**Then compensate based on answer:**
```json
{
  "action": "confirm",
  "confirm": {
    "summary": "2× works—heavier/denser sessions; extra recovery helps.",
    "missing_keys": []
  }
}
```

**This is NOT prescribing** because:
- ✅ No specific exercises mentioned
- ✅ No sets/reps/loads
- ✅ Just strategic guidance

---

## Benefits vs. Old System

### Old System (Fixed Slots)
```typescript
// Hard-coded enum
type IntakeSlots = "name" | "goal" | "equipment" | "session_length" | "experience";

// Rigid parsing
if (slot === "goal") {
  if (/strength/.test(s)) return { value: "lower_body_strength" };
  if (/muscle/.test(s)) return { value: "build_muscle" };
  // ...
}
```

**Problems:**
- ❌ Can't ask about sport/position/upcoming events
- ❌ Can't adapt to user's context
- ❌ Robotic, predictable flow
- ❌ Miss important info (e.g., "I have a game Saturday")

### New System (Open Schema)
```typescript
// No fixed schema
type IntakeAnswers = Record<string, any>;

// LLM decides what to ask
{
  "action": "ask",
  "ask": {
    "question": "Any big games coming up in the next 2 weeks?",
    "field_id": "upcoming_event",
    "expected_type": "yesno"
  }
}
```

**Benefits:**
- ✅ Asks about anything relevant (sport, schedule, surfaces, etc.)
- ✅ Adapts to user's goals and context
- ✅ Natural, varied conversation
- ✅ Captures nuanced info for better plans

---

## Testing

### Test Cases

**1. Sport-Specific Intake**
```
User: "I play basketball"
Expected: Milo asks about position, jumping, upcoming games
```

**2. Time Constraints**
```
User: "I can only train in the morning"
Expected: Milo asks about specific time windows, equipment at gym
```

**3. Injury/Constraint**
```
User: "My knee hurts when I squat deep"
Expected: Milo asks about pain level, when it started, ROM limitations
```

**4. Prescription Guard**
```
If LLM somehow outputs: "Do 3x10 squats"
Expected: Sanitizer catches it, returns safe fallback question
```

### Console Logs to Check

```
[intake] Trying direct Gemini API...
[intake] ✓ Direct Gemini succeeded: {action:"ask",...}
```

Or:

```
[intake] Trying direct Gemini API...
[callGeminiDirect] No API key found
[intake] Trying Netlify function...
[intake] ✓ Netlify function succeeded: {action:"ask",...}
```

---

## Files Created/Modified

### Created
1. `src/coach/intake/openSchema.ts` - Open schema types
2. `src/coach/intake/hints.ts` - LLM guidance hints
3. `src/components/coach/CoachMiloOnboardingOpen.tsx` - New client component

### Modified
1. `netlify/functions/coach-intake-next.ts` - Returns NextAction JSON

### Unchanged (Still Works)
- Old `CoachMiloOnboarding.tsx` (can keep as fallback)
- Plan preview logic (same as before)
- Live coaching (separate phase)

---

## Next Steps

### 1. Switch to New Component

Update your app to use `CoachMiloOnboardingOpen`:

```typescript
// In your App.tsx or wherever intake is rendered
import CoachMiloOnboarding from './components/coach/CoachMiloOnboardingOpen';
```

### 2. Test with API Key

Make sure `.env.local` has:
```bash
VITE_GEMINI_API_KEY=AIzaSyAXSvvAPL05vi2f7HV42TvEX8fzFmwLO_o
```

### 3. Run and Test

```bash
npm run dev
```

Try different conversation flows:
- Say "I play basketball" and see Milo adapt
- Say "I have a game Saturday" and see context-aware questions
- Say "My knee hurts" and see Milo ask follow-ups

### 4. Monitor Console

Check that:
- Direct API or Netlify function succeeds
- No prescription warnings appear
- Milo returns valid NextAction JSON

---

## Phase Gates (Preserved)

```
intake → Uses this LLM-led system
preview → Shows deterministic plan preview (unchanged)
live → Enables streaming/live coach (separate system)
```

**Intake NEVER prescribes** - that's reserved for the `live` phase.

---

## Cost

**Gemini Free Tier:**
- 15 requests/minute
- 1,500 requests/day

**Typical Intake:**
- 5-8 questions per conversation
- Cost: **$0** for development

---

## Summary

You now have:

1. ✅ **Full LLM freedom** - Milo asks ANY relevant question
2. ✅ **No fixed schema** - Store answers under any field_id
3. ✅ **Safe intake** - Multi-layer prescription prevention
4. ✅ **SCC behavior** - Recommend → accept → compensate
5. ✅ **Smart UX** - Choice chips, dynamic rendering
6. ✅ **Works anywhere** - Direct API + Netlify fallback

**Status:** Ready to test! 🚀
