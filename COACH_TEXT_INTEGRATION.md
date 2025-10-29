# Coach Text Integration Guide

This guide shows how to integrate the Gemini-powered coach text feature into your workout completion flow.

## What's Been Created

### 1. Netlify Function
- **File**: `netlify/functions/coach-text.ts`
- **Endpoint**: `/.netlify/functions/coach-text` (via redirect from `/api/gemini/coach-text`)
- **Purpose**: Calls Gemini API with workout data and returns personalized coach feedback

### 2. Client Utility
- **File**: `src/utils/getCoachText.ts`
- **Export**: `getCoachText(payload, signal?)` function
- **Type**: `CoachPayload` interface for type safety

### 3. Render Component
- **File**: `src/components/CoachNote.tsx`
- **Export**: `CoachNote` component
- **Purpose**: Displays the coach text in a styled card

## Environment Variables

Make sure these are set in your Netlify dashboard:

```bash
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL_ID=gemini-2.5-flash  # optional, defaults to gemini-2.5-flash
```

## Integration Example

Here's how to integrate this into a workout completion handler:

```typescript
import { getCoachText, type CoachPayload } from '@/utils/getCoachText';
import { CoachNote } from '@/components';

// Example: In your workout completion handler
export async function handleWorkoutComplete(session: WorkoutSession) {
  // Build the payload from your session data
  const payload: CoachPayload = {
    firstName: session.user?.firstName ?? "Athlete",
    session: {
      durationMin: session.durationMin,
      totalSets: session.totalSets,
      keyExercises: session.exercises.map(ex => ex.name), // e.g., ["Back Squat", "Bulgarian Split Squat"]
      readinessStart: session.readinessStart,
      readinessEnd: session.readinessEnd
    },
    progress: {
      // Optional: Include if you have PR data
      topLoadTodayLb: session.prs?.backSquat?.todayLb,
      topLoadPrevLb: session.prs?.backSquat?.prevLb,
      topLoadDeltaPct: session.prs?.backSquat?.deltaPct,

      // Optional: Include if you have EMG data
      emgDeltaPct: session.emg?.quadDeltaPct,

      // Optional: Include if you have historical averages
      setsPrevAvg: session.history?.avgSets,
      minutesPrevAvg: session.history?.avgMinutes
    },
    recovery: {
      // Optional: Include if recovery window is within 3-4 hours
      windowClock: session.recoveryWindow?.timeString // e.g., "7:30 pm"
    }
  };

  // Fetch coach text
  const coachText = await getCoachText(payload);

  // Save to session (or state management)
  return {
    ...session,
    coachText
  };
}
```

## React Component Usage

```typescript
import { CoachNote } from '@/components';

export function WorkoutCompleteScreen({ session }) {
  return (
    <div className="p-4 space-y-4">
      <h1>Workout Complete!</h1>

      {/* Coach feedback */}
      <CoachNote text={session.coachText} />

      {/* Rest of your metrics and CTAs */}
      <div className="stats">
        <p>Duration: {session.durationMin} min</p>
        <p>Total Sets: {session.totalSets}</p>
        <p>Readiness: {session.readinessStart} → {session.readinessEnd}</p>
      </div>
    </div>
  );
}
```

## Quick Test

You can test the endpoint directly:

```typescript
import { getCoachText } from '@/utils/getCoachText';

// Test with sample data
const testCoachText = async () => {
  const coachText = await getCoachText({
    firstName: "Akash",
    session: {
      durationMin: 27,
      totalSets: 8,
      keyExercises: ["Back Squat", "Bulgarian Split Squat"],
      readinessStart: 73,
      readinessEnd: 52
    },
    progress: {
      topLoadTodayLb: 245,
      topLoadPrevLb: 235,
      topLoadDeltaPct: 4.3,
      emgDeltaPct: 3.0,
      setsPrevAvg: 6,
      minutesPrevAvg: 22
    },
    recovery: {
      windowClock: "7:30 pm"
    }
  });

  console.log("Coach Text:", coachText);
};
```

## Expected Output Example

```
"Akash, you just crushed 27 minutes and 8 sets on Back Squat and Bulgarian Split Squat, bringing readiness from 73 to 52—that's a meaningful stimulus without overdoing it. Within the next few hours, do 10 minutes of light stretching around 7:30 pm to help flush metabolites and speed recovery. You hit a 4% PR on your top load at 245 lb—solid progress. Great work today."
```

## What the Coach Text Covers

The AI-generated coach text always includes:

1. **WHAT**: Session summary (duration, sets, exercises, readiness change)
2. **WHY**: Brief explanation connecting the session to strength/recovery goals
3. **NEXT**: 1-2 specific actionable cooldown activities with reasons (NOT generic advice like "drink water")
4. **PROGRESS**: ONE highlight from the data (PR, EMG improvement, volume change)

## Fallback Behavior

If the Gemini API fails or returns invalid JSON, the function automatically uses a fallback message:

```typescript
"Nice work. You trained 27 minutes for 8 sets on Back Squat and Bulgarian Split Squat, and readiness moved from 73 to 52. Within 3 to 4 hours, do a short at-home cool down you can stick with. Keep it going."
```

## Deployment

1. Deploy the updated code to Netlify
2. Verify environment variables are set
3. Test the endpoint after deployment
4. The function will be available at: `https://your-site.netlify.app/.netlify/functions/coach-text`

## Notes

- Keep payloads lean - only send data you're comfortable showing
- Omit optional fields if they're not available for a particular workout
- The AI will work with whatever data you provide
- Character limit is 420 characters
- Response is always JSON: `{ "coachText": string }`
