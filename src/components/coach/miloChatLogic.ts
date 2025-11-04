import type { Answers, QuestionId } from "./miloChatTypes";

export const essentialIds: QuestionId[] = [
  "name",
  "vibe",
  "goal",
  "experience",
  "equipment",
  "session_length",
  "frequency",
  "constraints",
  "intensity_ref",
  "sensor_today",
];

export const timeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

export function hasEnough(a: Answers) {
  return (
    !!a.goal &&
    !!a.experience &&
    (a.equipment?.length ?? 0) > 0 &&
    !!a.session_length &&
    !!a.intensity_ref &&
    !!a.sensor_today &&
    (a.constraints?.length ?? 0) >= 1
  );
}

function goalLabel(id?: Answers["goal"]) {
  switch (id) {
    case "lower_body_strength":
      return "Lower-Body Strength";
    case "build_muscle":
      return "Build Muscle";
    case "general_fitness":
      return "General Fitness";
    case "rehab":
      return "Return from Injury";
    default:
      return "Personal Plan";
  }
}

export function buildPlanPreview(a: Answers) {
  const time = a.session_length ?? 45;
  const freq = a.frequency ?? 3;
  const equip = new Set(a.equipment ?? []);
  const knees = (a.constraints ?? []).includes("knees");
  const hips = (a.constraints ?? []).includes("hips");
  const lowBack = (a.constraints ?? []).includes("low_back");
  const exp = a.experience ?? "new";
  const goal = a.goal;

  // Smarter primary exercise selection based on goal, constraints, and equipment
  let primary = "Back Squat";
  let primaryDetails = "";

  if (goal === "rehab" || knees || hips) {
    // Joint-friendly options
    if (equip.has("barbell_rack")) {
      primary = "Box Squat (high-bar)";
      primaryDetails = "paused at parallel";
    } else if (equip.has("machines")) {
      primary = knees ? "Leg Press (short ROM)" : "Hack Squat (controlled)";
    } else if (equip.has("dumbbells")) {
      primary = "Goblet Squat";
      primaryDetails = "tempo 3-1-1";
    } else {
      primary = "Split Squat (BW)";
      primaryDetails = "slow eccentric";
    }
  } else if (goal === "build_muscle") {
    // Hypertrophy-focused
    if (equip.has("barbell_rack")) {
      primary = "High-Bar Squat";
      primaryDetails = "deep, controlled";
    } else if (equip.has("machines")) {
      primary = "Hack Squat";
    } else if (equip.has("dumbbells")) {
      primary = "Bulgarian Split Squat";
      primaryDetails = "slow tempo";
    } else {
      primary = "Tempo Squat";
      primaryDetails = "3-1-X";
    }
  } else if (goal === "lower_body_strength") {
    // Strength-focused
    if (equip.has("barbell_rack")) {
      primary = exp === "advanced" ? "Back Squat (low-bar)" : "Back Squat";
    } else if (equip.has("machines")) {
      primary = "Hack Squat";
    } else if (equip.has("dumbbells")) {
      primary = "Goblet Squat (heavy)";
    } else {
      primary = "Pistol Squat (assisted)";
    }
  } else {
    // General fitness
    if (equip.has("barbell_rack")) {
      primary = "Back Squat";
    } else if (equip.has("machines")) {
      primary = "Leg Press";
    } else if (equip.has("dumbbells")) {
      primary = "Goblet Squat";
    } else {
      primary = "Air Squat (high volume)";
    }
  }

  // Smarter secondary selection
  let secondary = "RDL";
  if (lowBack) {
    secondary = equip.has("machines") ? "Leg Curl" : "Glute Bridge";
  } else if (goal === "build_muscle") {
    secondary = equip.has("barbell_rack") || equip.has("dumbbells")
      ? "RDL (slow eccentric)"
      : equip.has("machines")
      ? "Seated Leg Curl"
      : "Single-Leg Hip Thrust";
  } else {
    secondary =
      equip.has("dumbbells") || equip.has("barbell_rack")
        ? "RDL"
        : equip.has("machines")
        ? "Hip Hinge Machine"
        : "Hip Thrust (BW)";
  }

  // Smarter accessory selection based on time and goal
  const accessory =
    goal === "build_muscle" && equip.has("dumbbells")
      ? "Walking Lunges"
      : knees
      ? "Leg Press (short ROM)"
      : equip.has("dumbbells")
      ? "DB Split Squat"
      : equip.has("machines")
      ? "Leg Extension"
      : "Step-ups";

  // Volume and intensity based on experience and goal
  let mainSets = "3×5";
  let mainIntensity = "RPE 7–8";

  if (goal === "lower_body_strength") {
    mainSets = exp === "advanced" ? "4×3" : exp === "intermediate" ? "4×4" : "3×5";
    mainIntensity = a.intensity_ref === "percent"
      ? exp === "new" ? "70–75%" : exp === "intermediate" ? "80–85%" : "85–90%"
      : exp === "new" ? "RPE 7" : "RPE 8";
  } else if (goal === "build_muscle") {
    mainSets = exp === "advanced" ? "4×8" : exp === "intermediate" ? "3×8" : "3×10";
    mainIntensity = "RPE 7–8";
  } else if (goal === "rehab") {
    mainSets = "3×8";
    mainIntensity = "RPE 5–6";
  } else {
    mainSets = exp === "advanced" ? "3×6" : "3×8";
    mainIntensity = "RPE 6–7";
  }

  const blockCount = time >= 45 ? 3 : time >= 30 ? 2 : 1;

  const blocks = [
    {
      name: primary,
      details: primaryDetails
        ? `${mainSets} @ ${mainIntensity} • ${primaryDetails}`
        : `${mainSets} @ ${mainIntensity}`,
      estDrop: goal === "lower_body_strength" ? 22 : goal === "build_muscle" ? 18 : 15,
    },
  ];

  if (blockCount >= 2) {
    blocks.push({
      name: secondary,
      details: exp === "new" ? "3×6 (RPE 6–7)" : goal === "build_muscle" ? "3×10 (RPE 7)" : "3×5 (RPE 7)",
      estDrop: goal === "build_muscle" ? 14 : 12,
    });
  }

  if (blockCount >= 3) {
    blocks.push({
      name: accessory,
      details: goal === "build_muscle" ? "3×12 (RPE 7)" : "2×8–10 (RPE 7)",
      estDrop: 8,
    });
  }

  // Calculate estimated session drop based on blocks and experience
  let drop = blocks.reduce((sum, block) => sum + block.estDrop, 0);
  if (exp === "new") drop = Math.round(drop * 0.85); // New lifters fatigue less per set
  if (goal === "rehab") drop = Math.max(18, Math.round(drop * 0.65)); // Rehab is gentler
  drop = Math.max(15, Math.min(50, drop));

  return {
    title: `${goalLabel(a.goal)} • ${time} min`,
    freq,
    blocks,
    estSessionDrop: drop,
    sensor: a.sensor_today === "yes",
  } as const;
}

export function getPromptFor(id: QuestionId, a: Answers): string {
  const name = a.name?.split(" ")[0] || "friend";
  switch (id) {
    case "name":
      return `${timeGreeting()} — what should I call you? (You can change this anytime)`;
    case "vibe":
      return `Quick style check: hype, calm, or expert-y?`;
    case "goal":
      return `What are you chasing for the next 4–6 weeks — lower-body strength, build muscle, general fitness, or rehab/returning?`;
    case "experience":
      return `How long have you been lifting — new, intermediate, or advanced? (A sentence works too.)`;
    case "equipment":
      return `What are you training with today? Barbell & rack, dumbbells, machines, bands, or bodyweight only?`;
    case "session_length":
      return `About how long do you want sessions: 20, 30, 45, or 60+ minutes?`;
    case "frequency":
      return `How many days/week can you train right now — 1–4? (I’ll default to 3 if you skip.)`;
    case "constraints":
      return `Any joints I should be kind to — knees, hips, low back — or none?`;
    case "intensity_ref":
      return `How should I set loads — RPE, %1RM, or I can choose?`;
    case "sensor_today":
      return `Using the Symmetric sensor today — yes or no?`;
    case "age_band":
      return `Age range (helps pace recovery)?`;
    case "bodyweight":
      return `Bodyweight (optional; seeds dumbbell starts).`;
    default:
      return `Tell me more, ${name}.`;
  }
}

export function nextMicrocopy(id: QuestionId, value: unknown, a: Answers) {
  const name = a.name?.split(" ")[0] || "friend";
  switch (id) {
    case "name":
      return `Great to meet you, ${name}!`;
    case "vibe":
      return `Vibe set — I’ll match your energy.`;
    case "goal":
      if (value === "lower_body_strength") return "Strength block queued — heavy but clean.";
      if (value === "build_muscle") return "Hypertrophy focus locked — tempo + range.";
      if (value === "rehab") return "Joint-friendly first — tempo you can own.";
      return "Balanced build — well-rounded today.";
    case "experience":
      if (value === "new") return "We’ll groove technique first — form > load.";
      if (value === "advanced") return "Top set + back-offs — tight rests.";
      return "Solid base — progressive loading, clean reps.";
    case "equipment":
      return "Got it — building your pool now.";
    case "session_length":
      return `${value} minutes — I’ll pace the blocks.`;
    case "frequency":
      return `${value}×/week — I’ll manage fatigue around that.`;
    case "constraints":
      return Array.isArray(value) && value.includes("knees")
        ? "Knees noted — angles stay friendly."
        : "Copy — we’ll keep joints happy.";
    case "intensity_ref":
      if (value === "percent") return "Percent zones it is — dialing exact loads.";
      if (value === "rpe") return "RPE it is — top set @7–8 then back-offs.";
      return "I’ll steer loads — you focus on clean reps.";
    case "sensor_today":
      return value === "yes"
        ? "Sensor on — extra feedback unlocked."
        : "All good — plan works great without it.";
    case "age_band":
      return "Thanks — helps pace recovery.";
    case "bodyweight":
      return "Saved — good for dumbbell starts.";
    default:
      return `Noted, ${name}.`;
  }
}

export function tryParseUserAnswer(id: QuestionId, raw: string) {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  switch (id) {
    case "name":
      return { value: raw.trim(), label: raw.trim() };
    case "vibe":
      if (/hype/.test(s)) return { value: "hype", label: "Hype" };
      if (/calm|chill|relax/.test(s)) return { value: "calm", label: "Calm" };
      if (/expert|tech|precise/.test(s)) return { value: "expert", label: "Expert" };
      return null;
    case "goal":
      if (/strength|power|lower/.test(s))
        return { value: "lower_body_strength", label: "Build lower-body strength" };
      if (/muscle|size|hypertrophy/.test(s)) return { value: "build_muscle", label: "Build muscle" };
      if (/fitness|general|health/.test(s))
        return { value: "general_fitness", label: "General fitness" };
      if (/rehab|injur|return/.test(s)) return { value: "rehab", label: "Return from injury" };
      return null;
    case "experience":
      if (/new|beginner/.test(s)) return { value: "new", label: "New" };
      if (/intermediate|some|few/.test(s)) return { value: "intermediate", label: "Intermediate" };
      if (/advanced|experienced|elite/.test(s)) return { value: "advanced", label: "Advanced" };
      return null;
    case "equipment": {
      const picks: string[] = [];
      if (/barbell|rack/.test(s)) picks.push("barbell_rack");
      if (/dumbbell|db/.test(s)) picks.push("dumbbells");
      if (/machine|leg ?press|hack/.test(s)) picks.push("machines");
      if (/band/.test(s)) picks.push("bands");
      if (/bodyweight|no equipment|none/.test(s)) picks.push("bodyweight");
      if (picks.length) return { value: Array.from(new Set(picks)), label: picks.join(", ") };
      return null;
    }
    case "session_length": {
      const n = parseInt(s.match(/\d{2,3}/)?.[0] ?? "", 10);
      if (n && [20, 30, 45, 60].some((x) => Math.abs(x - n) < 5)) return { value: n, label: `${n} min` };
      return null;
    }
    case "frequency": {
      const n = parseInt(s.match(/\b[1-4]\b/)?.[0] ?? "", 10);
      if (n) return { value: n, label: String(n) };
      if (/four|4\+/.test(s)) return { value: 4, label: "4+" };
      return null;
    }
    case "constraints": {
      const picks: string[] = [];
      if (/none|no issues|all good/.test(s)) picks.push("none");
      if (/knee/.test(s)) picks.push("knees");
      if (/hip/.test(s)) picks.push("hips");
      if (/back|lumbar/.test(s)) picks.push("low_back");
      if (/other/.test(s)) picks.push("other");
      if (picks.length) return { value: Array.from(new Set(picks)), label: picks.join(", ") };
      return null;
    }
    case "intensity_ref":
      if (/rpe/.test(s)) return { value: "rpe", label: "RPE" };
      if (/%|percent/.test(s)) return { value: "percent", label: "%1RM" };
      if (/unsure|you choose|idk|not sure/.test(s)) return { value: "unsure", label: "Not sure" };
      return null;
    case "sensor_today":
      if (/yes|yep|on|sure/.test(s)) return { value: "yes", label: "Yes" };
      if (/no|not today|off/.test(s)) return { value: "no", label: "Not today" };
      return null;
    case "age_band":
      if (/(18|19|2[0-4])/.test(s)) return { value: "18_24", label: "18–24" };
      if (/(2[5-9]|3[0-4])/.test(s)) return { value: "25_34", label: "25–34" };
      if (/(3[5-9]|4[0-4])/.test(s)) return { value: "35_44", label: "35–44" };
      if (/(4[5-9]|5[0-4])/.test(s)) return { value: "45_54", label: "45–54" };
      if (/(55|6\d|65)/.test(s)) return { value: "55_plus", label: "55+" };
      if (/prefer not|unspecified|skip/.test(s))
        return { value: "unspecified", label: "Prefer not to say" };
      return null;
    case "bodyweight": {
      const n = parseFloat(s.match(/\d{2,3}(?:\.\d+)?/)?.[0] ?? "");
      if (!Number.isNaN(n)) return { value: n, label: String(n) };
      return null;
    }
    default:
      return null;
  }
}

export function getSuggestionsFor(id: QuestionId): string[] {
  switch (id) {
    case "name":
      return [];
    case "vibe":
      return ["Hype", "Calm", "Expert"];
    case "goal":
      return [
        "Lower-body strength",
        "Build muscle",
        "General fitness",
        "Rehab / returning",
      ];
    case "experience":
      return ["New", "Intermediate", "Advanced"];
    case "equipment":
      return [
        "Barbell rack and dumbbells",
        "Barbell rack only",
        "Machines only",
        "Bands and bodyweight",
        "Bodyweight only",
      ];
    case "session_length":
      return ["20 minutes", "30 minutes", "45 minutes", "60 minutes"];
    case "frequency":
      return ["2 days", "3 days", "4 days"];
    case "constraints":
      return ["None", "Knees", "Hips", "Low back"];
    case "intensity_ref":
      return ["RPE", "%1RM", "You choose"];
    case "sensor_today":
      return ["Yes", "No"];
    case "age_band":
      return ["18-24", "25-34", "35-44", "45-54", "55+"];
    case "bodyweight":
      return ["150 lb", "180 lb", "200 lb"];
    default:
      return [];
  }
}
