# Import Error Fix - COMPLETE ✅

## Error Message
```
appScreens.tsx:1044 Uncaught ReferenceError: GeminiLiveCoach is not defined
```

## Root Cause
Missing imports at the top of `src/appScreens.tsx`:
- `GeminiLiveCoach` component
- `CoachContextBus` for context management

## Fix Applied

### Added Missing Imports (lines 21-22)

```typescript
import { GeminiLiveCoach } from './components/coach/GeminiLiveCoach';
import { CoachContextBus } from './coach/CoachContextBus';
```

**Complete import section:**
```typescript
import DropStack from './components/notify/DropStack';
import RestCoach, { type RestCoachAction } from './components/coach/RestCoach';
import { GeminiLiveCoach } from './components/coach/GeminiLiveCoach';  // ← NEW
import { CoachContextBus } from './coach/CoachContextBus';              // ← NEW
import { SlideUpLogPanel } from './components/SlideUpLogPanel';
```

---

## What Was Missing

### 1. GeminiLiveCoach Component
Used at line 1044:
```typescript
<GeminiLiveCoach open={showCoach} onClose={() => setShowCoach(false)} />
```

### 2. CoachContextBus
Used at lines 952-956:
```typescript
React.useEffect(() => {
    CoachContextBus.publishContext({
        appSurface: 'pre_session',
        readiness: score ?? 75,
        readinessTarget: 50,
    });
}, [score]);
```

---

## Status
✅ **FIXED** - The error should now be resolved.

Refresh your app and the Pre-Training screen should load without errors.

---

## Files Changed
- ✅ `src/appScreens.tsx` (lines 21-22)
  - Added `GeminiLiveCoach` import
  - Added `CoachContextBus` import
