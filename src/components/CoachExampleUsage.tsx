import { useState } from "react";
import { getCoachLine, startLiveCoach } from "@/ai/coachService";

export function CoachExampleUsage() {
  const [text, setText] = useState("—");

  async function runOnce() {
    const out = await getCoachLine({
      readiness: 78,
      deltaVsLast: +6,
      metrics: { rmsDropPct: 18, ror: "stable", symmetryPct: 92 },
      lastSet: { reps: 6, rpe: 7 },
      goal: "strength",
      mode: "postSet",
      constraints: { minRest: 60, maxRest: 120 },
    });
    setText(
      `${out.line} [${out.action}${out.rest_s ? `, rest ${out.rest_s}s` : ""}]`,
    );
  }

  return (
    <div className="p-4 space-y-2">
      <button
        className="px-3 py-2 rounded bg-zinc-800 text-white"
        onClick={runOnce}
      >
        Get Coach Line
      </button>
      <div className="text-sm opacity-80">{text}</div>
      <button
        className="px-3 py-2 rounded border"
        onClick={async () => {
          const live = await startLiveCoach((delta) => setText((prev) => prev + delta));
          // Example: live?.send("Last set: RMS drop 18%, RoR stable. Advice?");
          void live;
        }}
      >
        Start Live Coach (demo)
      </button>
    </div>
  );
}
