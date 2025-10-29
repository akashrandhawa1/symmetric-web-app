# Home Coach System - Implementation Guide

## Overview

The **Symmetric Home Coach** is an LLM-first, app-verified coaching system that provides personalized training guidance on the home screen. The system uses Gemini's function calling API to make intelligent decisions while the app maintains safety control through verification gates.

## Architecture

```
User sees Home Screen
         ↓
   useHomeCoach() hook
         ↓
   runHomeCoach() - Gemini Client
         ↓
   [Function Calling Flow]
   1. get_context() - Fetch app state
   2. project_action() - Simulate outcomes (optional)
   3. verify_plan() - App safety check (REQUIRED)
   4. Return JSON - Suggestion or Question
         ↓
   Zod Validation
         ↓
   HomeCoachCard UI
```

## Key Principles

### LLM-First + App-Verified
- **LLM leads**: Gemini chooses the coaching mode (TRAIN/ACTIVE_RECOVERY/FULL_REST)
- **App verifies**: Safety constraints applied before rendering
- **Deterministic fallback**: If LLM fails, app provides safe default

### Function Calling Flow
1. **get_context()**: LLM requests current app state (readiness, fatigue, session history)
2. **project_action()**: (Optional) LLM simulates outcomes of proposed actions
3. **verify_plan()**: (REQUIRED) App validates safety of LLM's chosen mode
4. **Final JSON**: LLM returns Suggestion or Question

### Safety Gates
- HR warnings → Force FULL_REST
- Recent same-muscle work (<24h) → Force ACTIVE_RECOVERY
- Low symmetry → Block heavy training
- Fatigue zones (GREEN/YELLOW/ORANGE/RED) → Adjust intensity

## File Structure

```
src/coach/
├── types.ts              # TypeScript types for Home Coach
├── prompt.ts             # System prompt for Gemini API
├── validator.ts          # Zod schemas for LLM output validation
├── fallback.ts           # Deterministic fallback logic
├── tools.ts              # Function calling tool adapters
├── gemini.ts             # Gemini client with function calling orchestration
├── useHomeCoach.ts       # React hook for UI integration
└── __tests__/
    └── homeCoach.test.ts # Unit tests

src/components/
└── HomeCoachCard.tsx     # UI component for rendering coach guidance
```

## Core Files

### 1. types.ts
Defines all TypeScript types:

**CoachMode**: `TRAIN` | `ACTIVE_RECOVERY` | `FULL_REST`
**FatigueZone**: `GREEN` | `YELLOW` | `ORANGE` | `RED`
**ReadinessBand**: `HIGH` (≥80) | `MID` (65-79) | `LOW` (<65)

**CoachJSON** (Discriminated Union):
- **SuggestionJSON**: Direct guidance with mode, message, CTA, optional secondary text
- **QuestionJSON**: Clarification request (no mode, no CTA)

**Tool Types**:
- **ContextPayload**: Current app state for get_context()
- **Projection**: Simulated outcome for project_action()
- **VerifyResult**: Safety check result for verify_plan()

### 2. prompt.ts
Contains `HOME_COACH_SYSTEM_PROMPT` with:
- Role definition (sharp, funny personal trainer with science brain)
- Signal bands (readiness, fatigue zones)
- Decision rules (safety gates, cooldown gates, readiness matrix)
- Style guidelines (no openers, 2 sentences max, direct guidance)
- Tool definitions and required flow
- Output format (JSON only)

### 3. validator.ts
Zod schemas for runtime validation:

```typescript
validateCoachJSON(raw: unknown): CoachJSON
// Throws on validation error

safeValidateCoachJSON(raw: unknown): { success: true, data: CoachJSON } | { success: false, error: string }
// Returns error object instead of throwing
```

**Validation Rules**:
- Message: 4-240 characters
- CTA: 2-60 characters
- Secondary: ≤60 characters (optional)
- Mode: Must be valid CoachMode enum value

### 4. fallback.ts
Deterministic fallback when LLM fails:

```typescript
fallbackCoach(mode: CoachMode): CoachJSON
// Returns pre-written suggestion for given mode

determineFallbackMode(signals: {...}): CoachMode
// Chooses safe mode based on basic signals

fullFallback(signals?: {...}): CoachJSON
// Complete fallback with auto-detection
```

**Fallback Priority**:
1. Safety flags (HR warning, high fatigue) → FULL_REST
2. Cooldown period (<24h) → ACTIVE_RECOVERY
3. Readiness ≥70 → TRAIN
4. Readiness 55-69 → ACTIVE_RECOVERY
5. Readiness <55 → FULL_REST
6. No signals → ACTIVE_RECOVERY (conservative default)

### 5. tools.ts
Function calling tool adapters:

**getContext()**: Fetches app state (readiness, symmetry, fatigue, history)
**projectAction(action_id)**: Simulates outcome of proposed action
**verifyPlan(mode)**: App validates LLM's chosen mode (REQUIRED)
**commitAction(action_id)**: Commits user action to session log

**Features**:
- 8-second timeout per request (AbortController)
- Up to 2 retries with exponential backoff
- Proper error handling with typed errors
- Placeholder API endpoints (/api/coach/*)

### 6. gemini.ts
Gemini client with function calling orchestration:

```typescript
runHomeCoach(): Promise<CoachJSON>
// Main entry point for coaching flow
```

**Flow Enforcement**:
- Max 8 function calling rounds (prevent infinite loops)
- verify_plan() REQUIRED before suggestions (enforced)
- Questions bypass verify_plan requirement
- Zod validation on final JSON
- Fallback on any error (API, validation, timeout)

**Tool Registry**:
Maps tool names to implementation functions for dynamic dispatch.

### 7. useHomeCoach.ts
React hook for UI integration:

```typescript
const { coaching, isLoading, error, refresh } = useHomeCoach();
```

**Features**:
- Auto-fetch on mount (configurable)
- Manual refresh via refresh()
- Error handling with fallback
- Loading states
- Optional signal overrides for testing

### 8. HomeCoachCard.tsx
UI component for rendering coach guidance:

**Props**:
- `coaching`: CoachJSON (suggestion or question)
- `receipts`: App numbers (readiness, symmetry, weekly progress)
- `onStartStrength`, `onStartRecovery`, `onPlanTomorrow`: Action handlers
- `isLoading`: Loading overlay

**Features**:
- Mode-based theming (TRAIN=blue, ACTIVE_RECOVERY=yellow, FULL_REST=gray)
- Compact card design (message + CTA + receipts)
- Loading skeleton component
- Active state animations
- Accessibility-ready

## Usage Example

```tsx
import { useHomeCoach } from '../coach/useHomeCoach';
import { HomeCoachCard } from '../components/HomeCoachCard';

function HomeScreen() {
  const { coaching, isLoading, error, refresh } = useHomeCoach();

  if (isLoading) {
    return <HomeCoachCardSkeleton />;
  }

  if (!coaching) {
    return null;
  }

  return (
    <HomeCoachCard
      coaching={coaching}
      receipts={{
        readiness: 85,
        symmetryPct: 92,
        weeklyDone: 2,
        weeklyTarget: 4,
      }}
      onStartStrength={() => console.log('Starting strength training')}
      onStartRecovery={() => console.log('Starting recovery session')}
      onPlanTomorrow={() => console.log('Planning tomorrow')}
      isLoading={isLoading}
    />
  );
}
```

## API Endpoints (To Be Implemented)

### GET /api/coach/context
Returns current app state for LLM decision-making.

**Response**: `ContextPayload`

### POST /api/coach/project
Simulates outcome of proposed action.

**Request**: `{ action_id: string }`
**Response**: `Projection`

### POST /api/coach/verify
Validates safety of LLM's chosen mode.

**Request**: `{ mode: CoachMode }`
**Response**: `VerifyResult`

### POST /api/coach/commit
Commits user action to session log.

**Request**: `{ action_id: string }`
**Response**: `{ ok: boolean }`

### POST /api/gemini/home-coach
Main Gemini API endpoint with function calling.

**Request**:
```json
{
  "systemPrompt": "...",
  "messages": [...],
  "tools": [...]
}
```

**Response**:
```json
{
  "text": "...",
  "functionCalls": [...]
}
```

## Testing

Run unit tests:
```bash
npm test src/coach/__tests__/homeCoach.test.ts
```

**Test Coverage**:
- ✅ Zod validation (valid/invalid inputs)
- ✅ Fallback mode determination
- ✅ verify_plan enforcement
- ✅ Function calling flow
- ✅ Error handling
- ✅ Max rounds protection

## Voice & Style

### Core Principles
- **No conversational openers**: Never "Hey there!" or "Looking good!"
- **2 sentences max**: Primary + secondary (optional)
- **Direct guidance**: Tell them what to do and why
- **Science-backed**: Reference signals, zones, and thresholds
- **Agency-preserving**: Invite, don't command

### Example Outputs

**TRAIN Mode:**
> "Your readiness is 85 and fatigue is green—ideal for a strength block. Hit 3-6 reps, rest 90s, and stop when power or balance slips."

**ACTIVE_RECOVERY Mode:**
> "You're at 68 readiness with muscle cooldown still active. Light cardio and mobility for 20-30 minutes banks the work without fighting recovery."

**FULL_REST Mode:**
> "HR warning detected and readiness dropped to 52. Call it for today—sleep, protein, and a short walk set up a better block."

**Question:**
> "How's your soreness level compared to yesterday?"

## Next Steps

1. **Implement API Endpoints**: Create backend handlers for tool functions
2. **Integrate into HomeScreen**: Wire up HomeCoachCard in home screen UI
3. **Connect Real Data**: Feed actual sEMG readiness and session data
4. **Add Telemetry**: Track LLM decisions, tool calls, and user actions
5. **A/B Testing**: Compare LLM vs fallback coaching outcomes

## Debugging

Enable detailed logging:
```typescript
// In gemini.ts, all function calls are logged:
console.log('[HomeCoach] Round N: Calling Gemini API');
console.log('[HomeCoach] Executing tool: toolName', args);

// In useHomeCoach.ts:
console.log('[useHomeCoach] Fetching coaching...');
console.log('[useHomeCoach] Success:', result);
```

Check browser console for:
- Function call sequences
- Tool execution results
- Validation errors
- Fallback triggers

## Safety Philosophy

The app always has final say on safety:
- LLM proposes → App verifies → User sees
- Any safety violation → Override to safe mode
- Any validation failure → Fallback coaching
- Any API error → Conservative fallback

This ensures users never receive unsafe guidance, even if the LLM makes a mistake.
