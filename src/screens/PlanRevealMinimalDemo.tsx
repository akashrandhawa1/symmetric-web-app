import React from "react";
import PlanRevealMinimal from "../components/plan/PlanRevealMinimal";
import type { PlanRevealMinimalProps } from "../components/plan/PlanRevealMinimal.types";

export default function PlanRevealMinimalDemo() {
  // Example 1: Football QB with bodyweight constraints
  const footballQBExample: PlanRevealMinimalProps = {
    eyebrow: "Ready for you",
    title: "Explosive Power Plan",
    why: "Build explosive lower-body power for football QB performance, while protecting your knees from past injury.",
    summary: {
      sport: "Football QB",
      sportEmoji: "🏈",
      weeks: 4,
      daysPerWeek: 3,
      sessionMinutes: 45,
      setting: "Bodyweight only",
      hasEquipmentMismatch: false,
    },
    constraints: [
      {
        label: "Protect knees",
        explanation: "We'll limit squat depth and avoid excessive knee flexion with tempo work and controlled movements.",
        severity: "warning",
      },
      {
        label: "Past injury history",
        explanation: "Your training will prioritize movement quality and avoid positions that stress old injury sites.",
        severity: "info",
      },
    ],
    phases: [
      {
        title: "Foundation",
        weekRange: "Weeks 1–2",
        focus: "Build movement patterns and baseline strength with controlled tempos.",
        outcome: "You'll feel confident in your squat mechanics and ready for power work.",
        status: "active",
      },
      {
        title: "Power Development",
        weekRange: "Weeks 3–4",
        focus: "Add explosive variations and plyometric progressions for QB-specific power.",
        outcome: "You'll feel faster, more explosive, and ready for on-field demands.",
        status: "upcoming",
      },
    ],
    nextSession: {
      duration: 45,
      focus: "Lower body strength",
      preview: ["Bodyweight Squat", "Bulgarian Split Squat"],
      estimatedDrop: [10, 15],
    },
    cta: {
      label: "Start My Program",
      subtext: "Adapts to your readiness",
      currentReadiness: 85,
    },
    onStart: () => {
      console.log("Starting plan...");
      alert("Demo: Starting your program!");
    },
    onHelpClick: () => {
      console.log("Help clicked");
      alert("Demo: Opening help chat with Coach Milo");
    },
  };

  // Example 2: Strength athlete with gym access
  const strengthAthleteExample: PlanRevealMinimalProps = {
    eyebrow: "Custom built",
    title: "Raw Strength Plan",
    why: "Maximize your squat and lower-body strength for powerlifting, with focus on form confidence and injury prevention.",
    summary: {
      sport: "Powerlifting",
      sportEmoji: "💪",
      weeks: 12,
      daysPerWeek: 4,
      sessionMinutes: 60,
      setting: "Full gym access",
    },
    constraints: [
      {
        label: "Hip mobility work",
        explanation: "Each session includes targeted hip prep to improve squat depth and reduce compensation patterns.",
        severity: "info",
      },
    ],
    phases: [
      {
        title: "Hypertrophy",
        weekRange: "Weeks 1–4",
        focus: "Build muscle mass with moderate loads and higher volume to create strength foundation.",
        outcome: "You'll feel stronger, fuller, and ready for heavy singles.",
        status: "completed",
      },
      {
        title: "Strength",
        weekRange: "Weeks 5–8",
        focus: "Progressive overload with heavy compound lifts in the 3-6 rep range.",
        outcome: "You'll hit new PRs and feel confident handling heavier weights.",
        status: "active",
      },
      {
        title: "Peaking",
        weekRange: "Weeks 9–12",
        focus: "Taper volume while maintaining intensity for competition readiness.",
        outcome: "You'll feel fresh, explosive, and ready to test your max.",
        status: "upcoming",
      },
    ],
    nextSession: {
      duration: 60,
      focus: "Heavy squat day",
      preview: ["Barbell Back Squat", "Front Squat", "Leg Extension"],
      estimatedDrop: [15, 20],
    },
    cta: {
      label: "Continue Training",
      subtext: "Week 6, Day 2",
      currentReadiness: 72,
    },
    onStart: () => {
      console.log("Continuing plan...");
      alert("Demo: Loading Week 6, Day 2 workout");
    },
    onHelpClick: () => {
      console.log("Help clicked");
      alert("Demo: Opening plan questions");
    },
  };

  // Toggle between examples
  const [currentExample, setCurrentExample] = React.useState<'football' | 'strength'>('football');

  const exampleProps = currentExample === 'football' ? footballQBExample : strengthAthleteExample;

  return (
    <div>
      {/* Example selector (floating) */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => setCurrentExample('football')}
          className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
            currentExample === 'football'
              ? 'bg-blue-600 text-white'
              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
          }`}
        >
          Football QB
        </button>
        <button
          onClick={() => setCurrentExample('strength')}
          className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
            currentExample === 'strength'
              ? 'bg-blue-600 text-white'
              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
          }`}
        >
          Powerlifting
        </button>
      </div>

      {/* Render the component */}
      <PlanRevealMinimal key={currentExample} {...exampleProps} />
    </div>
  );
}
