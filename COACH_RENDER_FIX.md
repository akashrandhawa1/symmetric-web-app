# Coach Not Rendering - FIXED ✅

## Problem
The coach button wasn't showing up on the Pre-Training screen after the initial changes.

## Root Cause
The `PreTrainingScreen` component has **two versions**:

1. ❌ **`src/screens/PreTrainingScreen.tsx`** - Standalone file (NOT USED)
2. ✅ **Inline in `src/appScreens.tsx`** - Actually used by the app

I initially updated the wrong file!

---

## Fix Applied

### 1. ✅ Updated **`src/appScreens.tsx`** (line 933-1047)
Added the coach button to the **actual** PreTrainingScreen that the app uses:

```typescript
export const PreTrainingScreen: React.FC<PreTrainingScreenProps> = ({...}) => {
    const [showCoach, setShowCoach] = React.useState(false);

    // Set app surface for state-aware coaching
    React.useEffect(() => {
        CoachContextBus.publishContext({
            appSurface: 'pre_session',
            readiness: score ?? 75,
            readinessTarget: 50,
        });
    }, [score]);

    return (
        <div>
            {/* ... existing content ... */}
            
            <div className="w-full space-y-3 pb-4">
                {/* NEW: Coach button */}
                <button
                    onClick={() => setShowCoach(true)}
                    className="button-press w-full rounded-xl border border-purple-400/30 bg-purple-500/15 py-4 text-lg font-medium text-purple-100"
                >
                    🎙️ Talk to Coach
                </button>
                
                {/* Existing Start Workout button */}
                <button onClick={onStart}>
                    Start Workout
                </button>
            </div>

            {/* NEW: Coach modal */}
            <GeminiLiveCoach open={showCoach} onClose={() => setShowCoach(false)} />
        </div>
    );
};
```

### 2. ✅ RestScreen Already Fixed
The `RestScreen` is correctly imported from `src/screens/RestScreen.tsx`, so those changes are active!

---

## What You Should See Now

### Pre-Training Screen (After Readiness Check)
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

### Rest Screen (Between Sets)
```
┌─────────────────────────────┐
│   Rest Period               │
│   Back Squat • Set 2        │
│                             │
│       1:30                  │
│   [Timer countdown]         │
│                             │
│ ┌─────────────────────────┐ │
│ │  🎙️ Talk to Coach      │ │ ← Already added!
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │  Log Set                │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

## Files Changed

### ✅ Working Now:
1. **`src/appScreens.tsx`** (lines 948-957, 1027-1044)
   - Added coach button to PreTrainingScreen
   - Added state and context updates
   - Added GeminiLiveCoach modal

2. **`src/screens/RestScreen.tsx`** (already working)
   - Coach button at top of rest screen
   - Context set to `rest_overlay`

### ❌ Not Used (Can Delete):
- `src/screens/PreTrainingScreen.tsx` - This file exists but isn't imported by the app

---

## Testing

### Pre-Training Screen:
1. Complete a readiness check
2. You should see **TWO buttons**:
   - Purple "🎙️ Talk to Coach" (NEW)
   - Blue "Start Workout"
3. Tap the coach button
4. Coach modal should open

### Rest Screen:
1. Complete a set
2. During rest period, look for the coach button at the top
3. Should be above "Log Set" button
4. Tap it to open coach

---

## Why This Happened

Your app has **two different PreTrainingScreen implementations**:

1. **Standalone file** (`src/screens/PreTrainingScreen.tsx`)
   - Exists in the codebase
   - Properly exported
   - But **never imported or used**

2. **Inline definition** (`src/appScreens.tsx`)
   - Defined directly in the main screens file
   - This is what App.tsx actually uses
   - This is what needed to be updated

The `RestScreen` was correctly using the file import, so that one worked fine!

---

## Cleanup Recommendation

You can **delete** this unused file:
```bash
rm src/screens/PreTrainingScreen.tsx
```

It's not being used and might cause confusion later.

---

**Status:** ✅ Coach button should now appear on both screens!

Refresh your app and check the Pre-Training screen after completing a readiness check.
