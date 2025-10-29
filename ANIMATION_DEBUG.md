# Arc Animation & Rest Page Debug Guide

## Issue Report
- **Problem**: Arc animation not working after set completion
- **Expected**: After ending a set, see arc animation → line morph → rest screen
- **Actual**: ??? (needs clarification)

## Diagnostic Steps

### 1. Check Browser Console
Open Dev Tools (F12) and look for:
```
[GEMINI] handleManualEndSet called.
[GEMINI] handleManualEndSet: repCount=X, isCalibrationSet=false
```

If you see these, the set is ending properly.

### 2. Check SessionPhase State
In the console, after ending a set, check:
```javascript
// The sessionPhase should change to 'set-summary'
// Look for React DevTools to inspect component state
```

### 3. Animation Sequence
The animation has 3 stages (should happen automatically):
- **Stage 1 (0-2s)**: Arc animation - shows readiness arc
- **Stage 2 (2-2.6s)**: Line morph - arc morphs into horizontal bar
- **Stage 3 (2.6s+)**: Rest content - shows coaching feedback + timer

### 4. Check CSS Classes
The post-set screen div should have these classes:
```html
<div class="post-set-screen visible">  <!-- Should have 'visible' class -->
  <div class="post-set-arc-container morphed">  <!-- Gets 'morphed' after 2s -->
```

## Common Issues & Fixes

### Issue 1: Animation Doesn't Start
**Symptom**: Stays on training screen, no animation
**Cause**: `sessionPhase` not changing to 'set-summary'
**Check**:
```typescript
// In App.tsx line 1566
setSessionPhase('set-summary');  // This should be called
```

### Issue 2: Animation Visible But Not Morphing
**Symptom**: Arc visible but doesn't morph to line
**Cause**: CSS classes not updating or timing issue
**Fix**: Check that animation stages progress:
```typescript
// In screens.tsx line 1213
setAnimationStage('arc');   // Stage 1
// Then after 2s:
setAnimationStage('line');  // Stage 2
// Then after 2.6s:
setAnimationStage('rest');  // Stage 3
```

### Issue 3: Rest Screen Not Showing
**Symptom**: Animation completes but no rest content
**Cause**: `animationStage` not reaching 'rest'
**Check**: Line 1225-1227 in screens.tsx

## Quick Fix Attempts

### Fix 1: Force Animation Reset
If animation seems stuck, try adding console logs:

In `src/screens.tsx` around line 1212, add:
```typescript
if (shouldKickoff) {
    console.log('[ANIMATION] Starting animation sequence');
    console.log('[ANIMATION] preScore:', preScore, 'postScore:', postScore);
    setAnimationStage('arc');
    // ...
}
```

### Fix 2: Check Rest Duration
The rest timer needs a valid duration:

In `src/App.tsx` line 1215:
```typescript
setRestSecondsLeft(Math.max(0, Math.round(restDuration || 0)));
```

If `restDuration` is 0 or undefined, timer won't work.

### Fix 3: Verify PostSetCoachOutput
The coaching feedback needs to be set:

In `src/App.tsx` line 1540:
```typescript
setPostSetCoachOutput(coachOutput);  // Must have valid output
```

## Test Manually

### Step 1: Complete a Set
1. Start workout from home screen
2. Do 5+ reps (or use "Simulate Rep" button if available)
3. Click "End Set" button

### Step 2: Observe Behavior
What do you see?
- [ ] Training screen still visible (problem: phase not changing)
- [ ] Black screen / loading (problem: animation CSS issue)
- [ ] Arc animation starts but freezes (problem: stage transition)
- [ ] Arc animates but no rest content (problem: stage 3 not rendering)
- [ ] Something else: _______________

### Step 3: Check Console Output
Look for these log lines:
```
[GEMINI] handleManualEndSet called.
[ANIMATION] Starting animation sequence
coach_feedback_shown
```

## Potential Root Causes

### Cause A: RestDuration is 0
**Location**: App.tsx line 1770+
**Fix**: Ensure `restDuration` prop passed to TrainingScreen is >0

### Cause B: RestSummary Missing
**Location**: App.tsx line 1465-1471
**Fix**: Verify `lastRestSummary` state has valid pre/post readiness

### Cause C: CSS Not Loading
**Location**: index.html lines 163-230 (post-set animations)
**Fix**: Check that Tailwind is working and custom CSS is loaded

### Cause D: React State Not Updating
**Location**: screens.tsx useEffect line 1193
**Fix**: Check that useEffect dependencies are correct

## Next Steps

1. **Report Back**: Which symptom matches what you're seeing?
2. **Console Check**: Share any console errors/warnings
3. **Network Tab**: Are there API calls failing?
4. **React DevTools**: What's the current `sessionPhase` value after ending set?

---

**Created**: 2025-10-16
**For Issue**: Arc animation not working + not directing to rest page
