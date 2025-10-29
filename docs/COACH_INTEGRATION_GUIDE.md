# Rest Screen Coach - Integration Guide

## Quick Start

### 1. Access the Demo

```bash
npm run dev
```

Then navigate to your app and manually add a route for the demo, or use the component directly:

```tsx
import { DemoRestCoach } from '@/screens/DemoRestCoach';

// In your router or App.tsx
<Route path="/demo-rest-coach" element={<DemoRestCoach />} />
```

### 2. Using RestCoach in Your App

```tsx
import { RestCoach } from '@/components/coach/RestCoach';
import type { CoachRequest } from '@/lib/coach/types';

function YourRestScreen() {
  const request: CoachRequest = {
    version: 'coach-v1',
    user_profile: {
      training_age: 'intermediate',
      goal: 'quad_strength',
      equipment: ['barbell', 'db'],
      time_budget_min: 30,
    },
    session_context: {
      plan_step: 'quads_block_1',
      target_rep_range: '6-8',
      target_fatigue_window: '7-10',
      recent_swaps_this_week: 0,
    },
    set_telemetry: {
      set_index: 2,
      rep_count: 8,
      fatigue_rep: 7,
      symmetry_pct: 92,
      rms_drop_pct: 14,
      ror_ok: true,
      signal_confidence: 0.91,
      pain_flag: 0,
      user_prev_decision: 'none',
    },
    ui_capabilities: {
      allow_override: true,
      allow_swap: true,
      projection_enabled: true,
    },
  };

  const handleDecision = (decision) => {
    console.log('User chose:', decision);
    // Navigate to next set or end session
  };

  return (
    <RestCoach
      request={request}
      onDecision={handleDecision}
      onTimerEnd={() => console.log('Timer complete!')}
    />
  );
}
```

### 3. Running Tests

```bash
# Run all coach contract tests
npm run test:coach

# Watch mode for development
npm run test:coach:watch
```

## Data Flow

```
User completes set
       ↓
Collect telemetry (fatigue_rep, symmetry_pct, signal_confidence, etc.)
       ↓
Construct CoachRequest
       ↓
Pass to RestCoach component
       ↓
RestCoach → geminiClient → /api/gemini/coach
       ↓
Validate response with Zod
       ↓
Apply safety constraints
       ↓
Display advice (two lines + timer + buttons)
       ↓
User clicks button → emitUserDecision
       ↓
onDecision callback → navigate or update state
```

## Connecting Telemetry

To receive coach telemetry events in your app:

```typescript
// In your app initialization
import { installTelemetryHandler } from '@/lib/coach/telemetry';

installTelemetryHandler((eventName, payload) => {
  // Send to your analytics service
  analytics.track(eventName, payload);

  // Or log to your backend
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({ event: eventName, data: payload }),
  });
});
```

## Environment Variables

Add to your `.env.local`:

```bash
# For production: set to your actual Gemini API key
VITE_GEMINI_API_KEY=your_key_here

# For development: use mock responses
VITE_MOCK_COACH=1
```

## API Integration

### Option 1: Mock Mode (Default)

The Vite plugin intercepts requests to `/api/gemini/coach` and returns fixture data.
Perfect for development and testing.

### Option 2: Real Gemini API

1. Update [src/api/gemini/coach.ts](../src/api/gemini/coach.ts):

```typescript
export async function handleCoachRequest(
  systemPrompt: string,
  request: CoachRequest
): Promise<CoachAdvice> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nRequest:\n${JSON.stringify(request, null, 2)}\n\nRespond with valid JSON only.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
        }
      }),
    }
  );

  const data = await response.json();
  const jsonText = data.candidates[0].content.parts[0].text;
  return JSON.parse(jsonText);
}
```

2. Set `VITE_MOCK_COACH=0` in your `.env.local`

3. Restart dev server

### Option 3: Server-Side API Route (Recommended for Production)

If using Next.js or a backend server, create an API route:

```typescript
// pages/api/gemini/coach.ts (Next.js)
import type { NextApiRequest, NextApiResponse } from 'next';
import { handleCoachRequest } from '@/api/gemini/coach';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { systemPrompt, request } = req.body;

  try {
    const advice = await handleCoachRequest(systemPrompt, request);
    res.status(200).json(advice);
  } catch (error) {
    console.error('Coach API error:', error);
    res.status(500).json({ error: 'Failed to generate advice' });
  }
}
```

## State Management

Example integration with session state:

```tsx
import { useState } from 'react';
import { RestCoach } from '@/components/coach/RestCoach';
import { emitNextSetOutcome } from '@/lib/coach/telemetry';
import type { CoachRequest } from '@/lib/coach/types';

function WorkoutSession() {
  const [currentAdviceId, setCurrentAdviceId] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState({
    setIndex: 0,
    history: [],
  });

  const buildRequest = (): CoachRequest => {
    // Build request from current session state
    return {
      version: 'coach-v1',
      user_profile: { /* from user profile */ },
      session_context: { /* from workout plan */ },
      set_telemetry: { /* from last completed set */ },
      ui_capabilities: { /* from app config */ },
    };
  };

  const handleDecision = ({ decision, reason_code }) => {
    if (decision === 'did') {
      // Proceed to next set
      setSessionState(prev => ({ ...prev, setIndex: prev.setIndex + 1 }));
    } else if (decision === 'skip') {
      // Mark set as skipped
      setSessionState(prev => ({ ...prev, skipped: true }));
    }
    // Navigate to next screen
  };

  const handleSetComplete = (metrics) => {
    // After next set completes, report outcome
    if (currentAdviceId) {
      emitNextSetOutcome({
        advice_id: currentAdviceId,
        actual_reps: metrics.reps,
        actual_fatigue_rep: metrics.fatigue_rep,
        actual_symmetry_pct: metrics.symmetry,
        advice_followed: true,
      });
    }
  };

  return (
    <RestCoach
      request={buildRequest()}
      onDecision={handleDecision}
      onTimerEnd={() => console.log('Rest complete')}
    />
  );
}
```

## Custom Styling

The RestCoach component uses Tailwind classes. To customize:

```tsx
// Create a wrapper with your custom styles
function CustomRestCoach(props) {
  return (
    <div className="custom-rest-screen">
      <RestCoach {...props} />
    </div>
  );
}
```

Or fork the component and modify the Tailwind classes directly in [RestCoach.tsx](../src/components/coach/RestCoach.tsx).

## Accessibility

The component is accessible out-of-the-box:

- ✅ ARIA labels on buttons
- ✅ `aria-live` on timer for screen readers
- ✅ Keyboard navigation support
- ✅ High contrast colors (amber for safety, blue for primary actions)

To test with a screen reader:
- macOS: Cmd+F5 to enable VoiceOver
- Windows: Win+Ctrl+Enter for Narrator

## Troubleshooting

### "No advice available" error

Check:
1. Mock API plugin is loaded in `vite.config.ts`
2. Dev server is running
3. Console for API errors

### Tests failing

```bash
# Clear vitest cache
rm -rf node_modules/.vitest

# Re-run tests
npm run test:coach
```

### TypeScript errors

```bash
# Regenerate type definitions
npm run build
```

## Production Deployment

1. **Set environment variables:**
   ```bash
   VITE_GEMINI_API_KEY=your_production_key
   VITE_MOCK_COACH=0
   ```

2. **Wire real API endpoint** (see Option 2 or 3 above)

3. **Configure telemetry handler** to send to your analytics service

4. **Monitor fallback rate:**
   - Target: <1% of requests should fallback
   - If higher, check Gemini API latency/errors

5. **A/B test projection threshold:**
   - Default: CI >= 0.7
   - Test 0.8 for more conservative projections

## Examples in Fixtures

See [src/mocks/coachFixtures.ts](../src/mocks/coachFixtures.ts) for 12 complete examples covering:

- Early fatigue → reduce effort
- No fatigue → increase effort
- In-window → maintain
- Symmetry issues → suggest unilateral
- Pain flags → safety check
- Low signal → check electrode
- User agency → allow overrides
- Session end → stop exercise

Each fixture includes both the request and expected response.

## Need Help?

- **Documentation:** [REST_COACH_IMPLEMENTATION.md](./REST_COACH_IMPLEMENTATION.md)
- **Tests:** [coach.contract.test.ts](../src/tests/coach.contract.test.ts)
- **Demo:** Run `npm run dev` and visit `/demo-rest-coach`

---

**Questions?** Check console logs for telemetry events and API responses.
