// Coach Milo SCC for LIVE coaching
// Suggest → Confirm → Compensate across runtime events.

export type LiveEventType =
  | "SET_COMPLETED"
  | "BLOCK_SKIPPED"
  | "TIME_LEFT_SHORT"
  | "EQUIPMENT_CHANGED"
  | "SENSOR_TOGGLED"
  | "FATIGUE_SPIKE"
  | "READINESS_LOW"
  | "SYMMETRY_DROP"
  | "USER_FREQ_CHANGED";

export type LiveEvent = {
  type: LiveEventType;
  payload?: Record<string, any>;
};

export type LiveContext = {
  readinessPct?: number;
  fatiguePct?: number;
  symmetryPct?: number;
  vibe?: "hype" | "calm" | "expert";
  goal?: "lower_body_strength" | "build_muscle" | "general_fitness" | "rehab";
  experience?: "new" | "intermediate" | "advanced";
  sessionMinutes?: number;
  minutesLeft?: number;
  daysPerWeek?: number;
  sensorOn?: boolean;
};

export type PlanAdjustment = {
  addBlock?: { name: string; details: string; estDrop?: number };
  swapExercise?: { from: string; to: string; reason?: string };
  cutAccessories?: boolean;
  increaseIntensity?: { byRPE?: number; byPercent?: number };
  reduceIntensity?: { byRPE?: number; byPercent?: number };
  densityFinisher?: { name: string; durationMin: number; note?: string };
  recoveryInsert?: { name: string; durationMin: number; note?: string };
  shorterRest?: { toSeconds: number };
  longerRest?: { toSeconds: number };
};

export type LiveDecision = {
  message: string;
  adjustment?: PlanAdjustment;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function line(vibe: LiveContext["vibe"], choices: string[]) {
  if (vibe === "expert") return choices[0];
  if (vibe === "calm") return choices[1] ?? choices[0];
  return choices[2] ?? choices[0];
}

export function applyLiveSCC(ctx: LiveContext, ev: LiveEvent): LiveDecision {
  const vibe = ctx.vibe ?? "hype";
  switch (ev.type) {
    case "SET_COMPLETED": {
      const rpe = ev.payload?.rpe as number | undefined;
      const sym = ev.payload?.symmetryPct as number | undefined;
      if (typeof rpe === "number") {
        if (rpe <= 6.5) {
          return {
            message: line(vibe, [
              "Load is light—add a small step.",
              "Plenty in the tank—nudge it up.",
              "Too easy—add a bit of weight.",
            ]),
            adjustment: { increaseIntensity: { byRPE: 0.5 } },
          };
        }
        if (rpe >= 8.5) {
          return {
            message: line(vibe, [
              "Near limit—cap fatigue, keep quality.",
              "Heavy enough—hold or drop slightly.",
              "Good grind—pull 2–3% to keep form clean.",
            ]),
            adjustment: { reduceIntensity: { byPercent: 2 } },
          };
        }
      }
      if (typeof sym === "number" && sym < 92) {
        return {
          message: line(vibe, [
            "Symmetry dipped—shorten ROM and slow the drive.",
            "Let’s clean symmetry—controlled reps next set.",
            "Symmetry low—tighten form; tempo 3-1.",
          ]),
          adjustment: { longerRest: { toSeconds: 120 } },
        };
      }
      return {
        message: line(vibe, [
          "Quality set—keep cadence.",
          "Smooth—same load next set.",
          "Nice work—same load, same tempo.",
        ]),
      };
    }

    case "BLOCK_SKIPPED":
      return {
        message: line(vibe, [
          "Skipped block—add a short density finisher.",
          "We’ll keep stimulus with a brief finisher.",
          "No sweat—10-min finisher keeps progress on track.",
        ]),
        adjustment: {
          densityFinisher: {
            name: "DB Split Squat Alt EMOM",
            durationMin: 10,
            note: "5 reps/side every minute; steady pace.",
          },
        },
      };

    case "TIME_LEFT_SHORT": {
      const m = Math.max(0, ev.payload?.minutesLeft ?? ctx.minutesLeft ?? 8);
      return {
        message: line(vibe, [
          `~${m} min left—trim accessories; 1 focused top set.`,
          `${m} min—cut fluff; hit 1 strong set and go.`,
          `${m} min—one top set, short rests, done strong.`,
        ]),
        adjustment: {
          cutAccessories: true,
          shorterRest: { toSeconds: 60 },
          addBlock: { name: "Top Set Finisher", details: "1× AMRAP @ RPE 8 (clean form)" },
        },
      };
    }

    case "EQUIPMENT_CHANGED": {
      const to = String(ev.payload?.to ?? "").toLowerCase();
      if (/db|dumbbell/.test(to)) {
        return {
          message: line(vibe, [
            "DBs now—single-leg & tempo will carry stimulus.",
            "Switch to DB—unilateral + tempo keeps gains coming.",
            "Swapped to DB—use single-leg + tempo to hit intent.",
          ]),
          adjustment: {
            swapExercise: { from: ev.payload?.from ?? "Barbell", to: "DB Split Squat (3-1-X)" },
          },
        };
      }
      if (/bodyweight|no equip/.test(to)) {
        return {
          message: line(vibe, [
            "Bodyweight—use pauses/tempo to raise effort.",
            "BW only—tempo & pauses to keep RPE honest.",
            "BW switch—tempo 3-1 + pauses for real work.",
          ]),
          adjustment: {
            swapExercise: { from: ev.payload?.from ?? "External load", to: "Tempo Squat (3-1-X)" },
            increaseIntensity: { byRPE: 0.5 },
          },
        };
      }
      return {
        message: line(vibe, [
          "Equipment changed—matching stimulus with safe options.",
          "New tool—same intent, different pattern.",
          "Swapped gear—keeping stimulus aligned.",
        ]),
      };
    }

    case "SENSOR_TOGGLED": {
      const on = !!ev.payload?.on;
      return {
        message: on
          ? line(vibe, [
              "Sensor on—tighten load calls by EMG.",
              "Sensor enabled—symmetry/load will be auto-tuned.",
              "Sensor’s live—expect sharper cues.",
            ])
          : line(vibe, [
              "Sensor off—RPE and clean reps steer today.",
              "No sensor—use feel and smooth tempo.",
              "Sensor off—RPE cues only; keep reps honest.",
            ]),
      };
    }

    case "FATIGUE_SPIKE": {
      const f = clamp(ev.payload?.fatiguePct ?? ctx.fatiguePct ?? 30, 0, 100);
      return {
        message: line(vibe, [
          `Fatigue at ${f}%—pull 2–3% and extend rest.`,
          `Fatigue ${f}%—lighten a touch and breathe longer.`,
          `${f}% fatigue—drop a hair, rest 120 s, keep form tight.`,
        ]),
        adjustment: { reduceIntensity: { byPercent: 3 }, longerRest: { toSeconds: 120 } },
      };
    }

    case "READINESS_LOW": {
      const r = clamp(ev.payload?.readinessPct ?? ctx.readinessPct ?? 55, 0, 100);
      return {
        message: line(vibe, [
          `Readiness ${r}%—switch to skill/tempo and protect joints.`,
          `At ${r}%—skill work today; save heavy for next session.`,
          `${r}% ready—tempo work beats grinding. Bank recovery.`,
        ]),
        adjustment: {
          swapExercise: { from: "Heavy Compound", to: "Tempo Squat (3-1-X)", reason: "readiness low" },
          longerRest: { toSeconds: 120 },
        },
      };
    }

    case "SYMMETRY_DROP": {
      const s = clamp(ev.payload?.symmetryPct ?? ctx.symmetryPct ?? 90, 0, 100);
      return {
        message: line(vibe, [
          `Symmetry ${s}%—add unilateral set; slow the drive.`,
          `Sym ${s}%—1 unilateral block to balance; smooth tempo.`,
          `${s}% symmetry—single-leg set now, then retest.`,
        ]),
        adjustment: {
          addBlock: { name: "Unilateral Balance", details: "DB Split Squat 2×6/side @ RPE 7" },
          longerRest: { toSeconds: 90 },
        },
      };
    }

    case "USER_FREQ_CHANGED": {
      const days = Number(ev.payload?.days ?? ctx.daysPerWeek ?? 3);
      if (days <= 2) {
        return {
          message: line(vibe, [
            `${days}×/week—raise intensity/density; extra recovery helps.`,
            `${days}×—fewer days = sharper sessions; we’ll push quality.`,
            `${days}×—we’ll go heavier per day and use recovery.`,
          ]),
          adjustment: { increaseIntensity: { byRPE: 0.5 } },
        };
      }
      if (days >= 4) {
        return {
          message: line(vibe, [
            `Great—${days}×. We’ll spread volume and add an easy day.`,
            `${days}×—volume distributed; one lighter day to cap fatigue.`,
            `${days}×—we’ll pace volume and protect joints.`,
          ]),
        };
      }
      return {
        message: line(vibe, [
          `3×/week—balanced progress.`,
          `3×—nice cadence for strength.`,
          `3×—perfect for steady gains.`,
        ]),
      };
    }

    default:
      return { message: line(vibe, ["Noted.", "Logged.", "Got it."]) };
  }
}

if (process.env.NODE_ENV !== "production") {
  console.assert(
    applyLiveSCC({ vibe: "expert" }, { type: "FATIGUE_SPIKE", payload: { fatiguePct: 32 } })
      .adjustment?.reduceIntensity,
    "should reduce intensity on fatigue spike"
  );
  console.assert(
    applyLiveSCC({}, { type: "BLOCK_SKIPPED" }).adjustment?.densityFinisher,
    "skipping block adds finisher"
  );
}
