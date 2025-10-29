export type CoachPayload = {
  firstName: string;
  session: {
    durationMin: number;
    totalSets: number;
    keyExercises: string[];
    readinessStart: number;
    readinessEnd: number;
  };
  progress?: {
    topLoadTodayLb?: number;
    topLoadPrevLb?: number;
    topLoadDeltaPct?: number;
    emgDeltaPct?: number;
    setsPrevAvg?: number;
    minutesPrevAvg?: number;
  };
  recovery?: {
    windowClock?: string; // optional clock time if within 3–4h
  };
};

export async function getCoachText(payload: CoachPayload, signal?: AbortSignal): Promise<string> {
  const url = "/.netlify/functions/coach-text";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      console.error("[getCoachText] HTTP error:", res.status, res.statusText);
      return "";
    }

    const data = await res.json();
    return String(data.coachText || "");
  } catch (error: any) {
    if (error?.name === "AbortError") {
      console.log("[getCoachText] Request aborted");
    } else {
      console.error("[getCoachText] Error:", error);
    }
    return "";
  }
}
