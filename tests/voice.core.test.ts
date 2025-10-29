import assert from 'node:assert';
import { generatePersonalizedFeedback, computeReward, type SetContext } from '../lib/coach/voice';
import { CoachFeedbackCard } from '../src/components';
import type { UserCoachProfile, OutcomeSignal } from '../types';

const baseContext: SetContext = {
  exerciseName: 'Back Squat',
  setNumber: 2,
  readinessNow: 84,
  readinessChangePct: -6,
  setVolume: { reps: 6 },
  cumulativeChangePct: -8,
};

const profile: UserCoachProfile = {
  userId: 'core-test',
  preferredPersona: 'direct',
  preferredCue: 'brace',
  explorationRate: 0,
};

const buildContext = (overrides: Partial<SetContext>): SetContext => ({
  ...baseContext,
  ...overrides,
  setVolume: overrides.setVolume ?? baseContext.setVolume,
});

const containsTag = (node: unknown, tag: string): boolean => {
  if (node == null) return false;
  if (Array.isArray(node)) {
    return node.some((child) => containsTag(child, tag));
  }
  if (typeof node !== 'object') return false;
  const element = node as { type?: unknown; props?: { children?: unknown } };
  if (element.type === tag) return true;
  return containsTag(element.props?.children, tag);
};

function testSmallDropWithFlag() {
  const output = generatePersonalizedFeedback(
    buildContext({
      lastQualityFlagRep: 4,
    }),
    profile,
  );

  assert.strictEqual(output.offerType, 'foundation');
  assert.strictEqual(output.plan, 'hold');
  const primaryLower = output.message.primary.toLowerCase();
  assert.ok(
    primaryLower.includes('good set') ||
    primaryLower.includes('good work') ||
    primaryLower.includes('rest a moment')
  );
  assert.ok(output.ctas.some((cta) => cta.label.includes('Bank Next Set')));
  assert.ok(output.message.variations && output.message.variations.length >= 3);
}

function testPushCaseWithTrend() {
  const output = generatePersonalizedFeedback(
    buildContext({
      exerciseName: 'Bench',
      setNumber: 3,
      readinessNow: 92,
      readinessChangePct: 2,
      historicalTrend: 'up',
      cumulativeChangePct: -4,
    }),
    profile,
  );

  assert.strictEqual(output.offerType, 'progress');
  assert.strictEqual(output.plan, 'add12');
  assert.ok(output.message.primary.includes("looking strong") || output.message.primary.includes('plenty of energy'));
  assert.ok(output.ctas.some((cta) => cta.label.includes('Add 1 Rep')));
  assert.ok(output.message.variations && output.message.variations.length >= 3);
}

function testSymmetryBranch() {
  const output = generatePersonalizedFeedback(
    buildContext({
      readinessNow: 78,
      readinessChangePct: -2,
      symmetryNow: 76,
    }),
    profile,
  );

  assert.strictEqual(output.offerType, 'efficiency');
  assert.strictEqual(output.plan, 'tempo212');
  assert.ok(output.message.primary.includes('off-balance'));
  assert.ok(output.ctas.some((cta) => cta.label.includes('Fix Form')));
  assert.ok(output.message.variations && output.message.variations.length >= 3);
}

function testAtomicRender() {
  const output = generatePersonalizedFeedback(
    buildContext({
      readinessNow: 70,
      readinessChangePct: -11,
      cumulativeChangePct: -9,
    }),
    profile,
  );
  const element = CoachFeedbackCard({ message: output.message });
  assert.strictEqual(element.type, 'div');
  assert.ok(!containsTag(element.props?.children, 'button'));
}

function testCharacterLimitsRespected() {
  const output = generatePersonalizedFeedback(
    buildContext({
      readinessNow: 95,
      readinessChangePct: 12,
      historicalTrend: 'down',
      cumulativeChangePct: -5,
    }),
    profile,
  );

  assert.ok(output.message.primary.length <= 140);
  assert.strictEqual(output.message.secondary, '');
  assert.strictEqual(output.message.planLine, '');
  assert.strictEqual(output.message.feelTarget, '');
}

function testComputeReward() {
  const signal: OutcomeSignal = {
    userId: 'reward',
    scenario: 'small_drop',
    variant: { persona: 'calm', cue: 'brace', cta: 'drop5' },
    planFollowed: true,
    qualityImproved: true,
    readinessRebounded: false,
    thumbsUp: true,
    dwellMs: 3200,
  };

  const reward = computeReward(signal);
  assert.strictEqual(reward, 1.0 + 0.8 + 0 + 0.5 + 0.2);
}

function testExplorationDiversity() {
  const exploringProfile: UserCoachProfile = {
    userId: 'explore',
    explorationRate: 1,
  };

  const personas = new Set<string>();
  const cues = new Set<string>();

  for (let i = 0; i < 50; i += 1) {
    const output = generatePersonalizedFeedback(baseContext, exploringProfile);
    personas.add(output.personalization?.persona ?? 'calm');
    cues.add(output.personalization?.cue ?? 'brace');
  }

  assert.ok(personas.size > 1, 'Expected exploration to sample multiple personas');
  assert.ok(cues.size > 1, 'Expected exploration to sample multiple cues');
}

export async function runTests() {
  testSmallDropWithFlag();
  testPushCaseWithTrend();
  testSymmetryBranch();
  testAtomicRender();
  testCharacterLimitsRespected();
  testComputeReward();
  testExplorationDiversity();
}
