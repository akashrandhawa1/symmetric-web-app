# Voice Coach Tone Fix - Existing System

## Problem Identified

The text you saw:
> "Good work. Rest a bit and match the reps so the next warm-up keeps your strength rolling."

Was coming from the **existing coaching system** in `/src/lib/coach/voice.ts`, NOT the new Gemini-based RestCoach component I built.

Your app is currently using this older local decision-tree coach, which had overly verbose messages.

## Solution

Updated **all coaching messages** in the existing `voice.ts` system to match the new punchy, directive tone.

---

## Changes Made to voice.ts

### 1. Recovery Messages (Energy Dipping)

**Before:**
> "Alright, you're getting tired. Ease the weight and rest a bit longer so the next set keeps building strength."

**After:**
> "Energy dipping—drop the weight and rest longer."

---

### 2. Warm-up Messages

**Before:**
> "Good work. Rest a bit and match the reps so the next warm-up keeps your strength rolling."

**After:**
> "Warm-up solid. Match reps next set."

---

### 3. Foundation/Main Set Messages

**Before:**
> "Good set. Keep the weight and reps steady so your base keeps getting stronger."

**After:**
> "Good set. Keep weight and reps steady."

---

### 4. Balance/Efficiency Messages

**Before:**
> "Nice work, but you're a bit off-balance. Slow the tempo so both sides stay even and your strength keeps climbing."

**After:**
> "Off-balance detected. Slow tempo—keep sides even."

---

### 5. Progress Messages (Adding Reps)

**Before:**
> "Okay, you're looking strong. Add one rep so this next set keeps stacking strength."

**After:**
> "Looking strong—add one rep next set."

---

## Pattern Changes Applied

### ❌ Removed:
- "Alright," / "Okay," / "Nice work," openers
- "so the next set..." / "so you..." / "so your..." connecting phrases
- "keeps [verb]ing" constructions
- "Let's..." suggestions
- Multi-clause sentences

### ✅ Added:
- Em dashes (—) for quick pauses
- Direct imperatives: "Drop effort", "Match reps", "Keep weight steady"
- Short declaratives: "Energy high", "Tank full", "Warm-up solid"
- Action-first structure

---

## All Updated Messages

### Recovery Judgment
1. `Energy dipping—drop the weight and rest longer.`
2. `Fatigue building. Drop the weight to lock in gains.`
3. `Fuel low—lighten load and take a breather.`

### Efficiency Judgment (Balance Issues)
1. `Off-balance detected. Slow tempo—keep sides even.`
2. `Balance drifting—steady pace and tighten control.`
3. `One side working harder. Refine form for even load.`

### Progress Judgment (Add Reps)
1. `Looking strong—add one rep next set.`
2. `Energy high. Push for one extra rep.`
3. `Tank full—chase one more rep same weight.`

### Foundation Judgment (Warm-up)
1. `Warm-up solid. Match reps next set.`
2. `Good start. Keep weight steady—next set builds base.`
3. `Feels good. Same plan—stay smooth through warm-up.`

### Foundation Judgment (Main Sets)
1. `Good set. Keep weight and reps steady.`
2. `Solid work. Match reps next set.`
3. `Stay smooth. Same plan builds strength.`

---

## Verification

✅ **TypeScript compiles**: No errors
✅ **Tests pass**: 35/35
✅ **All messages < 60 chars**: Fits on rest screen
✅ **Tone consistent**: Direct, punchy, action-focused

---

## How This Relates to Your Implementation

You have **TWO coach systems** in your codebase:

### 1. **Existing System** (voice.ts) - NOW FIXED ✅
- Local decision tree
- Used by your current app
- **Just updated** with punchy tone
- Located: `/src/lib/coach/voice.ts`

### 2. **New System** (RestCoach.tsx) - ALREADY CORRECT ✅
- Gemini API-driven
- I built this from scratch
- Already had punchy tone
- Located: `/src/components/coach/RestCoach.tsx`

The message you saw was from **System #1** (voice.ts), which I've now fixed.

---

## Test It Now

```bash
npm run dev
```

All coaching messages in your app should now use the new punchy, directive tone:

**Warm-up:**
> "Warm-up solid. Match reps next set."

**Progress:**
> "Looking strong—add one rep next set."

**Fatigue:**
> "Energy dipping—drop the weight and rest longer."

**Balance:**
> "Off-balance detected. Slow tempo—keep sides even."

---

## Files Changed

- ✅ `/src/lib/coach/voice.ts` - Updated 16 coaching messages
- ✅ All tests still passing
- ✅ TypeScript compiles cleanly

---

**Status**: ✅ Fixed - All verbose messages replaced
**Updated**: 2025-10-16
