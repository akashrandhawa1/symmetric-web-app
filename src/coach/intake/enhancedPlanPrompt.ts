/**
 * Enhanced Plan Generation Prompt
 *
 * Uses optimized intake data to generate highly personalized workout plans
 */

import type { OptimizedAnswers, GoalType, ExperienceLevel } from "./optimizedFlow";

interface CurrentState {
  readiness: number;
  metrics: {
    rmsDropPct: number;
    ror: "down" | "stable" | "up";
    symmetryPct: number;
  };
  sessionNumber: number;
  totalSessions: number;
}

/**
 * Infer training focus from goal
 */
function inferTrainingFocus(goal: GoalType): string {
  const focusMap: Record<GoalType, string> = {
    build_max_strength:
      "Low reps (3-5), high load (85-95% estimated 1RM), long rest (3-5min). Prioritize compound movements.",
    add_muscle_size:
      "Moderate reps (8-12), moderate load (65-80% estimated 1RM), short rest (90-120s). Volume accumulation focus.",
    get_faster:
      "Explosive movements, power focus, 30-50% estimated 1RM, full recovery between sets. Speed-strength emphasis.",
    train_for_sport:
      "Sport-specific patterns, varied tempo, power + endurance blend. Functional carryover priority.",
    recover_injury:
      "Pain-free ROM, tempo work, unilateral focus, progressive loading. Safety and quality over intensity.",
    general_fitness:
      "Balanced approach, 6-10 reps, varied exercises, sustainable progression.",
    custom: "Balanced strength and conditioning approach.",
  };

  return focusMap[goal];
}

/**
 * Infer exercise complexity from experience
 */
function inferExerciseComplexity(experience: ExperienceLevel): string {
  const complexityMap: Record<ExperienceLevel, string> = {
    new: "Simple bilateral movements (goblet squat, leg press). Prioritize form mastery with tempo cues and 2-0-1-0 or 3-0-1-0 tempo. Avoid complex barbell work initially.",
    intermediate:
      "Barbell compounds + accessories. Can handle unilateral work. Progress from bilateral to unilateral within sessions.",
    advanced:
      "Complex variations (front squat, Bulgarian split squat). Advanced techniques like pauses, clusters, and tempo work appropriate.",
    expert:
      "Full exercise library available. Auto-regulation, advanced periodization, and complex loading schemes suitable.",
  };

  return complexityMap[experience];
}

/**
 * Infer volume tolerance from experience
 */
function inferVolumeTolerance(experience: ExperienceLevel): string {
  const volumeMap: Record<ExperienceLevel, string> = {
    new: "Start conservative: 2-3 sets per exercise, 10-15 total working sets per session max. Focus on movement quality.",
    intermediate:
      "Moderate volume: 3-4 sets per exercise, 15-20 total working sets. Can handle higher frequency.",
    advanced:
      "Higher volume tolerance: 4-5 sets per exercise, 20-25 working sets. Recovery capacity well-developed.",
    expert:
      "Very high volume tolerance: 5-6 sets per exercise, 25-30+ working sets possible with proper management.",
  };

  return volumeMap[experience];
}

/**
 * Filter exercises based on equipment
 */
function filterExercisesByEquipment(equipment: string[]): {
  primary: string[];
  accessories: string[];
} {
  const hasBarbell = equipment.includes("barbell");
  const hasDumbbells = equipment.includes("dumbbells");
  const hasRack = equipment.includes("rack");
  const hasLegPress = equipment.includes("leg_press");
  const hasCable = equipment.includes("cable");
  const bodyweightOnly = equipment.includes("bodyweight");

  const primary: string[] = [];
  const accessories: string[] = [];

  if (bodyweightOnly) {
    primary.push("Bodyweight squat", "Bulgarian split squat", "Walking lunge");
    accessories.push("Wall sit", "Step-up", "Single-leg deadlift");
  } else {
    if (hasBarbell && hasRack) {
      primary.push(
        "Barbell back squat",
        "Barbell front squat",
        "Romanian deadlift"
      );
    }

    if (hasBarbell) {
      primary.push("Barbell back squat (no rack)", "Romanian deadlift");
    }

    if (hasDumbbells) {
      primary.push(
        "Goblet squat",
        "Bulgarian split squat",
        "DB Romanian deadlift"
      );
      accessories.push("DB walking lunge", "DB step-up", "DB split squat");
    }

    if (hasLegPress) {
      primary.push("Leg press");
    }

    if (hasCable) {
      accessories.push("Cable pull-through", "Cable kickback");
    }

    // Always available with basic equipment
    accessories.push("Walking lunge", "Single-leg deadlift", "Wall sit");
  }

  return { primary, accessories };
}

/**
 * Get exercise contraindications based on limitations
 */
function getContraindications(limitations?: { tags: string[] }): string {
  if (!limitations || limitations.tags.length === 0) {
    return "No restrictions. Full exercise library available.";
  }

  const rules: Record<string, string> = {
    knee_pain_left:
      "Avoid deep squats and lunges. Use partial ROM, leg press with foot placement high, or tempo work.",
    knee_pain_right:
      "Avoid deep squats and lunges. Use partial ROM, leg press with foot placement high, or tempo work.",
    knee_pain_both:
      "Avoid deep bilateral squats. Prefer leg press, partial ROM work, or isometric holds.",
    back_pain_lower:
      "Avoid back squats. Use goblet squats, safety bar, split squats, or leg press instead.",
    back_pain_upper: "Avoid heavy barbell on back. Use front-loaded variations.",
    ankle_mobility:
      "Avoid ATG squats. Use elevated heels, box squats, or leg press.",
    hip_mobility:
      "Avoid deep hip flexion initially. Use wider stances, box squats.",
    hip_impingement:
      "Avoid deep hip flexion. Use sumo stance, wider foot placement, or reduce ROM.",
    past_acl: "Progressive loading, focus on eccentric control and stability.",
    past_meniscus:
      "Avoid end-range knee flexion under load. Use partial ROM variations.",
    tendinitis: "Tempo work, isometric holds, avoid explosive movements initially.",
  };

  const modifications = limitations.tags
    .map((tag) => rules[tag] || `Modified programming for ${tag}`)
    .join("\n  - ");

  return `Exercise modifications required:\n  - ${modifications}`;
}

/**
 * Get sport-specific adaptations
 */
function getSportAdaptations(
  sportContext?: { sport: string; focus?: string }
): string {
  if (!sportContext) return "";

  const adaptations: string[] = [
    `Sport: ${sportContext.sport}`,
  ];

  if (sportContext.focus) {
    adaptations.push(`Performance focus: ${sportContext.focus}`);
  }

  // Sport-specific considerations
  const sport = sportContext.sport.toLowerCase();
  if (sport.includes("basketball") || sport.includes("volleyball")) {
    adaptations.push(
      "Emphasize explosive power, jump training, single-leg stability"
    );
  } else if (sport.includes("soccer") || sport.includes("football")) {
    adaptations.push(
      "Multi-directional power, sprint mechanics, change of direction"
    );
  } else if (sport.includes("running") || sport.includes("track")) {
    adaptations.push("Posterior chain emphasis, hip extension power, cadence");
  }

  return adaptations.join("\n  ");
}

/**
 * Calculate session breakdown based on time
 */
function getSessionBreakdown(minutes: number): {
  warmup: number;
  main: number;
  accessory: number;
  cooldown: number;
  estimatedSets: number;
} {
  if (minutes <= 20) {
    return { warmup: 3, main: 12, accessory: 3, cooldown: 2, estimatedSets: 3 };
  } else if (minutes <= 30) {
    return { warmup: 4, main: 18, accessory: 5, cooldown: 3, estimatedSets: 4 };
  } else if (minutes <= 45) {
    return { warmup: 5, main: 25, accessory: 10, cooldown: 5, estimatedSets: 5 };
  } else if (minutes <= 60) {
    return { warmup: 5, main: 35, accessory: 15, cooldown: 5, estimatedSets: 6 };
  } else {
    return {
      warmup: 7,
      main: 45,
      accessory: 25,
      cooldown: 8,
      estimatedSets: 8,
    };
  }
}

/**
 * Get progression guidance based on session number
 */
function getProgressionGuidance(
  sessionNumber: number,
  totalSessions: number
): string {
  const phase = sessionNumber / totalSessions;

  if (phase < 0.33) {
    return `Early phase (session ${sessionNumber}/${totalSessions}): Focus on technique mastery, baseline establishment, and movement quality. Conservative loading.`;
  } else if (phase < 0.66) {
    return `Development phase (session ${sessionNumber}/${totalSessions}): Progressive overload active. Increase load or volume from previous sessions if quality maintained.`;
  } else {
    return `Peak phase (session ${sessionNumber}/${totalSessions}): Approaching program end. Consolidate gains, test improvements, or begin taper if testing planned.`;
  }
}

/**
 * Build complete plan generation prompt
 */
export function buildEnhancedPlanPrompt(
  answers: OptimizedAnswers,
  currentState: CurrentState
): string {
  const { readiness, metrics, sessionNumber, totalSessions } = currentState;

  const exercises = filterExercisesByEquipment(
    answers.equipment_session.equipment
  );
  const sessionBreakdown = getSessionBreakdown(
    answers.equipment_session.minutes
  );

  return `You are Coach Milo, an elite strength coach specializing in evidence-based,
individualized programming using real-time biometric feedback.

CLIENT PROFILE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${answers.name}

Primary Goal: ${answers.primary_goal.type.replace(/_/g, " ")}
${answers.primary_goal.custom_text ? `  Details: ${answers.primary_goal.custom_text}` : ""}
  → Training Focus: ${inferTrainingFocus(answers.primary_goal.type)}

Experience Level: ${answers.training_context.experience}
  → Exercise Complexity: ${inferExerciseComplexity(answers.training_context.experience)}
  → Volume Tolerance: ${inferVolumeTolerance(answers.training_context.experience)}

Equipment Available: ${answers.equipment_session.equipment.join(", ")}
Session Length: ${answers.equipment_session.minutes} minutes
  → Time Breakdown: ${sessionBreakdown.warmup}min warmup, ${sessionBreakdown.main}min main, ${sessionBreakdown.accessory}min accessory, ${sessionBreakdown.cooldown}min cooldown
  → Estimated Capacity: ${sessionBreakdown.estimatedSets} total exercise blocks

Frequency: ${answers.frequency_commitment.days_per_week}x per week
Program Duration: ${answers.frequency_commitment.weeks} weeks
  → Total Sessions: ${totalSessions}
  → Current: Session ${sessionNumber} of ${totalSessions}

${
  answers.limitations && answers.limitations.tags.length > 0
    ? `\nLimitations/Injuries:\n${answers.limitations.tags.join(", ")}\n  → Contraindications: ${getContraindications(answers.limitations)}`
    : "\nNo reported limitations"
}

${
  answers.sport_context
    ? `\nSport Context:\n  ${getSportAdaptations(answers.sport_context)}`
    : ""
}

CURRENT STATE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Readiness: ${readiness} / 100
Fatigue Metrics:
  - RMS Drop: ${metrics.rmsDropPct}%
  - Rate of Recovery: ${metrics.ror}
  - Symmetry: ${metrics.symmetryPct}%

AVAILABLE EXERCISES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primary Movements: ${exercises.primary.join(", ")}
Accessory Exercises: ${exercises.accessories.join(", ")}

PROGRAMMING TASK:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generate TODAY'S workout that:

1. GOAL ALIGNMENT:
   ${inferTrainingFocus(answers.primary_goal.type)}

2. EXPERIENCE-APPROPRIATE:
   ${inferExerciseComplexity(answers.training_context.experience)}

3. TIME-OPTIMIZED:
   Must fit within ${answers.equipment_session.minutes} minutes
   Target ${sessionBreakdown.estimatedSets} exercise blocks maximum

4. EQUIPMENT-CONSTRAINED:
   ONLY use exercises from available list above
   No exercises requiring equipment not listed

5. LIMITATION-SAFE:
   ${getContraindications(answers.limitations)}

6. PROGRESSION-AWARE:
   ${getProgressionGuidance(sessionNumber, totalSessions)}

7. READINESS-BASED:
   Current readiness: ${readiness}
   Target: Bring readiness to 50-55 range
   Total fatigue cost needed: ~${Math.max(0, readiness - 52)} points

OUTPUT FORMAT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "plan_meta": {
    "personalization_note": "1-2 sentences explaining why this plan fits ${answers.name}'s profile",
    "goal_alignment": "How this session advances toward ${answers.primary_goal.type}",
    "start_readiness": ${readiness},
    "target_readiness": 52,
    "confidence": 0.85
  },
  "blocks": [
    {
      "label": "Warm-up" | "Main" | "Accessory" | "Finisher",
      "name": "<exercise name from available list only>",
      "why": "Brief rationale tied to goal or limitation",
      "prescription": {
        "sets": number,
        "reps": "3-5" | "6-8" | "10-12",
        "tempo": "3010" (if relevant for goal),
        "rest_s": number,
        "load": "increase" | "hold" | "decrease"
      },
      "effort": "light" | "moderate" | "heavy" | "max",
      "predicted_drop": number,
      "coaching_cue": "One tactical cue for this exercise"
    }
  ],
  "post_workout_guidance": "What to focus on during recovery"
}

CRITICAL RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- ONLY use exercises from the available list
- Respect all contraindications from limitations
- Stay within time budget (${answers.equipment_session.minutes} min)
- Match complexity to experience level
- Align rep ranges and intensity to goal
- Ensure readiness drops to 50-55 range

Remember: This person trusts you with their body. Be conservative with load
progression if movement quality is compromised. Prioritize long-term development
over single-session gains.`;
}
