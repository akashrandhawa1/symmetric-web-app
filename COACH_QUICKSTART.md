# Rest Screen Coach - Quick Start Guide

## ✅ Status: Ready to Use

The Gemini-driven Rest Screen Coach has been successfully implemented and is ready for integration.

## 🚀 Running the Demo

### 1. Start the Development Server

```bash
npm run dev
```

The server will start on http://localhost:3000 (or another port if 3000 is busy).

### 2. Access the Demo

To access the interactive demo, you'll need to wire it into your app's routing. Here are the options:

#### Option A: Add to Existing Router (Recommended)

If your app uses React Router, add this route:

```tsx
// In your App.tsx or router configuration
import { DemoRestCoach } from '@/screens/DemoRestCoach';

// Add to your routes:
<Route path="/demo-rest-coach" element={<DemoRestCoach />} />
```

Then navigate to: http://localhost:3000/demo-rest-coach

#### Option B: Replace App.tsx Temporarily

For a quick test, temporarily replace your App.tsx content:

```tsx
import { DemoRestCoach } from '@/screens/DemoRestCoach';

function App() {
  return <DemoRestCoach />;
}

export default App;
```

#### Option C: Use the Component Directly

Import and use RestCoach anywhere in your app:

```tsx
import { RestCoach } from '@/components/coach';
import { inWindowRequest } from '@/mocks/coachFixtures';

function MyRestScreen() {
  return (
    <RestCoach
      request={inWindowRequest}
      onDecision={(d) => console.log('Decision:', d)}
    />
  );
}
```

## 🧪 Running Tests

```bash
# Run all coach tests
npm run test:coach

# Watch mode for development
npm run test:coach:watch

# Check TypeScript types
npx tsc --noEmit
```

All 35 tests should pass ✅

## 📋 What's Included

### Core Features
- ✅ Two-line coach text (primary + secondary)
- ✅ Countdown timer (auto-start, pulse on complete)
- ✅ Three action buttons (Did it / Skip / Do anyway)
- ✅ Optional projection chip (when CI ≥ 0.7)
- ✅ Conditional safety banner
- ✅ Reason modal for skip/override
- ✅ Telemetry event tracking

### Test Fixtures (12 Scenarios)
1. Early Fatigue → reduce effort
2. No Fatigue → increase effort
3. In Window → maintain
4. Symmetry Issue → suggest unilateral
5. Pain Flag → safety check
6. Low Signal → check electrode
7. Override History → allow agency
8. End Exercise → finish session
9. Projection Absent → CI < 0.7
10. Swap Suggested → offer alternative
11. High Confidence → precise guidance
12. Time Budget → quality over volume

### Mock API
The dev server includes a mock API at `/api/gemini/coach` that intelligently selects responses based on telemetry:
- Pain flag > 0 → pain response
- Signal confidence < 0.7 → low signal response
- Fatigue rep < 6 → early fatigue response
- No fatigue → increase effort response
- Default → in-window response

## 📖 Basic Usage Example

```tsx
import { RestCoach } from '@/components/coach';
import type { CoachRequest } from '@/lib/coach/types';

function RestScreen() {
  // Build request from your session telemetry
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
      fatigue_rep: 7,          // Rep at which fatigue occurred
      symmetry_pct: 92,         // Left/right symmetry %
      rms_drop_pct: 14,         // RMS signal drop %
      ror_ok: true,             // Rate of rise OK
      signal_confidence: 0.91,  // 0-1 signal quality
      pain_flag: 0,             // 0-10 pain level
      user_prev_decision: 'none',
    },
    ui_capabilities: {
      allow_override: true,
      allow_swap: true,
      projection_enabled: true,
    },
  };

  const handleDecision = ({ decision, reason_code }) => {
    console.log('User chose:', decision);
    if (reason_code) {
      console.log('Reason:', reason_code);
    }
    // Navigate to next set or end session
  };

  return (
    <RestCoach
      request={request}
      onDecision={handleDecision}
      onTimerEnd={() => console.log('Rest complete!')}
    />
  );
}
```

## 🔧 Environment Variables

Add to your `.env.local`:

```bash
# For development (uses mock responses)
VITE_MOCK_COACH=1

# For production (real Gemini API)
VITE_GEMINI_API_KEY=your_api_key_here
VITE_MOCK_COACH=0
```

## 📊 Telemetry Integration

To receive analytics events:

```typescript
import { installTelemetryHandler } from '@/lib/coach/telemetry';

// In your app initialization
installTelemetryHandler((eventName, payload) => {
  console.log('Coach event:', eventName, payload);

  // Send to your analytics service
  // analytics.track(eventName, payload);
});
```

Three events are emitted:
1. `coach_advice_shown` - When advice loads
2. `coach_user_decision` - When user clicks button
3. `coach_next_set_outcome` - After next set (call manually)

## 🎨 Demo Features

The demo screen includes:
- Dropdown to select any of 12 fixtures
- Live display of request telemetry
- Live display of expected advice
- Tag visualization
- Console logging of telemetry events
- Force remount when switching fixtures

## 📚 Documentation

- **[docs/REST_COACH_IMPLEMENTATION.md](./docs/REST_COACH_IMPLEMENTATION.md)** - Technical architecture
- **[docs/COACH_INTEGRATION_GUIDE.md](./docs/COACH_INTEGRATION_GUIDE.md)** - Integration guide with examples
- **[docs/COACH_IMPLEMENTATION_SUMMARY.md](./docs/COACH_IMPLEMENTATION_SUMMARY.md)** - Verification checklist

## 🐛 Troubleshooting

### Dev server won't start
- Error: "Cannot find package '@/mocks'" → Fixed in latest version
- Port already in use → Vite will auto-select another port
- Check console for any import errors

### Tests failing
```bash
# Clear cache and re-run
rm -rf node_modules/.vitest
npm run test:coach
```

### TypeScript errors
```bash
# Check for compilation errors
npx tsc --noEmit
```

### Component not rendering
- Check browser console for errors
- Verify request object matches `CoachRequest` type
- Ensure all required fields are present

## ✅ Verification Checklist

Before integration, verify:
- [ ] Dev server starts without errors
- [ ] All 35 tests pass (`npm run test:coach`)
- [ ] TypeScript compiles cleanly (`npx tsc --noEmit`)
- [ ] Demo page loads (wire route first)
- [ ] Mock API responds to requests
- [ ] Console shows telemetry events

## 🎯 Next Steps

1. **Wire demo route** into your app navigation
2. **Test with real telemetry** from your set completion handler
3. **Configure Gemini API** when ready for production
4. **Customize styling** if needed (all Tailwind classes)
5. **Add to your session flow** (after set completion)

## 💡 Tips

- Use the demo to explore all scenarios
- Check browser console for telemetry logs
- Projection chip only shows when confidence is high (CI ≥ 0.7)
- Safety banner appears for low signal or pain
- Reason modal appears only when `ask_reason_on_skip_or_override` is true

---

**Status**: ✅ Production-ready with mock API
**Tests**: ✅ 35/35 passing
**TypeScript**: ✅ 0 errors
**Documentation**: ✅ Complete

Ready to integrate! 🚀
