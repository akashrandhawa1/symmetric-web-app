/**
 * Interactive demo script to test coach responses
 *
 * Run with: npx tsx src/coach/policy/try-coach.ts
 */

import type { CoachSnapshot } from './types';

// Mock the LLM call for demo purposes
const mockLLM = async (scenario: CoachSnapshot) => {
  // Simulate different responses based on scenario
  if (scenario.appSurface === 'working_set' && scenario.intent === 'ask') {
    return {
      hook: 'Bar speed is stable.',
      why: 'Quality is there.',
      action: 'Hit 5 reps then stop.',
      action_type: 'reps' as const,
    };
  }

  if (scenario.appSurface === 'top_set' && scenario.last_set?.bar_speed === 'fast') {
    return {
      hook: 'Bar speed is fast.',
      why: 'You have room.',
      action: 'Add 5 pounds next set.',
      action_type: 'load' as const,
    };
  }

  if (scenario.last_set?.depth === 'above') {
    return {
      hook: 'Depth broke parallel.',
      why: 'Load is too heavy.',
      action: 'Drop 10 pounds and add 2-second pause at bottom.',
      action_type: 'depth' as const,
    };
  }

  if (scenario.appSurface === 'home' && scenario.requiresChange) {
    return {
      hook: 'Readiness is 85.',
      why: 'Perfect window for work.',
      action: 'Start squats and finish near 50.',
      action_type: 'plan' as const,
    };
  }

  return {
    hook: 'Keep reps clean.',
    why: 'Quality matters.',
    action: 'Stop once form slips.',
    action_type: 'plan' as const,
  };
};

// Demo scenarios
const scenarios = {
  '1': {
    name: '🏠 Home Screen - Silent',
    snapshot: {
      appSurface: 'home' as const,
      experienceBand: 'intermediate' as const,
      readiness_now: 75,
      readiness_target: 50,
      requiresChange: false,
      phase: 'planning' as const,
      intent: 'ask' as const,
      utterance: 'What should I do?',
    },
    expectedSilent: true,
  },

  '2': {
    name: '🏠 Home Screen - High Readiness',
    snapshot: {
      appSurface: 'home' as const,
      experienceBand: 'intermediate' as const,
      readiness_now: 85,
      readiness_target: 50,
      requiresChange: true,
      phase: 'planning' as const,
      intent: 'ask' as const,
      utterance: 'Should I train?',
    },
    expectedText: 'Readiness is 85. Perfect window for work. Start squats and finish near 50.',
  },

  '3': {
    name: '💪 Working Set - Rep Question',
    snapshot: {
      appSurface: 'working_set' as const,
      experienceBand: 'intermediate' as const,
      readiness_now: 60,
      readiness_target: 50,
      requiresChange: false,
      phase: 'executing' as const,
      last_set: {
        exercise: 'Back Squat',
        weight_lb: 185,
        reps: 5,
        bar_speed: 'stable' as const,
        depth: 'parallel' as const,
      },
      intent: 'ask' as const,
      utterance: 'How many reps?',
    },
    expectedText: 'Bar speed is stable. Quality is there. Hit 5 reps then stop.',
  },

  '4': {
    name: '🔥 Top Set - Fast Bar Speed',
    snapshot: {
      appSurface: 'top_set' as const,
      experienceBand: 'intermediate' as const,
      readiness_now: 65,
      readiness_target: 50,
      requiresChange: true,
      phase: 'executing' as const,
      last_set: {
        exercise: 'Back Squat',
        weight_lb: 225,
        reps: 5,
        bar_speed: 'fast' as const,
        depth: 'parallel' as const,
      },
      intent: 'brag' as const,
      utterance: 'That felt easy!',
    },
    expectedText: 'Bar speed is fast. You have room. Add 5 pounds next set.',
  },

  '5': {
    name: '⚠️  Depth Breakdown',
    snapshot: {
      appSurface: 'working_set' as const,
      experienceBand: 'intermediate' as const,
      readiness_now: 55,
      readiness_target: 50,
      requiresChange: true,
      phase: 'executing' as const,
      last_set: {
        exercise: 'Back Squat',
        weight_lb: 205,
        reps: 4,
        bar_speed: 'slow' as const,
        depth: 'above' as const,
      },
      intent: 'struggle' as const,
      utterance: 'That was tough.',
    },
    expectedText: 'Depth broke parallel. Load is too heavy. Drop 10 pounds and add 2-second pause at bottom.',
  },

  '6': {
    name: '🚨 PAIN FLAG - Safety Override',
    snapshot: {
      appSurface: 'working_set' as const,
      experienceBand: 'intermediate' as const,
      readiness_now: 60,
      readiness_target: 50,
      requiresChange: false,
      phase: 'executing' as const,
      safety: { pain_flag: true },
      intent: 'struggle' as const,
      utterance: 'My knee hurts.',
    },
    expectedText: "Stop the set. We don't push through pain. Skip squats and switch to leg press light.",
    isSafetyOverride: true,
  },
};

// Simple demo runner
async function runDemo() {
  console.log('\n' + '='.repeat(80));
  console.log('STATE-AWARE VOICE COACH - RESPONSE EXAMPLES');
  console.log('='.repeat(80) + '\n');

  for (const [key, scenario] of Object.entries(scenarios)) {
    console.log(`\n${scenario.name}`);
    console.log('-'.repeat(80));

    console.log('\n📍 Context:');
    console.log(`   Surface: ${scenario.snapshot.appSurface}`);
    console.log(`   Experience: ${scenario.snapshot.experienceBand}`);
    console.log(`   Readiness: ${scenario.snapshot.readiness_now}/${scenario.snapshot.readiness_target}`);
    if (scenario.snapshot.last_set) {
      console.log(`   Last Set: ${scenario.snapshot.last_set.weight_lb}lb × ${scenario.snapshot.last_set.reps}`);
      console.log(`   Bar Speed: ${scenario.snapshot.last_set.bar_speed}`);
      console.log(`   Depth: ${scenario.snapshot.last_set.depth}`);
    }
    if (scenario.snapshot.safety?.pain_flag) {
      console.log(`   ⚠️  PAIN FLAG: true`);
    }

    console.log(`\n💬 User says: "${scenario.snapshot.utterance}"`);

    if (scenario.expectedSilent) {
      console.log('\n🔇 Coach Response: [SILENT - no change needed]\n');
    } else {
      const response = scenario.isSafetyOverride
        ? scenario.expectedText
        : (await mockLLM(scenario.snapshot as any))
          ? `${(await mockLLM(scenario.snapshot as any)).hook} ${(await mockLLM(scenario.snapshot as any)).why} ${(await mockLLM(scenario.snapshot as any)).action}`
          : scenario.expectedText;

      const text = scenario.expectedText || response;
      const wordCount = text.split(' ').length;

      console.log(`\n🗣️  Coach Response:`);
      console.log(`   "${text}"`);
      console.log(`   (${wordCount} words)`);

      if (scenario.isSafetyOverride) {
        console.log(`   🚨 SAFETY OVERRIDE - bypassed all policies`);
      }
      console.log();
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('KEY PATTERNS:');
  console.log('='.repeat(80));
  console.log(`
✅ SILENCE MANAGEMENT
   - Home/Rest surfaces stay silent unless requiresChange=true
   - Active surfaces speak based on context

✅ CONCISE FORMAT (HOOK + WHY + ACTION)
   - HOOK: Observation ("Bar speed is fast")
   - WHY: Reasoning ("You have room")
   - ACTION: Directive ("Add 5 pounds next set")

✅ WORD BUDGETS
   - Novice: 22 words (more verbose)
   - Intermediate: 18 words (balanced)
   - Advanced: 14 words (terse)

✅ TOPIC RESTRICTIONS
   - Home: Only plan/readiness_budget
   - Working set: load/reps/tempo/depth/symmetry
   - Top set: load/reps/depth/tempo/readiness_budget

✅ SAFETY FIRST
   - Pain flag triggers immediate override
   - Bypasses all policies
   - Always safe, actionable advice
`);

  console.log('='.repeat(80) + '\n');
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}

export { scenarios, runDemo };
